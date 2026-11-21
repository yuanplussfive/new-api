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
      className='profile-reward-draw'
    >
      <div aria-hidden='true' className='profile-reward-reels'>
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
            target = (cycles * rewards.length + winner) * -48
            transition = {
              duration: 1.2 + reel * 0.25,
              ease: [0.12, 0.7, 0.15, 1],
            }
          } else if (!reducedMotion && props.pending) {
            target = rewards.length * -48
            transition = {
              duration: 0.5 + reel * 0.1,
              repeat: Infinity,
              ease: 'linear',
            }
          } else if (reducedMotion) {
            target = winner * -48
          }
          return (
            <div key={reel} className='profile-reward-reel'>
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
                  <div key={id} className='profile-reward-item'>
                    <span className='profile-reward-name'>{reward.name}</span>
                    <span className='profile-reward-value'>
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
      <p role='status' aria-live='polite' className='profile-reward-status'>
        {status}
      </p>
      <ul className='profile-reward-tiers'>
        {tiers.map(({ reward, id }) => (
          <li key={id} className='profile-reward-tier'>
            <span className='profile-reward-tier-name' title={reward.name}>
              {reward.name} ·{' '}
              {formatQuotaWithCurrency(reward.quota, { abbreviate: false })}
            </span>
            <span className='profile-reward-tier-probability'>
              {formatCheckinProbability(reward.weight, totalWeight, locale)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
