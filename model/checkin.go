package model

import (
	"crypto/rand"
	"math/big"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

// Checkin 签到记录
type Checkin struct {
	Id              int                               `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId          int                               `json:"user_id" gorm:"not null;uniqueIndex:idx_user_checkin_date"`
	CheckinDate     string                            `json:"checkin_date" gorm:"type:varchar(10);not null;uniqueIndex:idx_user_checkin_date"` // 格式: YYYY-MM-DD
	QuotaAwarded    int                               `json:"quota_awarded" gorm:"not null"`
	CreatedAt       int64                             `json:"created_at" gorm:"bigint"`
	RewardTierIndex int                               `json:"-" gorm:"-"`
	RewardTiers     []operation_setting.CheckinReward `json:"-" gorm:"-"`
}

// CheckinRecord 用于API返回的签到记录（不包含敏感字段）
type CheckinRecord struct {
	CheckinDate  string `json:"checkin_date"`
	QuotaAwarded int    `json:"quota_awarded"`
}

func (Checkin) TableName() string {
	return "checkins"
}

// GetUserCheckinRecords 获取用户在指定日期范围内的签到记录
func GetUserCheckinRecords(userId int, startDate, endDate string) ([]Checkin, error) {
	var records []Checkin
	err := DB.Where("user_id = ? AND checkin_date >= ? AND checkin_date <= ?",
		userId, startDate, endDate).
		Order("checkin_date DESC").
		Find(&records).Error
	return records, err
}

// HasCheckedInToday 检查用户今天是否已签到
func HasCheckedInToday(userId int) (bool, error) {
	today := time.Now().Format("2006-01-02")
	var count int64
	err := DB.Model(&Checkin{}).
		Where("user_id = ? AND checkin_date = ?", userId, today).
		Count(&count).Error
	return count > 0, err
}

// UserCheckin checks the current database group and credits exactly one daily
// reward in the same transaction on every supported database.
func UserCheckin(userId int) (*Checkin, error) {
	settings := operation_setting.GetCheckinSetting()
	if !settings.Enabled {
		return nil, common.NewMessage("Check-in feature is not enabled")
	}
	encoded, err := common.Marshal(settings.GroupRewards)
	if err != nil {
		return nil, err
	}
	if err := operation_setting.ValidateCheckinGroupRewards(string(encoded)); err != nil {
		return nil, err
	}
	now := time.Now()
	checkin := &Checkin{UserId: userId, CheckinDate: now.Format("2006-01-02"), CreatedAt: now.Unix()}
	err = DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if err := lockForUpdate(tx).Select("id", "group", "status").Where("id = ?", userId).First(&user).Error; err != nil {
			return err
		}
		rewards := settings.GroupRewards[user.Group]
		if len(rewards) == 0 || user.Status != common.UserStatusEnabled {
			return common.NewMessage("Check-in is not available for your user group")
		}
		var count int64
		if err := tx.Model(&Checkin{}).Where("user_id = ? AND checkin_date = ?", userId, checkin.CheckinDate).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return common.NewMessage("Already checked in today")
		}
		var total int64
		for _, reward := range rewards {
			total += reward.Weight
		}
		ticket, err := rand.Int(rand.Reader, big.NewInt(total))
		if err != nil {
			return common.NewMessage("Check-in failed, please try again later")
		}
		index, err := operation_setting.CheckinRewardAt(rewards, ticket.Int64())
		if err != nil {
			return err
		}
		checkin.QuotaAwarded, checkin.RewardTierIndex, checkin.RewardTiers = rewards[index].Quota, index, rewards
		if err := tx.Create(checkin).Error; err != nil {
			return common.NewMessage("Check-in failed, please try again later")
		}
		if checkin.QuotaAwarded > 0 {
			return creditTopUpQuota(tx, userId, checkin.QuotaAwarded, nil)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if checkin.QuotaAwarded > 0 {
		syncCreditUserQuotaCache(userId, checkin.QuotaAwarded, "daily check-in")
	}
	return checkin, nil
}

// GetUserCheckinStats 获取用户签到统计信息
func GetUserCheckinStats(userId int, month string) (map[string]any, error) {
	// 获取指定月份的所有签到记录
	startDate := month + "-01"
	endDate := month + "-31"

	records, err := GetUserCheckinRecords(userId, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// 转换为不包含敏感字段的记录
	checkinRecords := make([]CheckinRecord, len(records))
	for i, r := range records {
		checkinRecords[i] = CheckinRecord{
			CheckinDate:  r.CheckinDate,
			QuotaAwarded: r.QuotaAwarded,
		}
	}

	// 检查今天是否已签到
	hasCheckedToday, err := HasCheckedInToday(userId)
	if err != nil {
		return nil, err
	}

	// 获取用户所有时间的签到统计
	var totalCheckins int64
	var totalQuota int64
	if err := DB.Model(&Checkin{}).Where("user_id = ?", userId).Count(&totalCheckins).Error; err != nil {
		return nil, err
	}
	if err := DB.Model(&Checkin{}).Where("user_id = ?", userId).Select("COALESCE(SUM(quota_awarded), 0)").Scan(&totalQuota).Error; err != nil {
		return nil, err
	}

	return map[string]any{
		"total_quota":      totalQuota,      // 所有时间累计获得的额度
		"total_checkins":   totalCheckins,   // 所有时间累计签到次数
		"checkin_count":    len(records),    // 本月签到次数
		"checked_in_today": hasCheckedToday, // 今天是否已签到
		"records":          checkinRecords,  // 本月签到记录详情（不含id和user_id）
	}, nil
}
