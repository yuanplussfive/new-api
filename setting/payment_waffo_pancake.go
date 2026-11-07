package setting

// Waffo Pancake hosted checkout configuration. StoreID + ProductID are
// operator-bound via SaveWaffoPancakeConfig. Enabled defaults to true to preserve
// existing installations; disabling stops new checkouts while retaining configuration.
var (
	WaffoPancakeEnabled    = true
	WaffoPancakeMerchantID string
	WaffoPancakePrivateKey string
	WaffoPancakeReturnURL  string
	WaffoPancakeUnitPrice  float64 = 1.0
	WaffoPancakeMinTopUp   int     = 1
	WaffoPancakeStoreID    string
	WaffoPancakeProductID  string
)
