package controller

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func setCheckinTestPolicy(t *testing.T, enabled bool, pools map[string][]operation_setting.CheckinReward) {
	t.Helper()
	encoded, err := common.Marshal(pools)
	require.NoError(t, err)
	active := "false"
	if enabled {
		active = "true"
	}
	require.NoError(t, model.UpdateOptionsBulk(map[string]string{"checkin_setting.enabled": active, "checkin_setting.group_rewards": string(encoded)}))
}

func TestCheckinWeightedRewards(t *testing.T) {
	rewards := []operation_setting.CheckinReward{{Name: "Small", Quota: 1000, Weight: 80}, {Name: "Lucky", Quota: 5000, Weight: 18}, {Name: "Jackpot", Quota: 50000, Weight: 2}}
	for _, test := range []struct {
		ticket int64
		index  int
	}{{0, 0}, {79, 0}, {80, 1}, {97, 1}, {98, 2}, {99, 2}} {
		index, err := operation_setting.CheckinRewardAt(rewards, test.ticket)
		require.NoError(t, err)
		assert.Equal(t, test.index, index)
	}
	for _, ticket := range []int64{-1, 100} {
		_, err := operation_setting.CheckinRewardAt(rewards, ticket)
		assert.Error(t, err)
	}
	for _, invalid := range []string{
		`{"vip":[{"name":"Invalid","quota":-1,"weight":1}]}`,
		`{"vip":[{"name":"Invalid","quota":9007199254740992,"weight":1}]}`,
		`{"vip":[{"name":"Invalid","quota":1,"weight":0}]}`,
		`{"vip":[{"name":"Invalid","quota":1,"weight":1000001}]}`,
		`{"vip":[]}`,
		`{" vip":[{"name":"Invalid","quota":1,"weight":1}]}`,
		`[]`,
	} {
		assert.Error(t, operation_setting.ValidateCheckinGroupRewards(invalid))
	}
	require.NoError(t, operation_setting.ValidateCheckinGroupRewards(`{"vip":[{"name":"Zero","quota":0,"weight":1}]}`))
}

