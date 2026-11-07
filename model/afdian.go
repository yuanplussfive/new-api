package model

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// AfdianOrder stores immutable checkout terms. Nullable external IDs allow
// multiple unpaid orders while the unique index prevents payment reuse.
type AfdianOrder struct {
	TradeNo         string  `gorm:"primaryKey;type:varchar(64)"`
	ProviderOrderID *string `gorm:"uniqueIndex;type:varchar(64)"`
	CreatorID       string  `gorm:"type:varchar(32)"`
	PlanID          string  `gorm:"type:varchar(32)"`
	MoneyCents      int64
	PlanSnapshot    string `gorm:"type:text"`
}

// AfdianPayment is populated exclusively by the authenticated Open API query.
type AfdianPayment struct {
	OutTradeNo    string `json:"out_trade_no"`
	CustomOrderID string `json:"custom_order_id"`
	PlanID        string `json:"plan_id"`
	TotalAmount   string `json:"total_amount"`
	Status        int    `json:"status"`
	Month         int    `json:"month"`
	ProductType   int    `json:"product_type"`
	RedeemID      string `json:"redeem_id"`
}

var ErrAfdianPaymentMismatch = errors.New("Afdian payment does not match checkout")

func CreateAfdianOrder(userID int, tradeNo, creatorID string, product setting.AfdianProduct, plan *SubscriptionPlan) error {
	if product.DeliveryMode == setting.AfdianDeliveryRedemption {
		return ErrAfdianPaymentMismatch
	}
	if err := setting.ValidateAfdianConfig(setting.AfdianConfig{Products: []setting.AfdianProduct{product}}); err != nil {
		return err
	}
	if userID <= 0 || len(tradeNo) == 0 || len(tradeNo) > 64 || (plan == nil && product.SubscriptionPlanID != 0) || (plan != nil && plan.Id != product.SubscriptionPlanID) {
		return ErrAfdianPaymentMismatch
	}
	price, err := decimal.NewFromString(product.Price)
	if err != nil || !price.IsPositive() || !price.Mul(decimal.NewFromInt(100)).IsInteger() {
		return ErrAfdianPaymentMismatch
	}
	order := AfdianOrder{TradeNo: tradeNo, CreatorID: creatorID, PlanID: product.PlanID, MoneyCents: price.Mul(decimal.NewFromInt(100)).IntPart()}
	if plan != nil {
		snapshot, err := common.Marshal(plan)
		if err != nil {
			return err
		}
		order.PlanSnapshot = string(snapshot)
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		money, _ := price.Float64()
		if plan != nil {
			return tx.Create(&SubscriptionOrder{UserId: userID, PlanId: plan.Id, Money: money, TradeNo: tradeNo,
				PaymentMethod: PaymentMethodAfdian, PaymentProvider: PaymentProviderAfdian,
				CreateTime: common.GetTimestamp(), Status: common.TopUpStatusPending}).Error
		}
		return tx.Create(&TopUp{UserId: userID, Amount: product.Quota, Money: money, TradeNo: tradeNo,
			PaymentMethod: PaymentMethodAfdian, PaymentProvider: PaymentProviderAfdian,
			CreateTime: common.GetTimestamp(), Status: common.TopUpStatusPending}).Error
	})
}

func GetAfdianOrder(tradeNo string) (*AfdianOrder, error) {
	var order AfdianOrder
	err := DB.Where("trade_no = ?", tradeNo).First(&order).Error
	return &order, err
}

// A plan with direct-payment history must not also distribute wallet codes:
// an outstanding checkout could otherwise receive both kinds of credit.
func AfdianPlanHasDirectOrders(creatorID, planID string) (bool, error) {
	var count int64
	err := DB.Model(&AfdianOrder{}).Where("creator_id = ? AND plan_id = ?", creatorID, planID).Count(&count).Error
	return count > 0, err
}

