package controller

import (
	"maps"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestWaffoPancakeToggleDatabaseMatrix(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			var driver gorm.Dialector
			switch dialect {
			case "sqlite":
				driver = sqlite.Open(t.TempDir() + "/pancake.db")
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
				require.True(t, strings.HasPrefix(databaseName, "codex_afdian_test"), "only use disposable test databases")
			}
			sqlDB, err := db.DB()
			require.NoError(t, err)
			previousDB, previousOptions := model.DB, common.OptionMap
			previousEnabled := setting.WaffoPancakeEnabled
			previousMerchant, previousKey, previousProduct := setting.WaffoPancakeMerchantID, setting.WaffoPancakePrivateKey, setting.WaffoPancakeProductID
			t.Cleanup(func() {
				model.DB, common.OptionMap = previousDB, previousOptions
				setting.WaffoPancakeEnabled = previousEnabled
				setting.WaffoPancakeMerchantID, setting.WaffoPancakePrivateKey, setting.WaffoPancakeProductID = previousMerchant, previousKey, previousProduct
				assert.NoError(t, sqlDB.Close())
			})
			model.DB, common.OptionMap = db, make(map[string]string)
			require.NoError(t, db.AutoMigrate(&model.Option{}))
			credentials := map[string]string{"WaffoPancakeMerchantID": "test-merchant", "WaffoPancakePrivateKey": "test-key", "WaffoPancakeProductID": "test-product"}
			require.NoError(t, model.UpdateOptionsBulk(credentials))
			for _, enabled := range []string{"false", "true", "false"} {
				require.NoError(t, model.UpdateOption("WaffoPancakeEnabled", enabled))
				assert.Equal(t, enabled == "true", setting.WaffoPancakeEnabled)
				var saved model.Option
				require.NoError(t, db.Where(&model.Option{Key: "WaffoPancakeEnabled"}).First(&saved).Error)
				assert.Equal(t, enabled, saved.Value)
				for key, value := range credentials {
					var credential model.Option
					require.NoError(t, db.Where(&model.Option{Key: key}).First(&credential).Error)
					assert.Equal(t, value, credential.Value, "credential must survive toggling")
				}
			}
		})
	}
}

