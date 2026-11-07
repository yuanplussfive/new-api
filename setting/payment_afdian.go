package setting

import (
	"errors"
	"regexp"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
)

// A single persisted option keeps credentials and the product catalogue consistent.
const AfdianOptionKey = "AfdianConfigSecret"

type AfdianProduct struct {
	PlanID             string `json:"plan_id"`
	Name               string `json:"name"`
	Price              string `json:"price"` // CNY, independent of the dashboard display currency.
	Quota              int64  `json:"quota"`
	SubscriptionPlanID int    `json:"subscription_plan_id"`
}

type AfdianConfig struct {
	Enabled  bool            `json:"enabled"`
	UserID   string          `json:"user_id"`
	APIToken string          `json:"api_token"`
	Products []AfdianProduct `json:"products"`
}

var afdianSettings struct {
	sync.RWMutex
	config AfdianConfig
}

var afdianIDPattern = regexp.MustCompile(`^[a-f0-9]{32}$`)
var afdianPricePattern = regexp.MustCompile(`^[0-9]{1,7}(\.[0-9]{1,2})?$`)

func ValidateAfdianConfig(config AfdianConfig) error {
	if len(config.Products) > 100 || len(config.APIToken) > 512 {
		return common.NewMessage("Invalid parameters")
	}
	if config.Enabled && (!afdianIDPattern.MatchString(config.UserID) || strings.TrimSpace(config.APIToken) == "" || len(config.Products) == 0) {
		return common.NewMessage("Afdian credentials and products are required")
	}
	seen := make(map[string]bool, len(config.Products))
	for _, product := range config.Products {
		price, err := decimal.NewFromString(product.Price)
		if !afdianIDPattern.MatchString(product.PlanID) || seen[product.PlanID] || strings.TrimSpace(product.Name) == "" || len(product.Name) > 100 ||
			!afdianPricePattern.MatchString(product.Price) || err != nil || !price.IsPositive() || product.SubscriptionPlanID < 0 {
			return common.NewMessage("Invalid Afdian product configuration")
		}
		seen[product.PlanID] = true
		if product.SubscriptionPlanID > 0 {
			if product.Quota != 0 {
				return common.NewMessage("Invalid Afdian product configuration")
			}
			continue
		}
		quota, err := common.WalletQuotaFromDecimalStrict(decimal.NewFromInt(product.Quota))
		if err != nil || quota <= 0 {
			return common.NewMessage("Invalid top-up quota")
		}
	}
	return nil
}

func UpdateAfdianConfig(value string) error {
	var config AfdianConfig
	if err := common.UnmarshalJsonStr(value, &config); err != nil {
		return errors.New("invalid Afdian configuration JSON")
	}
	if err := ValidateAfdianConfig(config); err != nil {
		return err
	}
	afdianSettings.Lock()
	defer afdianSettings.Unlock()
	afdianSettings.config = config
	return nil
}

func GetAfdianConfig() AfdianConfig {
	afdianSettings.RLock()
	defer afdianSettings.RUnlock()
	config := afdianSettings.config
	config.Products = append([]AfdianProduct{}, config.Products...)
	return config
}
