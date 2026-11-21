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

import { Button } from '@/components/ui/button'
import { formatQuotaWithCurrency } from '@/lib/currency'

import { useBillingHistory } from '../hooks/use-billing-history'
import {
  formatTimestamp,
  getPaymentMethodName,
  getStatusConfig,
} from '../lib/billing'

interface WalletLedgerProps {
  onViewAll: () => void
}

function renderBody(
  records: ReturnType<typeof useBillingHistory>['records'],
  loading: boolean,
  t: (key: string) => string
) {
  if (loading) {
    return (
      <p className='text-content-muted mt-3 text-[11.5px]'>{t('Loading...')}</p>
    )
  }

  if (records.length === 0) {
    return (
      <p className='text-content-muted mt-3 text-[11.5px]'>
        {t('No top-up records yet')}
      </p>
    )
  }

  return (
    <div className='mt-2'>
      <div className='text-content-muted border-line-subtle grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-3 border-b py-1.5 text-[10px] tracking-[0.05em] uppercase sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4.5rem]'>
        <span>{t('Time')}</span>
        <span className='hidden sm:block'>{t('Method')}</span>
        <span className='text-right'>{t('Amount')}</span>
        <span className='text-right'>{t('Status')}</span>
      </div>
      {records.map((record) => {
        const status = getStatusConfig(record.status)
        return (
          <div
            key={record.id}
            className='border-line-subtle grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-baseline gap-3 border-b py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4.5rem]'
          >
            <div className='min-w-0'>
              <span className='text-content-secondary block truncate font-mono text-[11px] tabular-nums'>
                {formatTimestamp(record.create_time)}
              </span>
              <span className='text-content-muted block text-[10.5px] sm:hidden'>
                {getPaymentMethodName(record.payment_method, t)}
              </span>
            </div>
            <span className='text-content-secondary hidden truncate text-[11.5px] sm:block'>
              {getPaymentMethodName(record.payment_method, t)}
            </span>
            <span className='text-content-strong text-right font-mono text-[11.5px] tabular-nums'>
              {formatQuotaWithCurrency(record.amount)}
            </span>
            <span className='text-content-muted text-right text-[11px]'>
              {t(status.label)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Recent top-ups as a compact ledger; keeps the page useful without a dialog. */
export function WalletLedger(props: WalletLedgerProps) {
  const { t } = useTranslation()
  const { records, total, loading } = useBillingHistory({ initialPageSize: 6 })

  return (
    <section
      aria-labelledby='wallet-ledger-title'
      className='py-4'
      data-testid='wallet-ledger'
    >
      <div className='flex items-baseline justify-between gap-3'>
        <h2
          className='text-content-strong text-[13px] font-semibold'
          id='wallet-ledger-title'
        >
          {t('Recent top-ups')}
        </h2>
        <div className='flex items-center gap-3'>
          <span className='text-content-muted font-mono text-[10.5px]'>
            {total}
          </span>
          <Button
            className='text-content-secondary h-7 px-0 text-[11.5px] font-normal'
            onClick={props.onViewAll}
            variant='ghost'
          >
            {t('View all')}
          </Button>
        </div>
      </div>

      {renderBody(records, loading, t)}
    </section>
  )
}
