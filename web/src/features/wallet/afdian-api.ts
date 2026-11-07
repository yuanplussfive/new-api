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
import { t } from 'i18next'

import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

export interface AfdianProduct {
  plan_id: string
  name: string
  price: string
  quota: number
  subscription_plan_id: number
  delivery_mode?: 'direct' | 'redemption'
}

export type AfdianCheckout =
  | { order_id: string; checkout_url: string; delivery_mode?: 'direct' }
  | { order_id?: never; checkout_url: string; delivery_mode: 'redemption' }

export async function getAfdianPaymentStatus(orderID: string): Promise<string> {
  const response = await api.get(
    `/api/user/afdian/orders/${encodeURIComponent(orderID)}`
  )
  return requireServerSuccess(response.data).data.status
}

export async function createAfdianCheckout(
  planID: string
): Promise<AfdianCheckout> {
  const response = await api.post('/api/user/afdian/pay', { plan_id: planID })
  const result = requireServerSuccess(response.data)
  const checkout = result.data as AfdianCheckout
  const url = new URL(checkout.checkout_url)
  if (url.origin !== 'https://afdian.com' || url.pathname !== '/order/create') {
    throw new Error(t('Failed to start payment'))
  }
  if (
    checkout.delivery_mode !== 'redemption' &&
    (typeof checkout.order_id !== 'string' || !checkout.order_id)
  ) {
    throw new Error(t('Failed to start payment'))
  }
  return checkout
}

export async function checkAfdianPayment(
  orderID: string,
  outTradeNo: string
): Promise<void> {
  const response = await api.post('/api/user/afdian/check', {
    order_id: orderID,
    out_trade_no: outTradeNo,
  })
  requireServerSuccess(response.data)
}