func TestCheckinDatabaseMatrix(t *testing.T) {
	for _, dialect := range []string{"sqlite", "mysql", "postgres"} {
		t.Run(dialect, func(t *testing.T) {
			var driver gorm.Dialector
			switch dialect {
			case "sqlite":
				driver = sqlite.Open(t.TempDir() + "/checkin.db")
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
			db, err := gorm.Open(driver, &gorm.Config{Logger: gormlogger.Default.LogMode(gormlogger.Silent)})
			require.NoError(t, err)
			if dialect != "sqlite" {
				var databaseName string
				query := "SELECT DATABASE()"
				if dialect == "postgres" {
					query = "SELECT current_database()"
				}
				require.NoError(t, db.Raw(query).Scan(&databaseName).Error)
				require.True(t, strings.HasPrefix(databaseName, "codex_afdian_test"), "use a disposable codex_afdian_test database")
				require.NoError(t, db.Migrator().DropTable(&model.Checkin{}, &model.User{}, &model.Log{}, &model.Option{}))
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

			require.NoError(t, db.AutoMigrate(&model.User{}, &model.Checkin{}, &model.Option{}, &model.Log{}))
			var version string
			query := "SELECT version()"
			if dialect == "sqlite" {
				query = "SELECT sqlite_version()"
			}
			require.NoError(t, db.Raw(query).Scan(&version).Error)
			t.Logf("database version: %s", version)
			oldConfig, oldOptions := operation_setting.GetCheckinSetting(), common.OptionMap
			common.OptionMap = make(map[string]string)
			t.Cleanup(func() {
				setCheckinTestPolicy(t, oldConfig.Enabled, oldConfig.GroupRewards)
				common.OptionMap = oldOptions
			})
			pools := map[string][]operation_setting.CheckinReward{
				"vip":      {{Name: "VIP reward", Quota: 5000, Weight: 1}},
				"standard": {{Name: "Standard reward", Quota: 1000, Weight: 1}},
			}
			setCheckinTestPolicy(t, true, pools)
			vip := model.User{Username: "checkin-vip", AffCode: "checkin-vip", Group: "vip", Status: common.UserStatusEnabled, Quota: 100}
			denied := model.User{Username: "checkin-denied", AffCode: "checkin-denied", Group: "unlisted", Status: common.UserStatusEnabled, Quota: 100}
			require.NoError(t, db.Create(&vip).Error)
			require.NoError(t, db.Create(&denied).Error)
			historical := model.Checkin{UserId: vip.Id, CheckinDate: time.Now().AddDate(0, 0, -1).Format("2006-01-02"), QuotaAwarded: 1234, CreatedAt: 1}
			require.NoError(t, db.Create(&historical).Error)
			for range 2 {
				require.NoError(t, db.AutoMigrate(&model.Checkin{}))
			}
			var preserved model.Checkin
			require.NoError(t, db.First(&preserved, historical.Id).Error)
			assert.Equal(t, historical, preserved)
			duplicate := historical
			duplicate.Id = 0
			assert.Error(t, db.Create(&duplicate).Error)
			_, err = model.UserCheckin(denied.Id)
			require.Error(t, err)
			var count int64
			require.NoError(t, db.Model(&model.Checkin{}).Where("user_id = ?", denied.Id).Count(&count).Error)
			assert.Zero(t, count)
			// Neither a request payload nor cached session group grants check-in access.
			router := gin.New()
			router.Use(func(c *gin.Context) { c.Set("id", denied.Id); c.Set("group", "vip") })
			router.GET("/status", GetCheckinStatus)
			router.POST("/draw", DoCheckin)
			status := httptest.NewRecorder()
			router.ServeHTTP(status, httptest.NewRequest(http.MethodGet, "/status", nil))
			assert.Contains(t, status.Body.String(), `"eligible":false`)
			forged := httptest.NewRecorder()
			router.ServeHTTP(forged, httptest.NewRequest(http.MethodPost, "/draw", strings.NewReader(`{"group":"vip","quota":9000000,"reward_tier_index":0}`)))
			assert.Contains(t, forged.Body.String(), `"success":false`)
			// A fresh group change takes effect immediately, without another login.
			require.NoError(t, db.Model(&denied).Update("group", "standard").Error)
			record, err := model.UserCheckin(denied.Id)
			require.NoError(t, err)
			assert.Equal(t, 1000, record.QuotaAwarded)
			assert.Equal(t, "Standard reward", record.RewardTiers[record.RewardTierIndex].Name)
			// Concurrent requests can credit the VIP reward at most once on all engines.
			var wg sync.WaitGroup
			results := make(chan error, 2)
			for range 2 {
				wg.Go(func() { _, err := model.UserCheckin(vip.Id); results <- err })
			}
			wg.Wait()
			close(results)
			successes := 0
			for err := range results {
				if err == nil {
					successes++
				}
			}
			assert.Equal(t, 1, successes)
			require.NoError(t, db.First(&vip, vip.Id).Error)
			assert.Equal(t, 5100, vip.Quota)
			_, err = model.UserCheckin(vip.Id)
			assert.Error(t, err)
			// The wallet ceiling rolls back the daily record as well as the credit.
			full := model.User{Username: "checkin-full", AffCode: "checkin-full", Group: "vip", Status: common.UserStatusEnabled, Quota: common.MaxWalletQuota}
			require.NoError(t, db.Create(&full).Error)
			_, err = model.UserCheckin(full.Id)
			require.ErrorIs(t, err, model.ErrTopUpQuotaLimitExceeded)
			require.NoError(t, db.Model(&model.Checkin{}).Where("user_id = ?", full.Id).Count(&count).Error)
			assert.Zero(t, count)
			require.NoError(t, db.Model(&full).Update("quota", 0).Error)
			record, err = model.UserCheckin(full.Id)
			require.NoError(t, err)
			assert.Equal(t, 5000, record.QuotaAwarded)
			// Removing access and disabling the feature both fail closed; invalid option
			// writes cannot replace a valid pool. A zero-value tier still consumes the day.
			require.Error(t, model.UpdateOptionsBulk(map[string]string{"checkin_setting.group_rewards": `{"vip":[{"name":"bad","quota":-100,"weight":1}]}`}))
			assert.Equal(t, pools, operation_setting.GetCheckinSetting().GroupRewards)
			zero := model.User{Username: "checkin-zero", AffCode: "checkin-zero", Group: "zero", Status: common.UserStatusEnabled, Quota: 100}
			require.NoError(t, db.Create(&zero).Error)
			setCheckinTestPolicy(t, true, map[string][]operation_setting.CheckinReward{"zero": {{Name: "Participation", Quota: 0, Weight: 1}}})
			record, err = model.UserCheckin(zero.Id)
			require.NoError(t, err)
			assert.Zero(t, record.QuotaAwarded)
			_, err = model.UserCheckin(zero.Id)
			assert.Error(t, err)
			require.NoError(t, db.First(&zero, zero.Id).Error)
			assert.Equal(t, 100, zero.Quota)
			setCheckinTestPolicy(t, false, pools)
			_, err = model.UserCheckin(denied.Id)
			assert.Error(t, err)
		})
	}
}
