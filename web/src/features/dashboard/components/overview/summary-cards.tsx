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
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimatedValue } from '@/components/ui/animated-value'
import { Button } from '@/components/ui/button'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { useSummaryCardsConfig } from '@/features/dashboard/hooks/use-dashboard-config'
import { useStatus } from '@/hooks/use-status'
import { getCurrencyLabel, isCurrencyDisplayEnabled } from '@/lib/currency'
import { formatNumber, formatQuota } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { computeTimeRange } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'

import { SummaryBalance } from './summary-balance'
import { getRunwayDays, getHealthLevel, HEALTH_CONFIG } from './summary-metrics'
import type { QuickAction } from './overview-types'

export function SummaryCards(props: { actions: QuickAction[] }) {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { status, loading } = useStatus()

  const summaryTimeRange = useMemo(() => computeTimeRange(1), [])
  const remainQuota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const requestCount = Number(user?.request_count ?? 0)

  const usageTrendQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'summary-sparklines',
      summaryTimeRange.start_timestamp,
      summaryTimeRange.end_timestamp,
    ],
    queryFn: async () =>
      requireServerSuccess(
        await getUserQuotaDates({
          start_timestamp: summaryTimeRange.start_timestamp,
          end_timestamp: summaryTimeRange.end_timestamp,
          default_time: 'hour',
        })
      ),
    staleTime: 60 * 1000,
  })

  const summaryValues = useMemo(() => {
    return {
      usedDisplay: formatQuota(usedQuota),
      requestCountDisplay: formatNumber(requestCount),
    }
  }, [requestCount, usedQuota])

  const currencyEnabledFromStore = isCurrencyDisplayEnabled()
  const statusCurrencyFlag =
    typeof status?.display_in_currency === 'boolean'
      ? Boolean(status.display_in_currency)
      : undefined
  const currencyEnabled =
    statusCurrencyFlag !== undefined
      ? statusCurrencyFlag
      : currencyEnabledFromStore
  const currencyLabel = currencyEnabled ? getCurrencyLabel() : 'Tokens'

  const recentUsage = useMemo(
    () =>
      (usageTrendQuery.data?.data ?? []).reduce(
        (total, item) => total + (Number(item.quota) || 0),
        0
      ),
    [usageTrendQuery.data?.data]
  )

  const healthLevel = getHealthLevel(remainQuota, recentUsage)
  const healthCfg = HEALTH_CONFIG[healthLevel]
  const runwayDays = getRunwayDays(remainQuota, recentUsage)

  const todayUsageDisplay = formatQuota(recentUsage)
  let runwayDisplay: string
  if (runwayDays !== null) {
    if (runwayDays < 1) {
      runwayDisplay = t('Less than 1 day left')
    } else if (runwayDays > 999) {
      runwayDisplay = `999+ ${t('days')}`
    } else {
      runwayDisplay = `~${formatNumber(Math.floor(runwayDays))} ${t('days')}`
    }
  } else if (remainQuota <= 0) {
    runwayDisplay = t('Balance depleted')
  } else {
    runwayDisplay = t('No recent usage')
  }

  const items = useSummaryCardsConfig({
    ...summaryValues,
    todayUsageDisplay,
    currencyEnabled,
    currencyLabel,
  })

  return (
    <section
      data-console=''
      className='dark:border-white/10 overflow-hidden rounded-xl border border-[#202020] bg-[#0b0b0b] text-[#f4f4f4] dark:bg-[#111111]'
    >
      <div className='flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 font-mono text-[10.5px] tracking-[0.04em] text-white/40'>
        <span>overview · usage</span>
        <span className='flex items-center gap-1.5'>
          <span
            className={`size-1.5 rounded-full ${healthCfg.dotClass}`}
            aria-hidden='true'
          />
          {t(healthCfg.labelKey)}
        </span>
      </div>

      <div className='grid xl:grid-cols-[minmax(0,1fr)_15rem]'>
        <div className='min-w-0'>
          <div className='px-5 pt-4 pb-3.5'>
            <p className='font-mono text-[11px] text-white/35'>
              $ usage --last 24h
            </p>
            <div className='mt-1.5 flex flex-wrap items-baseline gap-x-2'>
              <h3 className='text-[15px] font-medium text-white/90'>
                {t('Usage at a glance')}
              </h3>
              <span className='font-mono text-[13px] font-normal text-white/50 tabular-nums'>
                {todayUsageDisplay}
              </span>
            </div>
          </div>

          <dl className='grid grid-cols-1 border-t border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-white/10'>
            {items.map((it) => (
              <div
                key={it.key}
                className='flex min-h-[74px] min-w-0 flex-col justify-center px-4 py-3'
              >
                <dt className='truncate font-mono text-[10px] tracking-[0.06em] text-white/40 uppercase'>
                  {it.title}
                </dt>
                <dd className='mt-1 truncate text-[18px] leading-none font-semibold tracking-[-0.01em] text-white/95 tabular-nums'>
                  <AnimatedValue
                    value={loading ? '—' : it.value}
                    className='text-[18px] leading-none'
                  />
                </dd>
                <p className='mt-1.5 truncate text-[10.5px] text-white/35'>
                  {it.description}
                </p>
              </div>
            ))}
          </dl>
        </div>

        <SummaryBalance
          healthConfig={healthCfg}
          remainQuota={remainQuota}
          recentUsage={recentUsage}
          runwayDays={runwayDays}
          runwayDisplay={runwayDisplay}
          healthLevel={healthLevel}
        />
      </div>

      <div className='flex flex-wrap items-center gap-1.5 border-t border-white/10 px-3 py-2'>
        {props.actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.title}
              variant='ghost'
              size='sm'
              className='h-8 gap-2 rounded-[7px] px-2.5 text-[12px] font-normal text-white/70 hover:bg-white/10 hover:text-white'
              render={<Link to={action.to} />}
            >
              <Icon className='size-3.5' aria-hidden='true' />
              {action.title}
            </Button>
          )
        })}
      </div>
    </section>
  )
}
