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
import { motion, type Transition } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useMediaQuery } from '@/hooks/use-media-query'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'

import { formatCheckinProbability } from '../lib/checkin-rewards'
import type { CheckinResponse, CheckinReward } from '../types'

interface CheckinSlotMachineProps {
  rewards: CheckinReward[]
  pending: boolean
  revealing: boolean
  result: CheckinResponse | null
  checkedIn: boolean
  onReveal: () => void
}

export function CheckinSlotMachine(props: CheckinSlotMachineProps) {
  const { t, i18n } = useTranslation()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const rewards = props.result?.reward_tiers ?? props.rewards
  const totalWeight = rewards.reduce((sum, reward) => sum + reward.weight, 0)
  const winner = props.result?.reward_tier_index ?? 0
  const selected = props.result?.reward_tiers[winner]
  const drawing = props.pending || props.revealing
  const occurrences = new Map<string, number>()
  const tiers = rewards.map((reward) => {
    const signature = JSON.stringify(reward)
    const occurrence = occurrences.get(signature) ?? 0
    occurrences.set(signature, occurrence + 1)
    return { reward, id: `${signature}:${occurrence}` }
  })
  const { result, revealing, onReveal } = props

  useEffect(() => {
    if (reducedMotion && result && revealing) onReveal()
  }, [reducedMotion, result, revealing, onReveal])

  if (rewards.length === 0) return null

  let status = t('Spin to reveal your daily reward')
  if (drawing) {
    status = t('Drawing your reward...')
  } else if (selected) {
    status = t('You received {{reward}}: {{amount}}', {
      reward: selected.name,
      amount: formatQuotaWithCurrency(props.result?.quota_awarded, {
        abbreviate: false,
      }),
    })
  } else if (props.checkedIn) {
    status = t('Checked in')
  }

  return (
    <section
      aria-label={t('Daily reward draw')}
      aria-busy={drawing}
      className='from-primary/5 via-background to-muted/50 flex flex-col gap-4 border-b bg-gradient-to-br p-4 sm:p-6'
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h4 className='text-sm font-semibold'>{t('Daily reward draw')}</h4>
        <span className='text-muted-foreground text-xs'>
          {t('One free draw per day')}
        </span>
      </div>
      <div
        aria-hidden='true'
        className='border-primary/20 bg-background/80 grid grid-cols-3 gap-2 rounded-2xl border p-3 shadow-inner'
      >
        {[0, 1, 2].map((reel) => {
          const cycles = props.result ? 4 + reel : 1
          const items = Array.from(
            { length: reducedMotion ? 1 : cycles + 1 },
            (_, cycle) =>
              tiers.map((tier) => ({ ...tier, id: `${cycle}:${tier.id}` }))
          ).flat()
          let target = 0
          let transition: Transition = { duration: 0 }
          if (!reducedMotion && props.result) {
            target = (cycles * rewards.length + winner) * -64
            transition = {
              duration: 1.2 + reel * 0.25,
              ease: [0.12, 0.7, 0.15, 1],
            }
          } else if (!reducedMotion && props.pending) {
            target = rewards.length * -64
            transition = {
              duration: 0.5 + reel * 0.1,
              repeat: Infinity,
              ease: 'linear',
            }
          } else if (reducedMotion) {
            target = winner * -64
          }
          return (
            <div
              key={reel}
              className='bg-card h-16 min-w-0 overflow-hidden rounded-xl border'
            >
              <motion.div
                key={props.result?.checkin_date ?? String(props.pending)}
                initial={{ y: 0 }}
                animate={{ y: target }}
                transition={transition}
                onAnimationComplete={() => {
                  if (
                    reel === 2 &&
                    props.result &&
                    props.revealing &&
                    !reducedMotion
                  ) {
                    props.onReveal()
                  }
                }}
              >
                {items.map(({ reward, id }) => (
                  <div
                    key={id}
                    className='flex h-16 flex-col items-center justify-center gap-1 px-2 text-center'
                  >
                    <span className='max-w-full truncate text-xs font-medium'>
                      {reward.name}
                    </span>
                    <span className='text-primary max-w-full truncate text-sm font-bold tabular-nums'>
                      {formatQuotaWithCurrency(reward.quota, {
                        abbreviate: false,
                      })}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>
          )
        })}
      </div>
      <p
        role='status'
        aria-live='polite'
        className='text-center text-sm font-medium'
      >
        {status}
      </p>
      <div className='grid gap-2 sm:grid-cols-2'>
        {tiers.map(({ reward, id }) => (
          <div
            key={id}
            className='bg-card/70 flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs'
          >
            <div className='min-w-0'>
              <p className='truncate font-medium' title={reward.name}>
                {reward.name}
              </p>
              <p className='text-muted-foreground'>
                {formatQuotaWithCurrency(reward.quota, { abbreviate: false })}
              </p>
            </div>
            <span className='shrink-0 tabular-nums'>
              {formatCheckinProbability(reward.weight, totalWeight, locale)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
