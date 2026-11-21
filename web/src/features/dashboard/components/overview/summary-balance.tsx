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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { AnimatedValue } from '@/components/ui/animated-value'
import { Button } from '@/components/ui/button'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

interface SummaryBalanceProps {
  healthConfig: { dotClass: string; labelKey: string }
  remainQuota: number
  recentUsage: number
  runwayDays: number | null
  runwayDisplay: string
  healthLevel: 'healthy' | 'caution' | 'critical'
}

export function SummaryBalance(props: SummaryBalanceProps) {
  const { t } = useTranslation()
  return (
    <div className='flex min-w-0 flex-col justify-between gap-3 border-t border-white/10 p-4 xl:border-t-0 xl:border-l'>
      <div className='flex flex-col gap-1.5'>
        <span className='font-mono text-[10px] tracking-[0.06em] text-white/40 uppercase'>
          {t('Credit remaining')}
        </span>

        <div className='font-mono text-[24px] leading-none font-semibold tracking-[-0.02em] text-white/95 tabular-nums'>
          <AnimatedValue
            value={formatQuota(props.remainQuota)}
            className='text-[24px] leading-none'
          />
        </div>

        <dl className='divide-y divide-white/10 border-t border-white/10'>
          <div className='flex items-baseline justify-between gap-3 py-1.5'>
            <dt className='text-[11px] text-white/40'>
              {t('Last 24h usage')}
            </dt>
            <dd className='truncate font-mono text-[11.5px] text-white/75 tabular-nums'>
              {formatQuota(props.recentUsage)}
            </dd>
          </div>
          <div className='flex items-baseline justify-between gap-3 py-1.5'>
            <dt className='text-[11px] text-white/40'>{t('Runway')}</dt>
            <dd
              className={cn(
                'truncate font-mono text-[11.5px] tabular-nums',
                props.healthLevel === 'critical' && 'text-destructive',
                props.healthLevel === 'caution' && 'text-warning',
                props.healthLevel === 'healthy' && 'text-white/75'
              )}
            >
              {props.runwayDisplay}
            </dd>
          </div>
        </dl>
      </div>

      <Button
        variant='outline'
        size='sm'
        className='h-8 w-full justify-between border-white/15 bg-transparent text-white/75 hover:bg-white/10 hover:text-white'
        render={<Link to='/wallet' />}
      >
        <span>{t('Wallet')}</span>
        <span aria-hidden='true' className='text-white/40'>
          →
        </span>
      </Button>
    </div>
  )
}
