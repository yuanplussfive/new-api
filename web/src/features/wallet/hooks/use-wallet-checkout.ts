/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useRef, useState } from 'react'

import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'

import { DEFAULT_DISCOUNT_RATE, PAYMENT_TYPES } from '../constants'
import {
  dispatchSelectedPayment,
  getDefaultPaymentType,
  getMinTopupAmount,
} from '../lib'
import type {
  CreemProduct,
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  WaffoPayMethod,
} from '../types'
import { useCreemPayment } from './use-creem-payment'
import { usePayment } from './use-payment'
import { useWaffoPancakePayment } from './use-waffo-pancake-payment'
import { useWaffoPayment } from './use-waffo-payment'

export function useWalletCheckout(
  topupInfo: TopupInfo | null,
  onSuccess: () => Promise<void>
) {
  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const payment = usePayment()
  const creem = useCreemPayment()
  const waffo = useWaffoPayment()
  const pancake = useWaffoPancakePayment()
  const [amount, setAmount] = useState(0)
  const [preset, setPreset] = useState<number | null>(null)
  const [method, setMethod] = useState<PaymentMethod>()
  const [waffoIndex, setWaffoIndex] = useState<number | null>(null)
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [creemOpen, setCreemOpen] = useState(false)
  const [creemProduct, setCreemProduct] = useState<CreemProduct | null>(null)
  const initialized = useRef(false)
  const { calculatePaymentAmount } = payment
  const exchangeRate =
    currency?.quotaDisplayType === 'USD' ? 1 : currency?.usdExchangeRate || 1

  useEffect(() => {
    if (!topupInfo || initialized.current) return
    initialized.current = true
    const minimum = getMinTopupAmount(topupInfo)
    setAmount(minimum)
    void calculatePaymentAmount(minimum, getDefaultPaymentType(topupInfo))
  }, [topupInfo, calculatePaymentAmount])

  const selectPreset = (value: PresetAmount) => {
    setAmount(value.value)
    setPreset(value.value)
    void calculatePaymentAmount(
      value.value,
      method?.type || getDefaultPaymentType(topupInfo)
    )
  }
  const changeAmount = (value: number) => {
    setAmount(value)
    setPreset(null)
    void calculatePaymentAmount(
      value,
      method?.type || getDefaultPaymentType(topupInfo)
    )
  }
  const selectMethod = async (value: PaymentMethod) => {
    setMethod(value)
    setWaffoIndex(null)
    setLoadingMethod(value.type)
    try {
      if (amount < getMinTopupAmount(topupInfo)) return
      await calculatePaymentAmount(amount, value.type)
      setConfirmOpen(true)
    } finally {
      setLoadingMethod(null)
    }
  }
  const selectWaffo = async (value: WaffoPayMethod, index: number) => {
    setMethod({ name: value.name, type: PAYMENT_TYPES.WAFFO, icon: value.icon })
    setWaffoIndex(index)
    setLoadingMethod(`waffo-${index}`)
    try {
      await calculatePaymentAmount(amount, PAYMENT_TYPES.WAFFO)
      setConfirmOpen(true)
    } finally {
      setLoadingMethod(null)
    }
  }
  const confirmPayment = async () => {
    if (!method) return
    const success = await dispatchSelectedPayment(method, amount, waffoIndex, {
      regular: payment.processPayment,
      waffo: waffo.processWaffoPayment,
      waffoPancake: pancake.processWaffoPancakePayment,
    })
    if (success) {
      setConfirmOpen(false)
      await onSuccess()
    }
  }
  const confirmCreem = async () => {
    if (!creemProduct) return
    if (await creem.processCreemPayment(creemProduct.productId)) {
      setCreemOpen(false)
      setCreemProduct(null)
      await onSuccess()
    }
  }
  const selectCreem = (value: CreemProduct) => {
    setCreemProduct(value)
    setCreemOpen(true)
  }

  return {
    formProps: {
      selectedPreset: preset,
      onSelectPreset: selectPreset,
      topupAmount: amount,
      onTopupAmountChange: changeAmount,
      paymentAmount: payment.amount,
      calculating: payment.calculating,
      onPaymentMethodSelect: selectMethod,
      paymentLoading: loadingMethod,
      priceRatio: (status?.price as number) || 1,
      usdExchangeRate: exchangeRate,
      creemProducts: topupInfo?.creem_products,
      enableCreemTopup: topupInfo?.enable_creem_topup,
      onCreemProductSelect: selectCreem,
      enableWaffoTopup: topupInfo?.enable_waffo_topup,
      waffoPayMethods: topupInfo?.waffo_pay_methods,
      waffoMinTopup: topupInfo?.waffo_min_topup,
      onWaffoMethodSelect: selectWaffo,
      enableWaffoPancakeTopup: topupInfo?.enable_waffo_pancake_topup,
    },
    confirmProps: {
      open: confirmOpen,
      onOpenChange: setConfirmOpen,
      onConfirm: confirmPayment,
      topupAmount: amount,
      paymentAmount: payment.amount,
      paymentMethod: method,
      calculating: payment.calculating,
      processing: payment.processing || waffo.processing || pancake.processing,
      discountRate: topupInfo?.discount?.[amount] || DEFAULT_DISCOUNT_RATE,
      usdExchangeRate: exchangeRate,
    },
    creemProps: {
      open: creemOpen,
      onOpenChange: setCreemOpen,
      onConfirm: confirmCreem,
      product: creemProduct,
      processing: creem.processing,
    },
  }
}
