package controller

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestAfdianConfigurationValidation(t *testing.T) {
	base := setting.AfdianConfig{Enabled: true, UserID: strings.Repeat("a", 32),
		Products: []setting.AfdianProduct{{PlanID: strings.Repeat("b", 32), Name: "Credit", Price: "16.00", Quota: 10000000}}}
	require.NoError(t, setting.ValidateAfdianConfig(base))
	for _, price := range []string{"-1", "0", "NaN", "10.001", "1e9", "999999999999999999999999"} {
		t.Run(price, func(t *testing.T) {
			config := base
			config.Products = append([]setting.AfdianProduct{}, base.Products...)
			config.Products[0].Price = price
			assert.Error(t, setting.ValidateAfdianConfig(config))
		})
	}
	for _, quota := range []int64{0, -1, common.MaxWalletQuota + 1} {
		config := base
		config.Products = append([]setting.AfdianProduct{}, base.Products...)
		config.Products[0].Quota = quota
		assert.Error(t, setting.ValidateAfdianConfig(config))
	}
	base.Products = append(base.Products, base.Products[0])
	assert.Error(t, setting.ValidateAfdianConfig(base))
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
				require.NoError(t, db.Migrator().DropTable(&model.AfdianOrder{}, &model.TopUp{}, &model.User{}, &model.SubscriptionPlan{}, &model.SubscriptionOrder{}, &model.UserSubscription{}, &model.Log{}, &model.Option{}, &model.Redemption{}, &model.AuditLog{}))
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

			require.NoError(t, db.AutoMigrate(&model.User{}, &model.TopUp{}, &model.Log{}, &model.Option{}, &model.Redemption{}, &model.AuditLog{}, &model.AfdianOrder{}))
			user := model.User{Username: "afdian-code-user", Group: "default", Quota: 100, Status: common.UserStatusEnabled, Role: common.RoleAdminUser}
			require.NoError(t, db.Create(&user).Error)
			providerOrder := "paid-before-code-delivery"
			historical := model.AfdianOrder{TradeNo: "afdian-historical", ProviderOrderID: &providerOrder, CreatorID: strings.Repeat("a", 32), PlanID: strings.Repeat("b", 32), MoneyCents: 1600}
			pending := model.TopUp{TradeNo: "afdian-historical", UserId: user.Id, Amount: 20, Money: 16, PaymentProvider: model.PaymentProviderAfdian, Status: common.TopUpStatusPending}
			require.NoError(t, db.Create(&historical).Error)
			require.NoError(t, db.Create(&pending).Error)
			// Upgrading and restarting preserves historical payment records and
			// the provider-order uniqueness guarantee, without settling them.
			for range 2 {
				require.NoError(t, db.AutoMigrate(&model.AfdianOrder{}, &model.TopUp{}, &model.Redemption{}))
			}
			var preserved model.AfdianOrder
			require.NoError(t, db.First(&preserved, "trade_no = ?", historical.TradeNo).Error)
			assert.Equal(t, historical, preserved)
			duplicate := historical
			duplicate.TradeNo = "another-checkout"
			assert.Error(t, db.Create(&duplicate).Error)
			var version string
			query := "SELECT version()"
			if dialect == "sqlite" {
				query = "SELECT sqlite_version()"
			}
			require.NoError(t, db.Raw(query).Scan(&version).Error)
			t.Logf("database version: %s", version)

			confirmPaymentComplianceForTest(t)
			previousConfig, previousOptions := setting.GetAfdianConfig(), common.OptionMap
			common.OptionMap = make(map[string]string)
			t.Cleanup(func() {
				encoded, err := common.Marshal(previousConfig)
				require.NoError(t, err)
				require.NoError(t, setting.UpdateAfdianConfig(string(encoded)))
				common.OptionMap = previousOptions
			})
			product := setting.AfdianProduct{PlanID: strings.Repeat("e", 32), Name: "16 CNY", Price: "16.00", Quota: 10000000}
			config := setting.AfdianConfig{Enabled: true, UserID: strings.Repeat("a", 32), Products: []setting.AfdianProduct{product}}
			legacy, err := common.Marshal(map[string]any{"enabled": true, "user_id": config.UserID, "api_token": "retired-secret", "products": config.Products})
			require.NoError(t, err)
			require.NoError(t, db.Create(&model.Option{Key: setting.AfdianOptionKey, Value: string(legacy)}).Error)
			require.NoError(t, setting.UpdateAfdianConfig(string(legacy)))
			assert.False(t, isAfdianEnabled(), "old automatic-credit plans must not be sold without code inventory setup")
			assert.Empty(t, setting.GetAfdianConfig().Products)

			router := gin.New()
			router.GET("/config", GetAfdianConfig)
			router.PUT("/config", SaveAfdianConfig)
			router.POST("/pay", RequestAfdianPay)
			router.POST("/redemptions", func(c *gin.Context) { c.Set("id", user.Id); c.Set("role", common.RoleAdminUser); AddRedemption(c) })
			router.POST("/webhook", AfdianPaymentRetired)
			router.POST("/check", AfdianPaymentRetired)
			router.GET("/orders/:order_id", AfdianPaymentRetired)
			publicConfig := httptest.NewRecorder()
			router.ServeHTTP(publicConfig, httptest.NewRequest(http.MethodGet, "/config", nil))
			assert.NotContains(t, publicConfig.Body.String(), "retired-secret")
			assert.NotContains(t, publicConfig.Body.String(), "api_token")
			body, err := common.Marshal(config)
			require.NoError(t, err)
			saved := httptest.NewRecorder()
			router.ServeHTTP(saved, httptest.NewRequest(http.MethodPut, "/config", bytes.NewReader(body)))
			require.Contains(t, saved.Body.String(), `"success":true`)
			assert.True(t, isAfdianEnabled())
			var persisted model.Option
			require.NoError(t, db.Where(&model.Option{Key: setting.AfdianOptionKey}).First(&persisted).Error)
			assert.NotContains(t, persisted.Value, "api_token")
			assert.NotContains(t, persisted.Value, "retired-secret")
			assert.Equal(t, config, setting.GetAfdianConfig())

			checkout := httptest.NewRecorder()
			router.ServeHTTP(checkout, httptest.NewRequest(http.MethodPost, "/pay", strings.NewReader(`{"plan_id":"`+product.PlanID+`","quota":999999999,"delivery_mode":"direct"}`)))
			var checkoutResult struct {
				Success bool              `json:"success"`
				Data    map[string]string `json:"data"`
			}
			require.NoError(t, common.Unmarshal(checkout.Body.Bytes(), &checkoutResult))
			require.True(t, checkoutResult.Success)
			require.Len(t, checkoutResult.Data, 1)
			checkoutURL, err := url.Parse(checkoutResult.Data["checkout_url"])
			require.NoError(t, err)
			assert.Equal(t, "https", checkoutURL.Scheme)
			assert.Equal(t, "afdian.com", checkoutURL.Host)
			assert.Equal(t, "/order/create", checkoutURL.Path)
			assert.Equal(t, url.Values{"plan_id": {product.PlanID}, "product_type": {"0"}, "month": {"1"}}, checkoutURL.Query())
			invalid := httptest.NewRecorder()
			router.ServeHTTP(invalid, httptest.NewRequest(http.MethodPost, "/pay", strings.NewReader(`{"plan_id":"unconfigured"}`)))
			assert.Contains(t, invalid.Body.String(), `"success":false`)
			var orders, topups int64
			require.NoError(t, db.Model(&model.AfdianOrder{}).Count(&orders).Error)
			require.NoError(t, db.Model(&model.TopUp{}).Count(&topups).Error)
			assert.EqualValues(t, 1, orders)
			assert.EqualValues(t, 1, topups)

			// Opening checkout and creating inventory never credit the wallet.
			generation := httptest.NewRecorder()
			router.ServeHTTP(generation, httptest.NewRequest(http.MethodPost, "/redemptions", strings.NewReader(`{"name":"Afdian 16 CNY","quota":10000000,"count":2,"expired_time":0}`)))
			var generated struct {
				Success bool     `json:"success"`
				Data    []string `json:"data"`
			}
			require.NoError(t, common.Unmarshal(generation.Body.Bytes(), &generated))
			require.True(t, generated.Success)
			require.Len(t, generated.Data, 2)
			assert.NotEqual(t, generated.Data[0], generated.Data[1])
			var updated model.User
			require.NoError(t, db.First(&updated, user.Id).Error)
			assert.Equal(t, 100, updated.Quota)
			quota, err := model.Redeem(generated.Data[0], user.Id)
			require.NoError(t, err)
			assert.Equal(t, 10000000, quota)
			_, err = model.Redeem(generated.Data[0], user.Id)
			assert.Error(t, err)
			require.NoError(t, db.First(&updated, user.Id).Error)
			assert.Equal(t, 10000100, updated.Quota)
			// A full wallet must leave an unused code available for later use.
			require.NoError(t, db.Model(&model.User{}).Where("id = ?", user.Id).Update("quota", common.MaxWalletQuota).Error)
			_, err = model.Redeem(generated.Data[1], user.Id)
			require.Error(t, err)
			var unused model.Redemption
			require.NoError(t, db.Where(&model.Redemption{Key: generated.Data[1]}).First(&unused).Error)
			assert.Equal(t, common.RedemptionCodeStatusEnabled, unused.Status)
			require.NoError(t, db.First(&updated, user.Id).Error)
			assert.Equal(t, common.MaxWalletQuota, updated.Quota)
			require.NoError(t, db.Model(&model.User{}).Where("id = ?", user.Id).Update("quota", 10000100).Error)
			quota, err = model.Redeem(generated.Data[1], user.Id)
			require.NoError(t, err)
			assert.Equal(t, 10000000, quota)

			// Even authentic-looking callbacks and a manual completion request
			// cannot re-enable the removed automatic-credit path.
			for _, endpoint := range []struct{ method, path string }{
				{http.MethodPost, "/webhook"}, {http.MethodPost, "/check"}, {http.MethodGet, "/orders/afdian-historical"},
			} {
				retired := httptest.NewRecorder()
				router.ServeHTTP(retired, httptest.NewRequest(endpoint.method, endpoint.path, strings.NewReader(`{"ec":200,"data":{"type":"order","order":{"out_trade_no":"paid-before-code-delivery","total_amount":"16.00","custom_order_id":"afdian-historical"}}}`)))
				assert.Equal(t, http.StatusGone, retired.Code)
				assert.Contains(t, retired.Body.String(), `"success":false`)
			}
			assert.Error(t, model.ManualCompleteTopUp(pending.TradeNo, ""))
			require.NoError(t, db.First(&updated, user.Id).Error)
			assert.Equal(t, 20000100, updated.Quota)
			require.NoError(t, db.First(&pending, pending.Id).Error)
			assert.Equal(t, common.TopUpStatusPending, pending.Status)
		})
	}
}
