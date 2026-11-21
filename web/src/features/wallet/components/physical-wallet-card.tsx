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
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks'
import { formatQuota } from '@/lib/format'
import { useSystemConfigStore } from '@/stores/system-config-store'

import type { UserWalletData } from '../types'

interface PhysicalWalletCardProps {
  user: UserWalletData | null
  loading?: boolean
}

/** A single, correctly proportioned physical card. Pointer motion uses CSS
 * custom properties through a ref, so hovering never re-renders React. */
export function PhysicalWalletCard(props: PhysicalWalletCardProps) {
  const { t } = useTranslation()
  const configuredName = useSystemConfigStore(
    (state) => state.config.systemName
  )
  const systemName =
    !configuredName || configuredName === 'New API'
      ? 'SenerAPI'
      : configuredName
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const frameRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [flipped, setFlipped] = useState(false)
  const accountId = String(props.user?.id ?? 0)

  useEffect(
    () => () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
      }
    },
    []
  )

  const setTilt = (x: number, y: number) => {
    const frame = frameRef.current
    if (!frame) return
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current)
    }
    animationRef.current = window.requestAnimationFrame(() => {
      frame.style.setProperty('--card-tilt-x', `${x.toFixed(2)}deg`)
      frame.style.setProperty('--card-tilt-y', `${y.toFixed(2)}deg`)
    })
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduceMotion || !finePointer || event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    event.currentTarget.style.setProperty('--light-x', `${(x + 0.5) * 100}%`)
    event.currentTarget.style.setProperty('--light-y', `${(y + 0.5) * 100}%`)
    setTilt(y * -5, x * 7)
  }

  if (props.loading) {
    return <Skeleton className='physical-card-frame w-full' />
  }

  return (
    <div
      className='physical-card-frame group/card w-full'
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt(0, 0)}
      ref={frameRef}
    >
      <div className='physical-card-shadow' aria-hidden='true' />
      <div
        className='physical-card-tilt'
        style={{
          transform: `rotateX(var(--card-tilt-x)) rotateY(calc(var(--card-tilt-y) + ${flipped ? '180deg' : '0deg'}))`,
        }}
      >
        <div className='physical-card-face physical-card-front'>
          <div className='physical-card-grain' aria-hidden='true' />
          <div className='physical-card-light' aria-hidden='true' />

          <div className='flex items-start justify-between gap-4'>
            <span className='physical-card-brand'>{systemName}</span>
            <span className='physical-card-contactless' aria-hidden='true'>
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>

          <div className='physical-card-chip' aria-hidden='true'>
            <span />
          </div>

          <div className='physical-card-balance-block'>
            <p className='physical-card-label'>{t('Current Balance')}</p>
            <p className='physical-card-balance'>
              {formatQuota(props.user?.quota ?? 0)}
            </p>
            <p className='physical-card-number'>
              •••• •••• •••• {accountId.padStart(4, '0').slice(-4)}
            </p>
            <div className='physical-card-holder flex items-end justify-between gap-4'>
              <div className='min-w-0'>
                <p className='physical-card-label'>{t('Card holder')}</p>
                <p className='physical-card-emboss truncate'>
                  {props.user?.username || '—'}
                </p>
              </div>
              <div className='shrink-0'>
                <p className='physical-card-label'>{t('User ID')}</p>
                <p className='physical-card-emboss text-right'>{accountId}</p>
              </div>
            </div>
          </div>

          <span className='physical-card-network'>DEBIT</span>
        </div>

        <div className='physical-card-face physical-card-back'>
          <div className='physical-card-stripe' aria-hidden='true' />
          <div className='physical-card-back-content'>
            <p className='physical-card-label'>{t('Account overview')}</p>
            <dl className='mt-4 grid grid-cols-2 gap-x-5 gap-y-4'>
              <div>
                <dt className='physical-card-label'>{t('Total Usage')}</dt>
                <dd className='physical-card-back-value'>
                  {formatQuota(props.user?.used_quota ?? 0)}
                </dd>
              </div>
              <div>
                <dt className='physical-card-label'>{t('API Requests')}</dt>
                <dd className='physical-card-back-value'>
                  {props.user?.request_count ?? 0}
                </dd>
              </div>
              <div>
                <dt className='physical-card-label'>{t('Pending')}</dt>
                <dd className='physical-card-back-value'>
                  {formatQuota(props.user?.aff_quota ?? 0)}
                </dd>
              </div>
              <div>
                <dt className='physical-card-label'>{t('Total Earned')}</dt>
                <dd className='physical-card-back-value'>
                  {formatQuota(props.user?.aff_history_quota ?? 0)}
                </dd>
              </div>
            </dl>
            <div className='physical-card-signature'>
              <span>{props.user?.username || '—'}</span>
              <span>{accountId}</span>
            </div>
          </div>
        </div>
      </div>
      <button
        type='button'
        className='physical-card-hit-area'
        aria-pressed={flipped}
        aria-label={t('Flip the card to see the account overview')}
        onClick={() => setFlipped((value) => !value)}
      />
    </div>
  )
}
