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
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { formatCheckinProbability } from '@/features/profile/lib/checkin-rewards'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency, getCurrencyLabel } from '@/lib/currency'
import {
  getEditableQuotaStep,
  parseQuotaFromDollars,
  quotaUnitsToDollars,
} from '@/lib/format'

import { DraftNumberInput } from '../models/draft-number-input'
import type { CheckinSettingsValues } from './checkin-settings-section'

interface PoolProps {
  groups: string[]
  disabled: boolean
}

export function CheckinPoolEditor(props: PoolProps) {
  const { t } = useTranslation()
  const form = useFormContext<CheckinSettingsValues>()
  useWatch({ control: form.control, name: 'pools' })
  const pools = form.getValues('pools')
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'pools',
  })
  const availableGroup = props.groups.find(
    (group) => !pools.some((pool) => pool.group === group)
  )
  return (
    <div className='flex flex-col gap-4'>
      {fields.length === 0 && (
        <EmptyState
          className='min-h-36'
          title={t('No groups are eligible until you add a reward pool.')}
          bordered
        />
      )}
      {fields.map((field, index) => {
        // Nested field arrays must remount when removing a group shifts their path.
        const fieldPath = `pools.${index}`
        return (
          <CheckinGroupPool
            key={`${field.id}:${fieldPath}`}
            index={index}
            groups={props.groups}
            disabled={props.disabled}
            onRemove={() => remove(index)}
          />
        )
      })}
      <Button
        type='button'
        variant='outline'
        disabled={props.disabled || fields.length >= 100 || !availableGroup}
        onClick={() => {
          if (!availableGroup) return
          append({
            group: availableGroup,
            rewards: [
              { name: t('Standard reward'), quota: 1000, weight: 80 },
              { name: t('Lucky reward'), quota: 5000, weight: 18 },
              { name: t('Jackpot'), quota: 50000, weight: 2 },
            ],
          })
        }}
      >
        {t('Add group reward pool')}
      </Button>
    </div>
  )
}

function CheckinGroupPool(
  props: PoolProps & { index: number; onRemove: () => void }
) {
  const { t, i18n } = useTranslation()
  const form = useFormContext<CheckinSettingsValues>()
  // A field-array append may precede the watch subscription after a path change.
  useWatch({ control: form.control, name: 'pools' })
  const pools = form.getValues('pools')
  const pool = pools[props.index]
  const name = `pools.${props.index}.rewards` as const
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  })
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const total = pool.rewards.reduce(
    (sum, reward) =>
      sum +
      (Number.isFinite(reward.weight) && reward.weight > 0 ? reward.weight : 0),
    0
  )
  let average = 0
  if (total > 0) {
    average = pool.rewards.reduce(
      (sum, reward) =>
        sum +
        (Number.isFinite(reward.quota) && reward.weight > 0
          ? (reward.quota * reward.weight) / total
          : 0),
      0
    )
  }
  const options = [...new Set([...props.groups, pool.group].filter(Boolean))]
    .filter(
      (group) =>
        group === pool.group || !pools.some((other) => other.group === group)
    )
    .map((group) => ({ value: group, label: group }))

  return (
    <fieldset
      disabled={props.disabled}
      aria-label={t('Reward pool {{index}}', { index: props.index + 1 })}
      className='flex min-w-0 flex-col gap-4 rounded-xl border p-4'
    >
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <FormField
          control={form.control}
          name={`pools.${props.index}.group`}
          render={({ field }) => (
            <FormItem className='min-w-0 flex-1 sm:max-w-72'>
              <FormLabel>{t('User group')}</FormLabel>
              <FormControl>
                <Combobox
                  {...field}
                  value={field.value}
                  options={options}
                  onValueChange={(value) => field.onChange(value ?? '')}
                  disabled={props.disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type='button'
          variant='outline'
          disabled={props.disabled}
          onClick={props.onRemove}
        >
          {t('Remove group')}
        </Button>
      </div>
      {fields.map((field, rewardIndex) => {
        const reward = pool.rewards[rewardIndex]
        return (
          <div
            key={field.id}
            className='bg-muted/40 grid items-start gap-3 rounded-lg p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto]'
          >
            <FormField
              control={form.control}
              name={`pools.${props.index}.rewards.${rewardIndex}.name`}
              render={({ field: input }) => (
                <FormItem>
                  <FormLabel>{t('Reward name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...input}
                      maxLength={50}
                      disabled={props.disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`pools.${props.index}.rewards.${rewardIndex}.quota`}
              render={({ field: input }) => (
                <FormItem>
                  <FormLabel>
                    {t('Reward amount ({{currency}})', {
                      currency: getCurrencyLabel(),
                    })}
                  </FormLabel>
                  <FormControl>
                    <DraftNumberInput
                      ref={input.ref}
                      name={input.name}
                      onBlur={input.onBlur}
                      min={0}
                      step={getEditableQuotaStep()}
                      value={quotaUnitsToDollars(input.value)}
                      onValueChange={(value) =>
                        input.onChange(parseQuotaFromDollars(value))
                      }
                      disabled={props.disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`pools.${props.index}.rewards.${rewardIndex}.weight`}
              render={({ field: input }) => (
                <FormItem>
                  <FormLabel>{t('Weight')}</FormLabel>
                  <FormControl>
                    <Input
                      {...input}
                      type='number'
                      min={1}
                      max={1000000}
                      step={1}
                      value={Number.isNaN(input.value) ? '' : input.value}
                      onChange={(event) =>
                        input.onChange(event.target.valueAsNumber)
                      }
                      disabled={props.disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex items-center justify-between gap-3 sm:col-span-2 xl:col-span-1 xl:pt-7'>
              <span className='text-sm tabular-nums'>
                {formatCheckinProbability(reward.weight, total, locale)}%
              </span>
              <Button
                type='button'
                variant='ghost'
                disabled={props.disabled || fields.length <= 1}
                onClick={() => remove(rewardIndex)}
              >
                {t('Remove tier')}
              </Button>
            </div>
          </div>
        )
      })}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Button
          type='button'
          variant='outline'
          disabled={props.disabled || fields.length >= 12}
          onClick={() =>
            append({ name: t('Reward tier'), quota: 1000, weight: 1 })
          }
        >
          {t('Add reward tier')}
        </Button>
        <p className='text-muted-foreground text-xs'>
          {t('Average reward per check-in: {{amount}}', {
            amount: formatQuotaWithCurrency(average, { abbreviate: false }),
          })}
        </p>
      </div>
    </fieldset>
  )
}
