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
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { createRedemption } from '@/features/redemption-codes/api'
import {
  RedemptionsExportDialog,
  type RedemptionExportData,
} from '@/features/redemption-codes/components/redemptions-export-dialog'
import type { AfdianProduct } from '@/features/wallet/afdian-api'
import { toIntlLocale } from '@/i18n/languages'
import {
  formatLocalCurrencyAmount,
  formatQuotaWithCurrency,
} from '@/lib/currency'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'

export function AfdianCodeDelivery(props: {
  products: AfdianProduct[]
  disabled: boolean
  unsaved: boolean
  onDeliveryModeChange: (planID: string, mode: 'direct' | 'redemption') => void
}) {
  const { t, i18n } = useTranslation()
  const id = useId()
  const [count, setCount] = useState('10')
  const [created, setCreated] = useState<RedemptionExportData | null>(null)
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const quantity = Number(count)
  const validCount =
    Number.isInteger(quantity) && quantity >= 1 && quantity <= 100
  const generate = useMutation({
    mutationFn: async (product: AfdianProduct) => {
      const result = await createRedemption({
        name: [...`Afdian ${product.name}`].slice(0, 20).join(''),
        quota: product.quota,
        count: quantity,
        expired_time: 0,
      })
      // The existing batch API can return already-created codes on a partial
      // failure. Preserve that inventory instead of hiding it behind an error.
      if (!result.data?.length) requireServerSuccess(result)
      return { result, product }
    },
    onSuccess: ({ result, product }) => {
      if (result.data?.length) {
        setCreated({
          keys: result.data,
          name: product.name,
          quota: formatQuotaWithCurrency(product.quota, { abbreviate: false }),
        })
      }
      if (!result.success) {
        handleServerError(result)
        return
      }
      toast.success(
        t('Successfully created {{count}} redemption codes', {
          count: result.data?.length ?? 0,
        })
      )
    },
  })
  if (props.products.length === 0) return null
  const instructions = t(
    'After payment, copy the code from this message and redeem it at {{url}}.',
    { url: `${window.location.origin}/wallet` }
  )

  return (
    <section
      aria-label={t('Afdian delivery and code inventory')}
      className='space-y-4 rounded-lg border p-4'
    >
      <h4 className='font-medium'>{t('Afdian delivery and code inventory')}</h4>
      <p className='text-muted-foreground text-sm'>
        {t(
          'Use a separate Afdian plan for redemption code delivery to avoid duplicate credit'
        )}
      </p>
      <div className='space-y-2'>
        <Label htmlFor={`${id}-count`}>{t('Codes per batch')}</Label>
        <Input
          id={`${id}-count`}
          type='number'
          min={1}
          max={100}
          step={1}
          value={count}
          onChange={(event) => setCount(event.target.value)}
          aria-invalid={!validCount}
          className='max-w-40'
        />
      </div>
      {props.unsaved && (
        <p role='status' className='text-muted-foreground text-sm'>
          {t('Save product settings before generating codes.')}
        </p>
      )}
      {props.products.map((product) => (
        <div key={product.plan_id} className='space-y-3 rounded-lg border p-3'>
          <div className='space-y-1'>
            <p className='font-medium break-words'>{product.name}</p>
            <p className='text-muted-foreground text-sm'>
              {formatLocalCurrencyAmount(Number(product.price), {
                showSymbol: false,
                digitsLarge: 2,
                locale,
              })}{' '}
              CNY
              {!product.subscription_plan_id && (
                <>
                  {' '}
                  ·{' '}
                  {t('Credit {{amount}}', {
                    amount: formatQuotaWithCurrency(product.quota, {
                      abbreviate: false,
                    }),
                  })}
                </>
              )}
            </p>
          </div>
          <NativeSelect
            aria-label={t('Delivery method for {{name}}', {
              name: product.name,
            })}
            value={product.delivery_mode ?? 'direct'}
            disabled={props.disabled || generate.isPending}
            onChange={(event) => {
              const mode = event.target.value
              if (mode === 'direct' || mode === 'redemption') {
                props.onDeliveryModeChange(product.plan_id, mode)
              }
            }}
          >
            <NativeSelectOption value='direct'>
              {t('Automatic credit after verification')}
            </NativeSelectOption>
            <NativeSelectOption
              value='redemption'
              disabled={Boolean(product.subscription_plan_id)}
            >
              {t('Redemption code by Afdian private message')}
            </NativeSelectOption>
          </NativeSelect>
          {product.delivery_mode === 'redemption' && (
            <Button
              type='button'
              disabled={
                props.disabled ||
                props.unsaved ||
                generate.isPending ||
                !validCount ||
                created !== null
              }
              onClick={() => generate.mutate(product)}
            >
              {generate.isPending &&
              generate.variables?.plan_id === product.plan_id
                ? t('Generating...')
                : t('Generate delivery codes')}
            </Button>
          )}
        </div>
      ))}
      <p className='text-muted-foreground text-sm'>
        {t(
          'Generate codes, then paste a fresh batch into the matching Afdian plan under Automatic random reply. Sent codes are removed by Afdian. Replenish the inventory before it runs out.'
        )}
      </p>
      <div className='space-y-2 text-sm'>
        <p>
          {t('Add these redemption instructions to the plan automatic reply:')}
        </p>
        <p className='text-muted-foreground break-words'>{instructions}</p>
        <CopyButton value={instructions} variant='outline' size='sm'>
          {t('Copy instructions')}
        </CopyButton>
      </div>
      {created && (
        <RedemptionsExportDialog
          data={created}
          defaultFormat='codes'
          onClose={() => setCreated(null)}
        />
      )}
    </section>
  )
}
