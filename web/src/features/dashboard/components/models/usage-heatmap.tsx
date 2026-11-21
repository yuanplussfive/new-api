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
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsAdmin } from '@/hooks/use-admin'
import { toIntlLocale } from '@/i18n/languages'
import { formatLogQuota, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getUserQuotaDates } from '../../api'

type HeatmapMetric = 'tokens' | 'requests' | 'quota'

const WEEKS = 53
const LEVEL_CLASSES = [
  'bg-surface-subtle',
  'bg-info/20',
  'bg-info/40',
  'bg-info/60',
  'bg-info/85',
] as const

function levelFor(value: number, max: number): number {
  if (value <= 0) return 0
  if (max <= 0) return 1
  const ratio = value / max
  if (ratio > 0.6) return 4
  if (ratio > 0.35) return 3
  if (ratio > 0.12) return 2
  return 1
}

/**
 * Contribution-style calendar of daily usage. Values come from the existing
 * quota-data endpoint, so the card adds no backend surface: each cell sums the
 * rows that fall on that local day.
 */
export function UsageHeatmap(props: { embedded?: boolean }) {
  const { t, i18n } = useTranslation()
  const isAdmin = useIsAdmin()
  const [metric, setMetric] = useState<HeatmapMetric>('tokens')
  const [activeDay, setActiveDay] = useState<string | null>(null)

  const range = useMemo(() => {
    const today = dayjs().startOf('day')
    const weekdayOffset = (today.day() + 6) % 7
    const start = today.subtract(WEEKS * 7 - 1 + weekdayOffset, 'day')
    return { start, end: today }
  }, [])

  const { data = [], isLoading } = useQuery({
    queryKey: [
      'dashboard',
      'usage-heatmap',
      isAdmin,
      range.start.unix(),
      range.end.unix(),
    ],
    queryFn: async () => {
      const response = await getUserQuotaDates(
        {
          start_timestamp: range.start.unix(),
          end_timestamp: range.end.unix(),
        },
        isAdmin
      )
      return response.data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { buckets, days, max } = useMemo(() => {
    const sums = new Map<
      string,
      { tokens: number; requests: number; quota: number }
    >()
    for (const row of data) {
      const key = dayjs(row.created_at * 1000).format('YYYY-MM-DD')
      const current = sums.get(key) ?? { tokens: 0, requests: 0, quota: 0 }
      current.tokens += row.token_used ?? 0
      current.requests += row.count ?? 0
      current.quota += row.quota ?? 0
      sums.set(key, current)
    }
    const list: { key: string; date: Dayjs }[] = []
    for (let i = 0; i < WEEKS * 7; i += 1) {
      const date = range.start.add(i, 'day')
      list.push({ key: date.format('YYYY-MM-DD'), date })
    }
    const peak = Math.max(
      ...list.map((day) => sums.get(day.key)?.[metric] ?? 0),
      0
    )
    return { buckets: sums, days: list, max: peak }
  }, [data, metric, range.start])

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(toIntlLocale(i18n.language), {
        month: 'short',
      }),
    [i18n.language]
  )
  const metricValue = (key: string) => buckets.get(key)?.[metric] ?? 0
  const activeBucket = activeDay ? buckets.get(activeDay) : undefined
  let metricLabel = t('Tokens')
  if (metric === 'requests') metricLabel = t('Requests')
  if (metric === 'quota') metricLabel = t('Cost')

  const metricTabs = (
    <Tabs
      value={metric}
      onValueChange={(value) => setMetric(value as HeatmapMetric)}
    >
      <TabsList variant='line' className='w-auto justify-start gap-4'>
        <TabsTrigger value='tokens'>{t('Tokens')}</TabsTrigger>
        <TabsTrigger value='requests'>{t('Requests')}</TabsTrigger>
        <TabsTrigger value='quota'>{t('Cost')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )

  return (
    <section
      className={cn(
        'min-w-0',
        !props.embedded && 'border-line-subtle border-b pb-4'
      )}
    >
      <div className='flex flex-wrap items-end justify-between gap-3'>
        {props.embedded ? (
          <p className='text-content-muted text-[11.5px] leading-4'>
            {t('Daily usage over the last 53 weeks')}
          </p>
        ) : (
          <div className='min-w-0'>
            <h3 className='text-[14px] leading-5 font-semibold'>
              {t('Usage heatmap')}
            </h3>
            <p className='text-content-muted mt-0.5 text-[11.5px] leading-4'>
              {t('Daily usage over the last 53 weeks')}
            </p>
          </div>
        )}
        {metricTabs}
      </div>

      <div className='mt-3 min-w-0 overflow-x-auto'>
        <div className='inline-flex min-w-full flex-col gap-1.5'>
          <div
            className='text-content-muted ml-8 grid gap-[3px] text-[10px]'
            style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0,1fr))` }}
          >
            {Array.from({ length: WEEKS }, (_, week) => {
              const date = range.start.add(week * 7, 'day')
              const previous =
                week > 0 ? range.start.add((week - 1) * 7, 'day') : null
              const label =
                !previous || date.month() !== previous.month()
                  ? monthFormatter.format(date.toDate())
                  : ''
              return (
                <span
                  key={week}
                  className='w-[11px] shrink-0 whitespace-nowrap'
                >
                  {label}
                </span>
              )
            })}
          </div>
          <div className='flex gap-1.5'>
            <div className='text-content-muted flex w-7 shrink-0 flex-col justify-between py-px text-[10px] leading-none'>
              <span>{t('Mon')}</span>
              <span>{t('Wed')}</span>
              <span>{t('Fri')}</span>
              <span>{t('Sun')}</span>
            </div>
            <div
              className='grid w-full grid-flow-col grid-rows-7 gap-[3px]'
              style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0,1fr))` }}
            >
              {days.map((day) => {
                const value = metricValue(day.key)
                const level = levelFor(value, max)
                return (
                  <button
                    key={day.key}
                    type='button'
                    onMouseEnter={() => setActiveDay(day.key)}
                    onFocus={() => setActiveDay(day.key)}
                    onMouseLeave={() => setActiveDay(null)}
                    onBlur={() => setActiveDay(null)}
                    aria-label={`${day.key} ${metricLabel}: ${value}`}
                    className={cn(
                      'aspect-square w-full border border-transparent transition-colors',
                      LEVEL_CLASSES[level],
                      day.key === dayjs().format('YYYY-MM-DD') &&
                        'ring-content-secondary/60 ring-1'
                    )}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className='text-content-muted mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]'>
        <span className='min-w-0 truncate'>
          {activeDay ? (
            <>
              <span className='text-content-secondary font-mono'>
                {activeDay}
              </span>
              {' · '}
              {metricLabel}{' '}
              <span className='text-content-secondary font-mono tabular-nums'>
                {metric === 'quota'
                  ? formatLogQuota(activeBucket?.quota ?? 0)
                  : formatNumber(metricValue(activeDay))}
              </span>
            </>
          ) : (
            t('Daily usage over the last 53 weeks')
          )}
        </span>
        <span className='flex shrink-0 items-center gap-1.5'>
          {t('Less')}
          {LEVEL_CLASSES.map((className) => (
            <span
              key={className}
              className={cn('size-[9px] border border-transparent', className)}
            />
          ))}
          {t('More')}
          {isLoading && (
            <span className='text-content-muted'>{t('Loading')}</span>
          )}
        </span>
      </div>
    </section>
  )
}
