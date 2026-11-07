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
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { toIntlLocale } from '@/i18n/languages'
import { formatLocalCurrencyAmount } from '@/lib/currency'
import { formatQuota } from '@/lib/format'

import { createAfdianCheckout, type AfdianProduct } from '../afdian-api'

interface AfdianPayButtonProps {
  product: AfdianProduct
  disabled?: boolean
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
        onClick={() => {
          checkout.reset()
          setOpen(true)
        }}
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
              'After payment, Afdian sends a redemption code by private message. Paste it into the redemption field in your wallet to add credit.'
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
              <p role='status' className='text-muted-foreground text-sm'>
                {t(
                  'Check your Afdian private messages after payment, then redeem the code in your wallet.'
                )}
              </p>
            </>
          )}
        </div>
      </Dialog>
    </>
  )
}

export function AfdianProductsSection(props: { products: AfdianProduct[] }) {
  const { t } = useTranslation()
  const products = props.products
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
            <AfdianPayButton product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
