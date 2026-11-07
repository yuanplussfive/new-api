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
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toIntlLocale } from '@/i18n/languages'
import { formatLocalCurrencyAmount } from '@/lib/currency'
import { formatQuota } from '@/lib/format'

import {
  createAfdianCheckout,
  checkAfdianPayment,
  getAfdianPaymentStatus,
  type AfdianProduct,
} from '../afdian-api'

interface AfdianPayButtonProps {
  product: AfdianProduct
  disabled?: boolean
  onPaid?: () => void | Promise<void>
}

export function AfdianPayButton(props: AfdianPayButtonProps) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const checkout = useMutation({
    mutationFn: () => createAfdianCheckout(props.product.plan_id),
  })
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  // The gateway always charges CNY, regardless of the wallet display currency.
  const price = `${formatLocalCurrencyAmount(Number(props.product.price), { showSymbol: false, digitsLarge: 2, locale })} CNY`

  return (
    <>
      <Button
        variant='outline'
        disabled={props.disabled}
        onClick={() => setOpen(true)}
      >
        {t('Afdian')} · {price}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={props.product.name}
        footer={
          <Button variant='outline' onClick={() => setOpen(false)}>
            {t('Close')}
          </Button>
        }
      >
        <div className='space-y-4'>
          <p>{t('Pay {{amount}}', { amount: price })}</p>
          <p className='text-muted-foreground text-sm'>
            {t(
              'Pay for one month of this Afdian plan. Keep the amount and plan unchanged. Your purchase is delivered after payment verification.'
            )}
          </p>
          {!checkout.data ? (
            <Button
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {t('Continue to payment')}
            </Button>
          ) : (
            <>
              <Button
                role='link'
                render={
                  <a
                    href={checkout.data.checkout_url}
                    target='_blank'
                    rel='noopener noreferrer'
                  />
                }
              >
                {t('Open Afdian checkout')}
              </Button>
              <div className='flex items-center gap-2 text-xs break-all'>
                <span>{checkout.data.order_id}</span>
                <CopyButton value={checkout.data.order_id} />
              </div>
              <AfdianOrderVerification
                key={checkout.data.order_id}
                orderID={checkout.data.order_id}
                onPaid={props.onPaid}
                onNewOrder={() => checkout.reset()}
              />
            </>
          )}
        </div>
      </Dialog>
    </>
  )
}

export function AfdianOrderVerification(props: {
  orderID: string
  onPaid?: () => void | Promise<void>
  onNewOrder?: () => void
}) {
  const { t } = useTranslation()
  const [outTradeNo, setOutTradeNo] = useState('')
  const notified = useRef(false)
  const verification = useMutation({
    mutationFn: () => checkAfdianPayment(props.orderID, outTradeNo.trim()),
  })
  const status = useQuery({
    queryKey: ['afdian-order', props.orderID],
    queryFn: () => getAfdianPaymentStatus(props.orderID),
    enabled: !verification.isSuccess,
    refetchInterval: (query) => (query.state.data === 'success' ? false : 5000),
  })
  const delivered = verification.isSuccess || status.data === 'success'
  const onPaid = props.onPaid
  useEffect(() => {
    if (delivered && !notified.current) {
      notified.current = true
      void onPaid?.()
    }
  }, [delivered, onPaid])
  if (delivered) {
    return (
      <div className='space-y-2'>
        <p role='status'>{t('Payment verified')}</p>
        {props.onNewOrder && (
          <Button onClick={props.onNewOrder}>
            {t('Create another order')}
          </Button>
        )}
      </div>
    )
  }
  return (
    <div className='space-y-2'>
      <Label htmlFor={`afdian-order-${props.orderID}`}>
        {t('Afdian order number')}
      </Label>
      <Input
        id={`afdian-order-${props.orderID}`}
        value={outTradeNo}
        maxLength={64}
        onChange={(event) => setOutTradeNo(event.target.value)}
      />
      <p className='text-muted-foreground text-xs'>
        {t(
          'Usually credited automatically. If it is delayed, enter the paid order number from Afdian to verify again.'
        )}
      </p>
      <Button
        disabled={!outTradeNo.trim() || verification.isPending}
        onClick={() => verification.mutate()}
      >
        {t('Verify payment')}
      </Button>
    </div>
  )
}

export function AfdianProductsSection(props: {
  products: AfdianProduct[]
  onPaid?: () => void | Promise<void>
}) {
  const { t } = useTranslation()
  const products = props.products.filter(
    (product) => !product.subscription_plan_id
  )
  if (products.length === 0) return null
  return (
    <section aria-label={t('Afdian')} className='space-y-3 border-t pt-4'>
      <h3 className='font-medium'>{t('Afdian')}</h3>
      <p className='text-muted-foreground text-sm'>
        {t('Fixed CNY payment plans')}
      </p>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {products.map((product) => (
          <div
            key={product.plan_id}
            className='min-w-0 space-y-3 rounded-lg border p-4'
          >
            <p className='font-medium break-words'>{product.name}</p>
            <p>
              {t('Credit {{amount}}', { amount: formatQuota(product.quota) })}
            </p>
            <AfdianPayButton product={product} onPaid={props.onPaid} />
          </div>
        ))}
      </div>
    </section>
  )
}
