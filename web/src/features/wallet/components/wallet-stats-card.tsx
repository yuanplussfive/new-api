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

import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
  /** Rail placement: stack the metrics so long values keep their width. */
  vertical?: boolean
}

/**
 * Flat balance strip: one dominant figure, secondary facts in a dense row.
 * No panel, no radius — it reads like a terminal status line.
 */
export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()

  if (props.loading) {
    return (
      <div
        className='flex flex-wrap items-end gap-x-12 gap-y-6 py-5'
        aria-busy='true'
      >
        <div>
          <Skeleton className='h-3 w-16' />
          <Skeleton className='mt-3 h-9 w-40' />
        </div>
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <Skeleton className='h-3 w-14' />
            <Skeleton className='mt-2 h-5 w-24' />
          </div>
        ))}
      </div>
    )
  }

  const facts: { label: string; value: string }[] = [
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
    },
    {
      label: t('Pending'),
      value: formatQuota(props.user?.aff_quota ?? 0),
    },
    {
      label: t('Total Earned'),
      value: formatQuota(props.user?.aff_history_quota ?? 0),
    },
    { label: t('Invites'), value: String(props.user?.aff_count ?? 0) },
  ]

  const layoutClassName = props.vertical
    ? 'flex flex-col gap-4'
    : 'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-10'

  return (
    <div className={`${layoutClassName} py-5`} data-testid='wallet-stats'>
      <div className='min-w-0'>
        <div className='text-content-muted text-[10.5px] font-medium tracking-[0.08em] uppercase'>
          {t('Current Balance')}
        </div>
        <div className='text-content-strong mt-1.5 font-mono text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums'>
          {formatQuota(props.user?.quota ?? 0)}
        </div>
        <div className='text-content-secondary mt-1.5 text-[11.5px]'>
          {t('Remaining quota')}
        </div>
      </div>

      <div
        className={
          props.vertical
            ? 'grid grid-cols-2 gap-4'
            : 'grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:min-w-0 sm:flex-1 sm:flex-wrap sm:items-end sm:justify-end sm:gap-x-8'
        }
      >
        {facts.map((fact) => (
          <div key={fact.label} className='min-w-0'>
            <div className='text-content-muted text-[10.5px] tracking-[0.06em] uppercase'>
              {fact.label}
            </div>
            <div className='text-content-strong mt-1 truncate font-mono text-[15px] font-medium tabular-nums'>
              {fact.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
