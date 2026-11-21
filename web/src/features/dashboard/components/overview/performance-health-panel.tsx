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
import { Gauge, HeartPulse, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import {
  formatLatency,
  formatThroughput,
  formatUptimePct,
  getSuccessRateDotClass,
  getSuccessRateTextClass,
} from '@/features/performance-metrics/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

const PERFORMANCE_WINDOW_HOURS = 24
const TOP_MODEL_LIMIT = 6

export function PerformanceHealthPanel() {
  const { t } = useTranslation()
  const metricsQuery = useQuery({
    queryKey: ['perf-metrics-summary', PERFORMANCE_WINDOW_HOURS],
    queryFn: async () =>
      requireServerSuccess(
        await getPerfMetricsSummary(PERFORMANCE_WINDOW_HOURS)
      ),
    staleTime: 60 * 1000,
    retry: false,
  })

  const models = useMemo(
    () => metricsQuery.data?.data.models ?? [],
    [metricsQuery.data]
  )

  const summary = metricsQuery.data?.data.summary

  const topModels = useMemo(() => models.slice(0, TOP_MODEL_LIMIT), [models])
  const loading = metricsQuery.isLoading
  const hasData = models.length > 0

  return (
    <section
      data-dashboard-panel=''
      className='bg-card h-full overflow-hidden rounded-xl border border-line'
    >
      <div className='flex items-center gap-2 border-b border-line-subtle px-4 py-3 sm:px-5'>
        <h3 className='text-content-strong text-[12.5px] font-semibold'>
          {t('Performance health')}
        </h3>
        <span className='text-content-muted ml-auto text-[11.5px]'>
          {t('Performance metrics for the last 24 hours')}
        </span>
      </div>

      <div className='p-4 sm:p-5'>
        <div className='grid grid-cols-3 divide-x divide-line-subtle'>
          <MetricCell
            icon={HeartPulse}
            label={t('Success rate')}
            value={formatUptimePct(summary?.success_rate ?? Number.NaN)}
            loading={loading}
            valueClassName={getSuccessRateTextClass(
              summary?.success_rate ?? Number.NaN
            )}
          />
          <MetricCell
            icon={Timer}
            label={t('Average latency')}
            value={formatLatency(summary?.avg_latency_ms ?? 0)}
            loading={loading}
          />
          <MetricCell
            icon={Gauge}
            label={t('Throughput')}
            value={formatThroughput(summary?.avg_tps ?? 0)}
            loading={loading}
          />
        </div>

        {loading ? (
          <div className='mt-4 space-y-1 border-t border-line-subtle pt-3'>
            {['success', 'latency', 'throughput'].map((key) => (
              <Skeleton key={key} className='h-5 w-full rounded' />
            ))}
          </div>
        ) : (
          hasData && (
            <div className='mt-4 border-t border-line-subtle pt-3'>
              <span className='text-content-muted mb-1.5 block text-[11px] font-medium'>
                {t('Top models by traffic')}
              </span>
              <div className='grid grid-cols-1 gap-x-6 sm:grid-cols-2'>
                {topModels.map((model) => (
                  <div
                    key={model.model_name}
                    className='flex items-center justify-between gap-2 border-b border-line-subtle py-1.5 last:border-b-0'
                  >
                    <span className='text-content-secondary min-w-0 flex-1 truncate font-mono text-[11px]'>
                      {model.model_name}
                    </span>
                    <span className='inline-flex shrink-0 items-center gap-1.5'>
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          getSuccessRateDotClass(model.success_rate)
                        )}
                        aria-hidden='true'
                      />
                      <span
                        className={cn(
                          'text-[11px] font-semibold tabular-nums',
                          getSuccessRateTextClass(model.success_rate)
                        )}
                      >
                        {formatUptimePct(model.success_rate)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  )
}

function MetricCell(props: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  loading: boolean
  valueClassName?: string
}) {
  const Icon = props.icon
  return (
    <div className='px-4 first:pl-0 last:pr-0'>
      <div className='text-content-muted flex items-center gap-1.5 text-[11px] font-medium'>
        <Icon className='size-3.5 shrink-0' aria-hidden='true' />
        <span className='truncate'>{props.label}</span>
      </div>
      {props.loading ? (
        <Skeleton className='mt-1.5 h-5 w-16' />
      ) : (
        <div
          className={cn(
            'text-content-strong mt-1.5 text-[15px] font-semibold tabular-nums',
            props.valueClassName
          )}
        >
          {props.value}
        </div>
      )}
    </div>
  )
}
