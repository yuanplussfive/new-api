package controller

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

func GetAfdianConfig(c *gin.Context) {
	common.ApiSuccess(c, gin.H{"config": setting.GetAfdianConfig()})
}

func SaveAfdianConfig(c *gin.Context) {
	var config setting.AfdianConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	config.UserID = strings.TrimSpace(config.UserID)
	if err := setting.ValidateAfdianConfig(config); err != nil {
		common.ApiError(c, err)
		return
	}
	encoded, err := common.Marshal(config)
	if err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	if err := model.UpdateOptionsBulk(map[string]string{setting.AfdianOptionKey: string(encoded)}); err != nil {
		common.ApiErrorT(c, "Failed to save configuration")
		return
	}
	logger.LogInfo(c.Request.Context(), common.LogText("Afdian configuration updated operator_id=%d enabled=%t products=%d", c.GetInt("id"), config.Enabled, len(config.Products)))
	GetAfdianConfig(c)
}

func isAfdianEnabled() bool {
	config := setting.GetAfdianConfig()
	return operation_setting.IsPaymentComplianceConfirmed() && config.Enabled && setting.ValidateAfdianConfig(config) == nil
}

// Afdian distributes pre-generated new-api redemption codes through its native
// random-reply inventory. Opening checkout never creates or credits an order.
func RequestAfdianPay(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}
	if !isAfdianEnabled() {
		common.ApiErrorT(c, "Afdian payment is not enabled")
		return
	}
	var request struct {
		PlanID string `json:"plan_id"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	for _, product := range setting.GetAfdianConfig().Products {
		if product.PlanID != request.PlanID {
			continue
		}
		query := url.Values{"plan_id": {product.PlanID}, "product_type": {"0"}, "month": {"1"}}
		common.ApiSuccess(c, gin.H{"checkout_url": "https://afdian.com/order/create?" + query.Encode()})
		return
	}
	common.ApiErrorT(c, "Product does not exist")
}

// Tombstones for old clients and provider callback settings. These endpoints
// deliberately perform no provider requests, order lookups or wallet writes.
func AfdianPaymentRetired(c *gin.Context) {
	common.ApiErrorStatus(c, http.StatusGone, common.NewMessage("Afdian uses redemption codes. Automatic payment verification is no longer available."))
}
