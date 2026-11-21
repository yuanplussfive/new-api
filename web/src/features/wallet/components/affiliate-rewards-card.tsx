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

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface AffiliateRewardsCardProps {
  user: UserWalletData | null
  affiliateLink: string
  onTransfer: () => void
  complianceConfirmed?: boolean
  loading?: boolean
}

/** Flat referral section: facts first, link second, action last. */
export function AffiliateRewardsCard(props: AffiliateRewardsCardProps) {
  const { t } = useTranslation()

  if (props.loading) {
    return (
      <section className='space-y-3 py-4'>
        <Skeleton className='h-3 w-24' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-9 w-full' />
      </section>
    )
  }

  const hasRewards = (props.user?.aff_quota ?? 0) > 0
  const facts = [
    [t('Pending'), formatQuota(props.user?.aff_quota ?? 0)],
    [t('Total Earned'), formatQuota(props.user?.aff_history_quota ?? 0)],
    [t('Invites'), String(props.user?.aff_count ?? 0)],
  ] as const

  return (
    <section
      aria-labelledby='wallet-affiliate-title'
      className='py-4'
      data-testid='affiliate-rewards'
    >
      <div className='flex items-baseline justify-between gap-3'>
        <h2
          className='text-content-strong text-[13px] font-semibold'
          id='wallet-affiliate-title'
        >
          {t('Referral Program')}
        </h2>
        <span className='text-content-muted font-mono text-[10.5px]'>
          {props.user?.aff_count ?? 0} {t('Invites')}
        </span>
      </div>
      <p className='text-content-secondary mt-1 text-[11.5px] leading-[1.6]'>
        {t(
          'Earn rewards when users join through your referral link. Transfer accumulated rewards to your balance anytime.'
        )}
      </p>

      <dl className='border-line-subtle mt-4 grid grid-cols-3 gap-3 border-y py-3'>
        {facts.map(([label, value]) => (
          <div key={label} className='min-w-0'>
            <dt className='text-content-muted truncate text-[10px] tracking-[0.05em] uppercase'>
              {label}
            </dt>
            <dd className='text-content-strong mt-1 truncate font-mono text-[13px] font-medium tabular-nums'>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className='mt-4 flex items-center gap-2'>
        <code className='border-line-subtle text-content-secondary min-w-0 flex-1 truncate border-b pb-1 font-mono text-[11px]'>
          {props.affiliateLink}
        </code>
        <CopyButton
          value={props.affiliateLink}
          variant='ghost'
          className='size-8 shrink-0'
          iconClassName='size-3.5'
          tooltip={t('Copy referral link')}
          aria-label={t('Copy referral link')}
        />
      </div>

      {hasRewards && (
        <Button
          onClick={props.onTransfer}
          disabled={!props.complianceConfirmed}
          size='sm'
          className='mt-3 w-full'
        >
          {t('Transfer to Balance')}
        </Button>
      )}
      {!props.complianceConfirmed ? (
        <p className='text-content-muted mt-2 text-[10.5px] leading-[1.6]'>
          {t(
            'Referral reward transfer is disabled until the administrator confirms compliance terms.'
          )}
        </p>
      ) : null}
    </section>
  )
}
