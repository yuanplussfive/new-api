package model

// AfdianOrder is retained only to preserve historical checkout records and the
// existing schema. Afdian purchases now use new-api's standard redemption codes;
// there is no automatic payment settlement or order-query implementation.
type AfdianOrder struct {
	TradeNo         string  `gorm:"primaryKey;type:varchar(64)"`
	ProviderOrderID *string `gorm:"uniqueIndex;type:varchar(64)"`
	CreatorID       string  `gorm:"type:varchar(32)"`
	PlanID          string  `gorm:"type:varchar(32)"`
	MoneyCents      int64
	PlanSnapshot    string `gorm:"type:text"`
}