// CompleteAfdianOrder atomically binds the external payment and grants exactly
// one wallet credit or subscription, even across multiple gateway instances.
func CompleteAfdianOrder(payment AfdianPayment, creatorID, callerIP string) error {
	if payment.OutTradeNo == "" || len(payment.OutTradeNo) > 64 || payment.CustomOrderID == "" || payment.Status != 2 || payment.Month != 1 || payment.ProductType != 0 || payment.RedeemID != "" {
		return ErrAfdianPaymentMismatch
	}
	paid, err := decimal.NewFromString(payment.TotalAmount)
	if err != nil || !paid.IsPositive() {
		return ErrAfdianPaymentMismatch
	}
	var creditedQuota, userID int
	var subscriptionTitle string
	var moneyCents int64
	var groupChanged bool
	err = DB.Transaction(func(tx *gorm.DB) error {
		var order AfdianOrder
		if err := lockForUpdate(tx).Where("trade_no = ?", payment.CustomOrderID).First(&order).Error; err != nil {
			return err
		}
		if order.CreatorID != creatorID || order.PlanID != payment.PlanID || !paid.Equal(decimal.NewFromInt(order.MoneyCents).Div(decimal.NewFromInt(100))) {
			return ErrAfdianPaymentMismatch
		}
		if order.ProviderOrderID != nil {
			if *order.ProviderOrderID != payment.OutTradeNo {
				return ErrAfdianPaymentMismatch
			}
			return nil
		}
		// This write participates in the fulfillment transaction: an error or a
		// wallet ceiling rejection leaves the payment available for a retry.
		if err := tx.Model(&order).Update("provider_order_id", payment.OutTradeNo).Error; err != nil {
			return err
		}
		moneyCents = order.MoneyCents
		if order.PlanSnapshot != "" {
			var subOrder SubscriptionOrder
			if err := lockForUpdate(tx).Where("trade_no = ?", order.TradeNo).First(&subOrder).Error; err != nil {
				return err
			}
			if subOrder.PaymentProvider != PaymentProviderAfdian || subOrder.Status != common.TopUpStatusPending {
				return ErrPaymentMethodMismatch
			}
			var plan SubscriptionPlan
			if err := common.UnmarshalJsonStr(order.PlanSnapshot, &plan); err != nil {
				return err
			}
			var user User
			if err := lockForUpdate(tx).Select("id").Where("id = ?", subOrder.UserId).First(&user).Error; err != nil {
				return err
			}
			subscription, err := CreateUserSubscriptionFromPlanTx(tx, subOrder.UserId, &plan, "order")
			if err != nil {
				return err
			}
			if err := upsertSubscriptionTopUpTx(tx, &subOrder); err != nil {
				return err
			}
			if err := tx.Model(&TopUp{}).Where("trade_no = ?", order.TradeNo).Update("payment_provider", PaymentProviderAfdian).Error; err != nil {
				return err
			}
			subOrder.Status = common.TopUpStatusSuccess
			subOrder.CompleteTime = common.GetTimestamp()
			if err := tx.Save(&subOrder).Error; err != nil {
				return err
			}
			userID, subscriptionTitle = subOrder.UserId, plan.Title
			groupChanged = subscription.PrevUserGroup != ""
			return nil
		}
		var topUp TopUp
		if err := lockForUpdate(tx).Where("trade_no = ?", order.TradeNo).First(&topUp).Error; err != nil {
			return err
		}
		if topUp.PaymentProvider != PaymentProviderAfdian || topUp.Status != common.TopUpStatusPending {
			return ErrPaymentMethodMismatch
		}
		quota, err := common.WalletQuotaFromDecimalStrict(decimal.NewFromInt(topUp.Amount))
		if err != nil || quota <= 0 {
			return ErrInvalidTopUpQuota
		}
		if err := creditTopUpQuota(tx, topUp.UserId, quota, nil); err != nil {
			return err
		}
		topUp.Status, topUp.CompleteTime = common.TopUpStatusSuccess, common.GetTimestamp()
		if err := tx.Save(&topUp).Error; err != nil {
			return err
		}
		userID, creditedQuota = topUp.UserId, quota
		return nil
	})
	if err != nil || userID == 0 {
		return err
	}
	if creditedQuota > 0 {
		syncCreditUserQuotaCache(userID, creditedQuota, "Afdian top-up")
		RecordTopupLog(userID, common.NewMessage("{{provider}} top-up succeeded, amount added: {{quota}}, payment amount: {{amount}}", map[string]any{
			"provider": "Afdian", "quota": creditedQuota, "amount": decimal.NewFromInt(moneyCents).Div(decimal.NewFromInt(100)).StringFixed(2) + " CNY",
		}), callerIP, PaymentMethodAfdian, PaymentProviderAfdian)
	} else {
		if groupChanged {
			refreshSubscriptionUserGroupCache(userID, "Afdian subscription")
		}
		RecordLog(userID, LogTypeTopup, common.NewMessage("Subscription purchased, plan: {{plan}}, payment amount: {{amount}}, payment method: {{method}}", map[string]any{
			"plan": subscriptionTitle, "amount": fmt.Sprintf("%.2f CNY", float64(moneyCents)/100), "method": PaymentMethodAfdian,
		}))
	}
	return nil
}
