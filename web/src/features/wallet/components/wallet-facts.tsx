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
import { History, RefreshCw, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import type { UserWalletData } from '../types'

interface WalletFactsProps {
  user: UserWalletData | null
  refreshing?: boolean
  onRefresh: () => void
  onOpenHistory: () => void
  onOpenTransfer: () => void
}

/** Right rail: account facts and one-tap actions, flat rows only. */
export function WalletFacts(props: WalletFactsProps) {
  const { t } = useTranslation()

  const facts: [string, string][] = [
    [t('User ID'), String(props.user?.id ?? '—')],
    [t('Username'), props.user?.username ?? '—'],
    [t('Group'), props.user?.group ?? '—'],
  ]

  return (
    <section aria-labelledby='wallet-account-title' className='py-4'>
      <h2
        className='text-content-strong text-[13px] font-semibold'
        id='wallet-account-title'
      >
        {t('Account')}
      </h2>
      <dl className='mt-3'>
        {facts.map(([label, value]) => (
          <div
            key={label}
            className='border-line-subtle flex items-baseline justify-between gap-3 border-b py-2 last:border-b-0'
          >
            <dt className='text-content-muted text-[11.5px]'>{label}</dt>
            <dd className='text-content-strong truncate font-mono text-[12px] tabular-nums'>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className='border-line-subtle mt-4 grid border-t'>
        <Button
          className='text-content-secondary hover:text-foreground h-9 justify-start gap-2 px-0 text-[12.5px] font-normal'
          onClick={props.onOpenHistory}
          variant='ghost'
        >
          <History className='size-3.5' aria-hidden='true' />
          {t('Billing History')}
        </Button>
        <Button
          className='text-content-secondary hover:text-foreground h-9 justify-start gap-2 px-0 text-[12.5px] font-normal'
          disabled={(props.user?.aff_quota ?? 0) <= 0}
          onClick={props.onOpenTransfer}
          variant='ghost'
        >
          <Send className='size-3.5' aria-hidden='true' />
          {t('Transfer to Balance')}
        </Button>
        <Button
          className='text-content-secondary hover:text-foreground h-9 justify-start gap-2 px-0 text-[12.5px] font-normal'
          disabled={props.refreshing}
          onClick={props.onRefresh}
          variant='ghost'
        >
          <RefreshCw
            className={props.refreshing ? 'size-3.5 animate-spin' : 'size-3.5'}
            aria-hidden='true'
          />
          {t('Refresh balance')}
        </Button>
      </div>
    </section>
  )
}
