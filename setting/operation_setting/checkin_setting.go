package operation_setting

import (
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/shopspring/decimal"
)

type CheckinReward struct {
	Name   string `json:"name"`
	Quota  int    `json:"quota"`
	Weight int64  `json:"weight"`
}

type CheckinSetting struct {
	Enabled bool `json:"enabled"`
	// Retain legacy options for upgrades; rewards now require an explicit group pool.
	MinQuota     int                        `json:"min_quota"`
	MaxQuota     int                        `json:"max_quota"`
	GroupRewards map[string][]CheckinReward `json:"group_rewards"`
}

var checkinSetting = CheckinSetting{MinQuota: 1000, MaxQuota: 10000, GroupRewards: map[string][]CheckinReward{}}

func init() {
	config.GlobalConfig.Register("checkin_setting", &checkinSetting)
}

// Option updates hold OptionMapRWMutex. Copy maps and slices so a draw uses a
// consistent pool even when an administrator replaces the configuration.
func GetCheckinSetting() *CheckinSetting {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()
	snapshot := checkinSetting
	snapshot.GroupRewards = make(map[string][]CheckinReward, len(checkinSetting.GroupRewards))
	for group, rewards := range checkinSetting.GroupRewards {
		snapshot.GroupRewards[group] = append([]CheckinReward{}, rewards...)
	}
	return &snapshot
}

func IsCheckinEnabled() bool { return GetCheckinSetting().Enabled }

func GetCheckinQuotaRange() (min, max int) {
	settings := GetCheckinSetting()
	return settings.MinQuota, settings.MaxQuota
}

func ValidateCheckinGroupRewards(value string) error {
	var groups map[string][]CheckinReward
	if err := common.UnmarshalJsonStr(value, &groups); err != nil || len(groups) > 100 {
		return common.NewMessage("Invalid check-in reward configuration")
	}
	for group, rewards := range groups {
		if strings.TrimSpace(group) != group || group == "" || len(group) > 64 || len(rewards) == 0 || len(rewards) > 12 {
			return common.NewMessage("Invalid check-in reward configuration")
		}
		var total int64
		for _, reward := range rewards {
			if strings.TrimSpace(reward.Name) == "" || utf8.RuneCountInString(reward.Name) > 50 || reward.Weight <= 0 || reward.Weight > 1000000 {
				return common.NewMessage("Invalid check-in reward configuration")
			}
			if _, err := common.WalletQuotaFromDecimalStrict(decimal.NewFromInt(int64(reward.Quota))); err != nil || reward.Quota < 0 {
				return common.NewMessage("Invalid check-in reward configuration")
			}
			total += reward.Weight
		}
		if total > 1000000 {
			return common.NewMessage("Invalid check-in reward configuration")
		}
	}
	return nil
}

// CheckinRewardAt maps a uniformly sampled ticket to its weighted reward tier.
func CheckinRewardAt(rewards []CheckinReward, ticket int64) (int, error) {
	if ticket >= 0 {
		for index, reward := range rewards {
			if reward.Weight <= 0 {
				break
			}
			if ticket < reward.Weight {
				return index, nil
			}
			ticket -= reward.Weight
		}
	}
	return 0, common.NewMessage("Invalid check-in reward configuration")
}
