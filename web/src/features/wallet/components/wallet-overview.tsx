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
import { ArrowUpRight, Plus, Send, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletQuickActionsProps {
  canTransfer: boolean
  onAddFunds: () => void
  onRedeem: () => void
  onHistory: () => void
  onTransfer: () => void
}

/** Utility row, not a second dashboard panel beside the card. */
export function WalletQuickActions(props: WalletQuickActionsProps) {
  const { t } = useTranslation()
  return (
    <nav
      className='flex flex-wrap items-center gap-x-1 gap-y-2 self-start'
      aria-label={t('Quick actions')}
    >
      <Button size='sm' onClick={props.onAddFunds}>
        <Plus aria-hidden='true' />
        {t('Add Funds')}
      </Button>
      <Button variant='ghost' size='sm' onClick={props.onRedeem}>
        <Ticket aria-hidden='true' />
        {t('Redemption Code')}
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={props.onTransfer}
        disabled={!props.canTransfer}
      >
        <Send aria-hidden='true' />
        {t('Transfer to Balance')}
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={t('Billing History')}
        onClick={props.onHistory}
      >
        <ArrowUpRight aria-hidden='true' />
      </Button>
    </nav>
  )
}

interface WalletMetricsProps {
  user: UserWalletData | null
  loading?: boolean
}

export function WalletMetrics(props: WalletMetricsProps) {
  const { t } = useTranslation()
  const metrics = [
    [t('Total Usage'), formatQuota(props.user?.used_quota ?? 0)],
    [t('API Requests'), String(props.user?.request_count ?? 0)],
    [t('Pending'), formatQuota(props.user?.aff_quota ?? 0)],
    [t('Total Earned'), formatQuota(props.user?.aff_history_quota ?? 0)],
    [t('Invites'), String(props.user?.aff_count ?? 0)],
  ] as const

  return (
    <dl className='border-line-subtle grid grid-cols-2 gap-x-5 gap-y-5 border-y py-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8'>
      {metrics.map(([label, value]) => (
        <div key={label} className='min-w-0'>
          <dt className='text-content-muted truncate text-[11px]'>{label}</dt>
          {props.loading ? (
            <Skeleton className='mt-2 h-5 w-20' />
          ) : (
            <dd className='text-content-strong mt-1.5 truncate font-mono text-[17px] font-medium tabular-nums'>
              {value}
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}
