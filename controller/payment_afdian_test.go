package controller

import (
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type afdianTestTransport func(*http.Request) (*http.Response, error)

func (f afdianTestTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	return f(request)
}

func TestAfdianConfigurationValidation(t *testing.T) {
	base := setting.AfdianConfig{Enabled: true, UserID: strings.Repeat("a", 32), APIToken: "test-token",
		Products: []setting.AfdianProduct{{PlanID: strings.Repeat("b", 32), Name: "Credit", Price: "10.00", Quota: 500000}}}
	require.NoError(t, setting.ValidateAfdianConfig(base))
	for _, price := range []string{"-1", "0", "NaN", "10.001", "1e9", "999999999999999999999999"} {
		t.Run(price, func(t *testing.T) {
			config := base
			config.Products = append([]setting.AfdianProduct{}, base.Products...)
			config.Products[0].Price = price
			assert.Error(t, setting.ValidateAfdianConfig(config))
		})
	}
	base.Products = append(base.Products, base.Products[0])
	assert.Error(t, setting.ValidateAfdianConfig(base))
}

func TestAfdianSignedQueryRejectsProviderErrorsWithoutLeakingCredentials(t *testing.T) {
	config := setting.AfdianConfig{UserID: strings.Repeat("a", 32), APIToken: "secret-must-not-leak"}
	client := &http.Client{Transport: afdianTestTransport(func(request *http.Request) (*http.Response, error) {
		assert.Equal(t, "https://afdian.com/api/open/query-order", request.URL.String())
		var payload struct {
			UserID, Params, Sign string
			TS                   int64
		}
		// Use explicit wire names for the signed envelope.
		var wire map[string]any
		require.NoError(t, common.DecodeJson(request.Body, &wire))
		payload.UserID, payload.Params, payload.Sign = wire["user_id"].(string), wire["params"].(string), wire["sign"].(string)
		payload.TS = int64(wire["ts"].(float64))
		digest := md5.Sum([]byte(fmt.Sprintf("%sparams%sts%duser_id%s", config.APIToken, payload.Params, payload.TS, config.UserID)))
		assert.Equal(t, hex.EncodeToString(digest[:]), payload.Sign)
		assert.Equal(t, config.UserID, payload.UserID)
		assert.Contains(t, payload.Params, `"out_trade_no":"paid-1"`)
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"ec":400005,"em":"secret-must-not-leak"}`)), Header: make(http.Header)}, nil
	})}
	_, err := service.QueryAfdianOrder(t.Context(), client, config, "paid-1")
	require.Error(t, err)
	assert.NotContains(t, err.Error(), config.APIToken)
}

func TestAfdianSignedQueryPassesProviderClientFilter(t *testing.T) {
	config := setting.AfdianConfig{UserID: strings.Repeat("a", 32), APIToken: "test-token"}
	paid := model.AfdianPayment{OutTradeNo: "paid-1", CustomOrderID: "afd_checkout", PlanID: strings.Repeat("b", 32), TotalAmount: "16.00", Status: 2, Month: 1}
	response, err := common.Marshal(map[string]any{"ec": 200, "data": map[string]any{"list": []model.AfdianPayment{paid}}})
	require.NoError(t, err)
	client := &http.Client{Transport: afdianTestTransport(func(request *http.Request) (*http.Response, error) {
		// The provider's edge rejects Go's default client before signature verification.
		if !strings.HasPrefix(request.UserAgent(), "Mozilla/5.0") {
			return &http.Response{StatusCode: http.StatusForbidden, Body: io.NopCloser(strings.NewReader("request blocked")), Header: make(http.Header)}, nil
		}
		return &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(bytes.NewReader(response)), Header: make(http.Header)}, nil
	})}
	actual, err := service.QueryAfdianOrder(t.Context(), client, config, paid.OutTradeNo)
	require.NoError(t, err)
	assert.Equal(t, paid, *actual)
}

// TEST_*_DSN must point to disposable databases: each engine gets the same
// settlement and migration checks, with real SQL transactions and indexes.
func TestAfdianDatabaseMatrix(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			var driver gorm.Dialector
			switch dialect {
			case "sqlite":
				driver = sqlite.Open(t.TempDir() + "/afdian.db")
			case "mysql":
				dsn := os.Getenv("TEST_MYSQL_DSN")
				if dsn == "" {
					t.Skip("TEST_MYSQL_DSN is not configured")
				}
				driver = mysql.Open(dsn)
			case "postgres":
				dsn := os.Getenv("TEST_POSTGRES_DSN")
				if dsn == "" {
					t.Skip("TEST_POSTGRES_DSN is not configured")
				}
				driver = postgres.Open(dsn)
			}
			db, err := gorm.Open(driver, &gorm.Config{})
			require.NoError(t, err)
			if dialect != "sqlite" {
				var databaseName string
				query := "SELECT DATABASE()"
				if dialect == "postgres" {
					query = "SELECT current_database()"
				}
				require.NoError(t, db.Raw(query).Scan(&databaseName).Error)
				require.True(t, strings.HasPrefix(databaseName, "codex_afdian_test"), "use a disposable codex_afdian_test database")
				require.NoError(t, db.Migrator().DropTable(&model.AfdianOrder{}, &model.TopUp{}, &model.User{}, &model.SubscriptionPlan{}, &model.SubscriptionOrder{}, &model.UserSubscription{}, &model.Log{}, &model.Option{}))
			}
			sqlDB, err := db.DB()
			require.NoError(t, err)
			previousDB, previousLogDB := model.DB, model.LOG_DB
			previousMainType, previousLogType := common.MainDatabaseType(), common.LogDatabaseType()
			previousRedis := common.RedisEnabled
			common.RedisEnabled = false
			model.DB, model.LOG_DB = db, db
			common.SetDatabaseTypes(common.DatabaseType(dialect), common.DatabaseType(dialect))
			t.Cleanup(func() {
				model.DB, model.LOG_DB = previousDB, previousLogDB
				common.SetDatabaseTypes(previousMainType, previousLogType)
				common.RedisEnabled = previousRedis
				assert.NoError(t, sqlDB.Close())
			})
			// Preserve a representative pre-provider top-up and its uniqueness
			// while adding the independent table, then repeat migration.
			require.NoError(t, db.AutoMigrate(&model.User{}, &model.TopUp{}, &model.SubscriptionPlan{}, &model.SubscriptionOrder{}, &model.UserSubscription{}, &model.Log{}, &model.Option{}))
			legacy := model.TopUp{TradeNo: "afdian-test-legacy", UserId: 1, Amount: 3, Money: 9.5, PaymentProvider: model.PaymentProviderStripe, Status: common.TopUpStatusSuccess}
			require.NoError(t, db.Create(&legacy).Error)
			for range 2 {
				require.NoError(t, db.AutoMigrate(&model.AfdianOrder{}))
			}
			var preserved model.TopUp
			require.NoError(t, db.First(&preserved, legacy.Id).Error)
			assert.Equal(t, legacy, preserved)
			duplicate := legacy
			duplicate.Id = 0
			assert.Error(t, db.Create(&duplicate).Error)
			var version string
			query := "SELECT version()"
			if dialect == "sqlite" {
				query = "SELECT sqlite_version()"
			}
			require.NoError(t, db.Raw(query).Scan(&version).Error)
			t.Logf("database version: %s", version)
			user := model.User{Username: "afdian-payment-user", Group: "default", Quota: 100, Status: common.UserStatusEnabled}
			require.NoError(t, db.Create(&user).Error)
			product := setting.AfdianProduct{PlanID: strings.Repeat("b", 32), Name: "Credit", Price: "10.00", Quota: 500000}
			creator := strings.Repeat("a", 32)
			payment := model.AfdianPayment{OutTradeNo: "paid-1", CustomOrderID: "afd_checkout1", PlanID: product.PlanID, TotalAmount: "10.00", Status: 2, Month: 1}
			require.NoError(t, model.CreateAfdianOrder(user.Id, payment.CustomOrderID, creator, product, nil))
			for _, test := range []struct {
				name   string
				change func(*model.AfdianPayment)
			}{
				{"underpayment", func(p *model.AfdianPayment) { p.TotalAmount = "9.99" }},
				{"wrong plan", func(p *model.AfdianPayment) { p.PlanID = strings.Repeat("c", 32) }},
				{"not paid", func(p *model.AfdianPayment) { p.Status = 1 }},
				{"redeem code", func(p *model.AfdianPayment) { p.RedeemID = "gift" }},
				{"changed months", func(p *model.AfdianPayment) { p.Month = 2 }},
			} {
				t.Run(test.name, func(t *testing.T) {
					candidate := payment
					test.change(&candidate)
					assert.ErrorIs(t, model.CompleteAfdianOrder(candidate, creator, ""), model.ErrAfdianPaymentMismatch)
				})
			}
			assert.ErrorIs(t, model.CompleteAfdianOrder(payment, strings.Repeat("d", 32), ""), model.ErrAfdianPaymentMismatch)
			require.NoError(t, model.CompleteAfdianOrder(payment, creator, "127.0.0.1"))
			require.NoError(t, model.CompleteAfdianOrder(payment, creator, "127.0.0.1"))
			var updated model.User
			require.NoError(t, db.First(&updated, user.Id).Error)
			assert.Equal(t, 500100, updated.Quota)
			// The same paid transaction cannot be rebound to a second checkout.
			require.NoError(t, model.CreateAfdianOrder(user.Id, "afd_checkout2", creator, product, nil))
			reused := payment
			reused.CustomOrderID = "afd_checkout2"
			assert.Error(t, model.CompleteAfdianOrder(reused, creator, ""))
			assert.Error(t, model.ManualCompleteTopUp("afd_checkout2", ""))
			// Ceiling failures roll back both payment binding and fulfillment.
			require.NoError(t, db.Model(&model.User{}).Where("id = ?", user.Id).Update("quota", common.MaxWalletQuota).Error)
			reused.OutTradeNo = "paid-2"
			assert.ErrorIs(t, model.CompleteAfdianOrder(reused, creator, ""), model.ErrTopUpQuotaLimitExceeded)
			pending, err := model.GetAfdianOrder(reused.CustomOrderID)
			require.NoError(t, err)
			assert.Nil(t, pending.ProviderOrderID)
			require.NoError(t, db.Model(&model.User{}).Where("id = ?", user.Id).Update("quota", 100).Error)
			if dialect == "sqlite" {
				require.NoError(t, model.CompleteAfdianOrder(reused, creator, ""))
			} else {
				var wg sync.WaitGroup
				results := make(chan error, 2)
				for range 2 {
					wg.Go(func() { results <- model.CompleteAfdianOrder(reused, creator, "") })
				}
				wg.Wait()
				close(results)
				for result := range results {
					require.NoError(t, result)
				}
			}
			require.NoError(t, db.First(&updated, user.Id).Error)
			assert.Equal(t, 500100, updated.Quota)
			// Fulfillment uses the purchased subscription snapshot, even if the
			// administrator edits/deletes the original plan after checkout.
			plan := model.SubscriptionPlan{Title: "Original", Enabled: true, DurationUnit: model.SubscriptionDurationMonth, DurationValue: 1, TotalAmount: 1234}
			require.NoError(t, db.Create(&plan).Error)
			product.Quota, product.SubscriptionPlanID = 0, plan.Id
			require.NoError(t, model.CreateAfdianOrder(user.Id, "afd_subscription", creator, product, &plan))
			require.NoError(t, db.Model(&plan).Update("total_amount", 999).Error)
			subPayment := payment
			subPayment.OutTradeNo, subPayment.CustomOrderID = "paid-sub", "afd_subscription"
			require.NoError(t, model.CompleteAfdianOrder(subPayment, creator, ""))
			require.NoError(t, model.CompleteAfdianOrder(subPayment, creator, ""))
			var subscriptions []model.UserSubscription
			require.NoError(t, db.Where("user_id = ?", user.Id).Find(&subscriptions).Error)
			require.Len(t, subscriptions, 1)
			assert.EqualValues(t, 1234, subscriptions[0].AmountTotal)
			// Exercise HTTP webhook/query, rejecting forged payment data and
			// cross-user recovery while preserving the public EC response.
			confirmPaymentComplianceForTest(t)
			previousConfig := setting.GetAfdianConfig()
			t.Cleanup(func() {
				encoded, _ := common.Marshal(previousConfig)
				require.NoError(t, setting.UpdateAfdianConfig(string(encoded)))
			})
			config := setting.AfdianConfig{Enabled: true, UserID: creator, APIToken: "test-token", Products: []setting.AfdianProduct{product}}
			encoded, err := common.Marshal(config)
			require.NoError(t, err)
			require.NoError(t, setting.UpdateAfdianConfig(string(encoded)))
			previousTransport := http.DefaultTransport
			t.Cleanup(func() { http.DefaultTransport = previousTransport })
			fakePaid, err := common.Marshal(map[string]any{"ec": 200, "data": map[string]any{"list": []model.AfdianPayment{payment}}})
			require.NoError(t, err)
			http.DefaultTransport = afdianTestTransport(func(*http.Request) (*http.Response, error) {
				return &http.Response{StatusCode: 200, Body: io.NopCloser(bytes.NewReader(fakePaid)), Header: make(http.Header)}, nil
			})
			router := gin.New()
			router.POST("/webhook", AfdianWebhook)
			router.POST("/check", func(c *gin.Context) { c.Set("id", user.Id+1); CheckAfdianPayment(c) })
			router.GET("/config", GetAfdianConfig)
			router.PUT("/config", SaveAfdianConfig)
			router.GET("/status/:order_id", func(c *gin.Context) { c.Set("id", user.Id+1); GetAfdianPaymentStatus(c) })
			webhook := httptest.NewRecorder()
			router.ServeHTTP(webhook, httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(`{"ec":200,"data":{"type":"order","order":{"out_trade_no":"paid-1","total_amount":"999999999","custom_order_id":"afd_checkout2"}}}`)))
			assert.Equal(t, http.StatusOK, webhook.Code)
			assert.JSONEq(t, `{"ec":200,"em":"ok"}`, webhook.Body.String())
			check := httptest.NewRecorder()
			router.ServeHTTP(check, httptest.NewRequest(http.MethodPost, "/check", strings.NewReader(`{"order_id":"afd_checkout1","out_trade_no":"paid-1"}`)))
			assert.Contains(t, check.Body.String(), `"success":false`)
			publicConfig := httptest.NewRecorder()
			router.ServeHTTP(publicConfig, httptest.NewRequest(http.MethodGet, "/config", nil))
			assert.NotContains(t, publicConfig.Body.String(), "test-token")
			foreignStatus := httptest.NewRecorder()
			router.ServeHTTP(foreignStatus, httptest.NewRequest(http.MethodGet, "/status/afd_checkout1", nil))
			assert.Contains(t, foreignStatus.Body.String(), `"success":false`)
			previousOptions := common.OptionMap
			common.OptionMap = make(map[string]string)
			t.Cleanup(func() { common.OptionMap = previousOptions })
			config.APIToken = ""
			updateBody, err := common.Marshal(config)
			require.NoError(t, err)
			update := httptest.NewRecorder()
			router.ServeHTTP(update, httptest.NewRequest(http.MethodPut, "/config", bytes.NewReader(updateBody)))
			assert.Contains(t, update.Body.String(), `"success":true`)
			assert.NotContains(t, update.Body.String(), "test-token")
			assert.Equal(t, "test-token", setting.GetAfdianConfig().APIToken)
		})
	}
}
