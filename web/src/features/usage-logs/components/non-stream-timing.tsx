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
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/i18n/languages'

import { formatTimingMilliseconds } from '../lib/timing'

interface NonStreamTimingProps {
  totalMs: number
  upstreamWaitMs?: number | null
}

export function NonStreamTiming(props: NonStreamTimingProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const total = props.totalMs
  if (!Number.isFinite(total) || total <= 0) return null
  const upstreamWait =
    props.upstreamWaitMs != null &&
    props.upstreamWaitMs > 0 &&
    props.upstreamWaitMs < total
      ? props.upstreamWaitMs
      : null
  const transfer = upstreamWait == null ? total : total - upstreamWait

  return (
    <div
      role='group'
      aria-label={t('Transport timing')}
      className='min-w-0 space-y-2 text-xs'
    >
      <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
        <span className='text-content-secondary'>{t('Duration')}</span>
        <span className='font-mono tabular-nums'>
          {formatTimingMilliseconds(total, locale)}
        </span>
      </div>
      <div className='bg-line-subtle relative flex h-1.5 w-full overflow-hidden'>
        {upstreamWait == null ? (
          <span className='bg-content-secondary/60 h-full w-full' />
        ) : (
          <>
            <span
              className='bg-content-secondary/60 h-full'
              style={{ width: `${(upstreamWait / total) * 100}%` }}
            />
            <span
              className='bg-info h-full'
              style={{ width: `${(transfer / total) * 100}%` }}
            />
          </>
        )}
      </div>
      {upstreamWait != null && (
        <div className='text-content-muted flex flex-wrap justify-between gap-x-4 gap-y-1 text-[10px]'>
          <span>
            {t('Upstream wait')}{' '}
            <span className='font-mono tabular-nums'>
              {formatTimingMilliseconds(upstreamWait, locale)}
            </span>
          </span>
          <span>
            {t('Response transfer')}{' '}
            <span className='font-mono tabular-nums'>
              {formatTimingMilliseconds(transfer, locale)}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
