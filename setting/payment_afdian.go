package setting

import (
	"errors"
	"regexp"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
)

// A single persisted option stores the creator and code-delivery catalogue.
const AfdianOptionKey = "AfdianConfigSecret"

type AfdianProduct struct {
	PlanID string `json:"plan_id"`
	Name   string `json:"name"`
	Price  string `json:"price"` // CNY, independent of the dashboard display currency.
	Quota  int64  `json:"quota"`
}

type AfdianConfig struct {
	Enabled  bool            `json:"enabled"`
	UserID   string          `json:"user_id"`
	Products []AfdianProduct `json:"products"`
}

var afdianSettings struct {
	sync.RWMutex
	config AfdianConfig
}

var afdianIDPattern = regexp.MustCompile(`^[a-f0-9]{32}$`)
var afdianPricePattern = regexp.MustCompile(`^[0-9]{1,7}(\.[0-9]{1,2})?$`)

func ValidateAfdianConfig(config AfdianConfig) error {
	if len(config.Products) > 100 {
		return common.NewMessage("Invalid parameters")
	}
	if config.Enabled && (!afdianIDPattern.MatchString(config.UserID) || len(config.Products) == 0) {
		return common.NewMessage("Afdian creator ID and products are required")
	}
	seen := make(map[string]bool, len(config.Products))
	for _, product := range config.Products {
		price, err := decimal.NewFromString(product.Price)
		if !afdianIDPattern.MatchString(product.PlanID) || seen[product.PlanID] || strings.TrimSpace(product.Name) == "" || len(product.Name) > 100 ||
			!afdianPricePattern.MatchString(product.Price) || err != nil || !price.IsPositive() {
			return common.NewMessage("Invalid Afdian product configuration")
		}
		seen[product.PlanID] = true
		quota, err := common.WalletQuotaFromDecimalStrict(decimal.NewFromInt(product.Quota))
		if err != nil || quota <= 0 {
			return common.NewMessage("Invalid top-up quota")
		}
	}
	return nil
}

func UpdateAfdianConfig(value string) error {
	var stored struct {
		AfdianConfig
		LegacyToken *string `json:"api_token"`
	}
	if err := common.UnmarshalJsonStr(value, &stored); err != nil {
		return errors.New("invalid Afdian configuration JSON")
	}
	config := stored.AfdianConfig
	if stored.LegacyToken != nil {
		// Old catalogues were configured for automatic credit. Require an
		// explicit code-delivery setup instead of selling codes from those plans.
		config.Enabled = false
		config.Products = []AfdianProduct{}
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