func TestWaffoPancakeDisableStopsNewOrdersAndPreservesCallbacks(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalEnabled := setting.WaffoPancakeEnabled
	originalMerchant, originalKey, originalProduct := setting.WaffoPancakeMerchantID, setting.WaffoPancakePrivateKey, setting.WaffoPancakeProductID
	originalMethods := operation_setting.PayMethods
	t.Cleanup(func() {
		setting.WaffoPancakeEnabled = originalEnabled
		setting.WaffoPancakeMerchantID, setting.WaffoPancakePrivateKey, setting.WaffoPancakeProductID = originalMerchant, originalKey, originalProduct
		operation_setting.PayMethods = originalMethods
	})
	setting.WaffoPancakeMerchantID, setting.WaffoPancakePrivateKey, setting.WaffoPancakeProductID = "merchant", "test-private-key", "product"
	operation_setting.PayMethods = []map[string]string{{"type": "waffo_pancake"}, {"type": "alipay"}}
	router := gin.New()
	router.Use(gin.Recovery())
	router.GET("/info", GetTopUpInfo)
	router.POST("/pay", RequestWaffoPancakePay)
	router.POST("/amount", RequestWaffoPancakeAmount)
	router.POST("/subscription", SubscriptionRequestWaffoPancakePay)
	router.POST("/webhook/:env", WaffoPancakeWebhook)

	for _, enabled := range []bool{true, false, true} {
		setting.WaffoPancakeEnabled = enabled
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/info", nil))
		var body struct {
			Data struct {
				Enabled bool                `json:"enable_waffo_pancake_topup"`
				Methods []map[string]string `json:"pay_methods"`
			} `json:"data"`
		}
		require.NoError(t, common.Unmarshal(response.Body.Bytes(), &body))
		assert.Equal(t, enabled, body.Data.Enabled)
		if enabled {
			assert.Contains(t, body.Data.Methods, map[string]string{"type": "waffo_pancake"})
		} else {
			assert.NotContains(t, body.Data.Methods, map[string]string{"type": "waffo_pancake"})
		}
		assert.Contains(t, body.Data.Methods, map[string]string{"type": "alipay"})
		assert.Len(t, operation_setting.PayMethods, 2, "the configured payment list must survive disabling")
	}

	setting.WaffoPancakeEnabled = false
	for _, path := range []string{"/pay", "/amount", "/subscription"} {
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{}`))
		request.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(response, request)
		assert.Equal(t, http.StatusOK, response.Code, path)
		assert.Contains(t, response.Body.String(), "Waffo Pancake is disabled", path)
	}
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/webhook/prod", strings.NewReader(`{}`)))
	assert.Equal(t, http.StatusUnauthorized, response.Code, "pending callbacks still require a valid signature after new orders are disabled")
	assert.Equal(t, "merchant", setting.WaffoPancakeMerchantID)
	assert.Equal(t, "test-private-key", setting.WaffoPancakePrivateKey)
	assert.Equal(t, "product", setting.WaffoPancakeProductID)
}

func TestFormatWaffoPancakeAmount_UsesDisplayPriceString(t *testing.T) {
	testCases := []struct {
		name     string
		amount   float64
		expected string
	}{
		{name: "whole amount", amount: 29, expected: "29.00"},
		{name: "decimal amount", amount: 29.9, expected: "29.90"},
		{name: "round half up to cents", amount: 29.999, expected: "30.00"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			require.Equal(t, tc.expected, formatWaffoPancakeAmount(tc.amount))
		})
	}
}

func TestGetWaffoPancakePayMoney(t *testing.T) {
	originalUnitPrice := setting.WaffoPancakeUnitPrice
	originalQuotaDisplayType := operation_setting.GetGeneralSetting().QuotaDisplayType
	originalDiscounts := make(map[int]float64, len(operation_setting.GetPaymentSetting().AmountDiscount))
	maps.Copy(originalDiscounts, operation_setting.GetPaymentSetting().AmountDiscount)
	originalTopupGroupRatio := common.TopupGroupRatio2JSONString()

	t.Cleanup(func() {
		setting.WaffoPancakeUnitPrice = originalUnitPrice
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalQuotaDisplayType
		operation_setting.GetPaymentSetting().AmountDiscount = originalDiscounts
		require.NoError(t, common.UpdateTopupGroupRatioByJSONString(originalTopupGroupRatio))
	})

	setting.WaffoPancakeUnitPrice = 2.5
	operation_setting.GetPaymentSetting().AmountDiscount = map[int]float64{
		10:                           0.8,
		int(common.QuotaPerUnit * 3): 0.5,
		20:                           0,
	}
	require.NoError(t, common.UpdateTopupGroupRatioByJSONString(`{"default":1,"vip":1.2}`))

	testCases := []struct {
		name             string
		amount           int64
		group            string
		quotaDisplayType string
		expected         float64
	}{
		{
			name:             "currency display applies unit price group ratio and discount",
			amount:           10,
			group:            "vip",
			quotaDisplayType: operation_setting.QuotaDisplayTypeUSD,
			expected:         24,
		},
		{
			name:             "tokens display converts quota to display units before pricing",
			amount:           int64(common.QuotaPerUnit * 3),
			group:            "vip",
			quotaDisplayType: operation_setting.QuotaDisplayTypeTokens,
			expected:         4.5,
		},
		{
			name:             "non-positive discount falls back to no discount",
			amount:           20,
			group:            "default",
			quotaDisplayType: operation_setting.QuotaDisplayTypeUSD,
			expected:         50,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			operation_setting.GetGeneralSetting().QuotaDisplayType = tc.quotaDisplayType
			actual := getWaffoPancakePayMoney(tc.amount, tc.group)
			require.InDelta(t, tc.expected, actual, 0.000001)
		})
	}
}
