package controller

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

var afdianOrderNumberPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)

func GetAfdianConfig(c *gin.Context) {
	config := setting.GetAfdianConfig()
	configured := config.APIToken != ""
	config.APIToken = ""
	common.ApiSuccess(c, gin.H{"config": config, "api_token_configured": configured})
}

func SaveAfdianConfig(c *gin.Context) {
	var config setting.AfdianConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	config.UserID = strings.TrimSpace(config.UserID)
	config.APIToken = strings.TrimSpace(config.APIToken)
	if config.APIToken == "" {
		config.APIToken = setting.GetAfdianConfig().APIToken
	}
	if err := setting.ValidateAfdianConfig(config); err != nil {
		common.ApiError(c, err)
		return
	}
	previous := setting.GetAfdianConfig()
	for _, product := range config.Products {
		for _, existing := range previous.Products {
			if previous.UserID == config.UserID && existing.PlanID == product.PlanID &&
				(existing.DeliveryMode == setting.AfdianDeliveryRedemption) != (product.DeliveryMode == setting.AfdianDeliveryRedemption) {
				common.ApiErrorT(c, "Use a separate Afdian plan for redemption code delivery to avoid duplicate credit")
				return
			}
		}
		if product.DeliveryMode == setting.AfdianDeliveryRedemption {
			used, err := model.AfdianPlanHasDirectOrders(config.UserID, product.PlanID)
			if err != nil {
				common.ApiErrorT(c, "Failed to save configuration")
				return
			}
			if used {
				common.ApiErrorT(c, "Use a separate Afdian plan for redemption code delivery to avoid duplicate credit")
				return
			}
		}
		if product.SubscriptionPlanID > 0 {
			if _, err := model.GetSubscriptionPlanById(product.SubscriptionPlanID); err != nil {
				common.ApiErrorT(c, "Subscription plan does not exist")
				return
			}
		}
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
	config := setting.GetAfdianConfig()
	var selected *setting.AfdianProduct
	for _, product := range config.Products {
		if product.PlanID == request.PlanID {
			selected = &product
			break
		}
	}
	if selected == nil {
		common.ApiErrorT(c, "Product does not exist")
		return
	}
	if selected.DeliveryMode == setting.AfdianDeliveryRedemption {
		// Afdian distributes pre-generated codes from its native random-reply
		// inventory. There is no local payment order or automatic wallet credit.
		query := url.Values{"plan_id": {selected.PlanID}, "product_type": {"0"}, "month": {"1"}}
		common.ApiSuccess(c, gin.H{"checkout_url": "https://afdian.com/order/create?" + query.Encode(), "delivery_mode": setting.AfdianDeliveryRedemption})
		return
	}
	userID := c.GetInt("id")
	var plan *model.SubscriptionPlan
	if selected.SubscriptionPlanID > 0 {
		var err error
		plan, err = model.GetSubscriptionPlanById(selected.SubscriptionPlanID)
		if err != nil || !plan.Enabled {
			common.ApiErrorT(c, "Subscription plan is not enabled")
			return
		}
		if plan.MaxPurchasePerUser > 0 {
			count, err := model.CountUserSubscriptionsByPlan(userID, plan.Id)
			if err != nil {
				common.ApiErrorT(c, "Failed to create order")
				return
			}
			if count >= int64(plan.MaxPurchasePerUser) {
				common.ApiErrorT(c, "Purchase limit for this plan has been reached")
				return
			}
		}
	} else if rejectInvalidCreditedQuota(c, userID, decimal.NewFromInt(selected.Quota)) {
		return
	}
	var random [24]byte
	if _, err := rand.Read(random[:]); err != nil {
		common.ApiErrorT(c, "Failed to create order")
		return
	}
	tradeNo := "afd_" + hex.EncodeToString(random[:])
	if err := model.CreateAfdianOrder(userID, tradeNo, config.UserID, *selected, plan); err != nil {
		logger.LogError(c.Request.Context(), common.LogText("Afdian checkout creation failed user_id=%d trade_no=%s", userID, tradeNo))
		common.ApiErrorT(c, "Failed to create order")
		return
	}
	query := url.Values{"plan_id": {selected.PlanID}, "product_type": {"0"}, "month": {"1"}, "custom_order_id": {tradeNo}}
	common.ApiSuccess(c, gin.H{"checkout_url": "https://afdian.com/order/create?" + query.Encode(), "order_id": tradeNo, "delivery_mode": setting.AfdianDeliveryDirect})
}

// Afdian's notification is only a hint. Neither its amount nor its user/order
// association is trusted; the authenticated query supplies all fulfillment data.
func AfdianWebhook(c *gin.Context) {
	if !isAfdianEnabled() {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	var event struct {
		EC   int `json:"ec"`
		Data struct {
			Type  string              `json:"type"`
			Order model.AfdianPayment `json:"order"`
		} `json:"data"`
	}
	if err := c.ShouldBindJSON(&event); err != nil || event.EC != 200 {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if event.Data.Type != "order" {
		c.JSON(http.StatusOK, gin.H{"ec": 200, "em": "ok"})
		return
	}
	if !afdianOrderNumberPattern.MatchString(event.Data.Order.OutTradeNo) {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	config := setting.GetAfdianConfig()
	if config.APIToken == "" {
		// Code-only configurations do not need Open API credentials or a
		// webhook to deliver purchases. No payment data is used for credit.
		c.JSON(http.StatusOK, gin.H{"ec": 200, "em": "ok"})
		return
	}
	payment, err := service.QueryAfdianOrder(c.Request.Context(), nil, config, event.Data.Order.OutTradeNo)
	if err != nil {
		logger.LogWarn(c.Request.Context(), common.LogText("Afdian webhook query failed order_id=%s", event.Data.Order.OutTradeNo))
		c.JSON(http.StatusServiceUnavailable, gin.H{"ec": 500, "em": "order verification unavailable"})
		return
	}
	if !strings.HasPrefix(payment.CustomOrderID, "afd_") {
		// The creator can receive unrelated donations on the same account.
		c.JSON(http.StatusOK, gin.H{"ec": 200, "em": "ok"})
		return
	}
	if err := model.CompleteAfdianOrder(*payment, config.UserID, c.ClientIP()); err != nil {
		logger.LogWarn(c.Request.Context(), common.LogText("Afdian fulfillment rejected order_id=%s trade_no=%s mismatch=%t", payment.OutTradeNo, payment.CustomOrderID, errors.Is(err, model.ErrAfdianPaymentMismatch)))
		c.JSON(http.StatusServiceUnavailable, gin.H{"ec": 500, "em": "order not fulfilled"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ec": 200, "em": "ok"})
}

// A logged-in buyer can recover a missed notification, but cannot bind an
// arbitrary donation: the queried custom_order_id must match their own checkout.
func CheckAfdianPayment(c *gin.Context) {
	if !isAfdianEnabled() {
		common.ApiErrorT(c, "Afdian payment is not enabled")
		return
	}
	var request struct {
		OrderID    string `json:"order_id"`
		OutTradeNo string `json:"out_trade_no"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || !afdianOrderNumberPattern.MatchString(request.OutTradeNo) {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	order, err := model.GetAfdianOrder(request.OrderID)
	if err != nil {
		common.ApiErrorT(c, "Order verification failed")
		return
	}
	topUp := model.GetTopUpByTradeNo(request.OrderID)
	subOrder := model.GetSubscriptionOrderByTradeNo(request.OrderID)
	if (topUp == nil || topUp.UserId != c.GetInt("id")) && (subOrder == nil || subOrder.UserId != c.GetInt("id")) {
		common.ApiErrorT(c, "Order verification failed")
		return
	}
	config := setting.GetAfdianConfig()
	payment, err := service.QueryAfdianOrder(c.Request.Context(), nil, config, request.OutTradeNo)
	if err != nil || payment.CustomOrderID != order.TradeNo {
		common.ApiErrorT(c, "Order verification failed")
		return
	}
	if err := model.CompleteAfdianOrder(*payment, config.UserID, c.ClientIP()); err != nil {
		common.ApiErrorT(c, "Order verification failed")
		return
	}
	common.ApiSuccess(c, nil)
}

func GetAfdianPaymentStatus(c *gin.Context) {
	tradeNo := c.Param("order_id")
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp != nil && topUp.UserId == c.GetInt("id") && topUp.PaymentProvider == model.PaymentProviderAfdian {
		common.ApiSuccess(c, gin.H{"status": topUp.Status})
		return
	}
	order := model.GetSubscriptionOrderByTradeNo(tradeNo)
	if order != nil && order.UserId == c.GetInt("id") && order.PaymentProvider == model.PaymentProviderAfdian {
		common.ApiSuccess(c, gin.H{"status": order.Status})
		return
	}
	common.ApiErrorT(c, "Order verification failed")
}
