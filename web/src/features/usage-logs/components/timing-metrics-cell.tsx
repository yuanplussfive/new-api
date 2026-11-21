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
import { CircleAlert } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import {
  dotColorMap,
  textColorMap,
  type StatusVariant,
} from '@/components/status-badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toIntlLocale } from '@/i18n/languages'
import { cn } from '@/lib/utils'

import { getFirstResponseTimeColor, getResponseTimeColor } from '../lib/format'
import { formatTimingMilliseconds, getRequestTiming } from '../lib/timing'
import type { LogOtherData } from '../types'
import { LogTimingTimeline } from './timing-timeline'

interface TimingMetricsCellProps {
  useTimeSec: number
  completionTokens: number
  frtMs?: number
  isStream: boolean
  timing?: LogOtherData['timing']
  className?: string
  /**
   * `bar` (default) adds the phase timeline under the labels for the desktop
   * table; `dot` keeps the lighter inline status dots used by mobile cards.
   */
  indicator?: 'bar' | 'dot'
  compact?: boolean
}

export function TimingMetricsCell(props: TimingMetricsCellProps) {
  const { t, i18n } = useTranslation()
  const tooltipId = useId()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const indicator = props.indicator ?? 'bar'
  const timing = getRequestTiming(
    props.useTimeSec,
    props.frtMs,
    props.isStream,
    props.timing
  )
  const firstVariant: StatusVariant =
    timing.firstResponseMs === undefined
      ? 'neutral'
      : getFirstResponseTimeColor(timing.firstResponseMs / 1000)
  const totalVariant: StatusVariant =
    timing.totalMs === null
      ? 'neutral'
      : getResponseTimeColor(timing.totalMs / 1000, props.completionTokens)
  const firstLabel =
    timing.firstResponseMs === undefined
      ? t('N/A')
      : formatTimingMilliseconds(timing.firstResponseMs, locale)
  const totalLabel = formatTimingMilliseconds(timing.totalMs, locale)
  const accessibleLabel = props.isStream
    ? `${t('First response')}: ${firstLabel}; ${t('Duration')}: ${totalLabel}`
    : `${t('Duration')}: ${totalLabel}`

  return (
    <div className={cn('flex min-w-0 items-center', props.className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <div
                tabIndex={0}
                aria-label={accessibleLabel}
                aria-describedby={tooltipId}
              />
            }
            className='flex min-w-0 flex-1 flex-col gap-1.5'
          >
            <div className='flex min-w-0 items-center gap-3 text-[11px] leading-tight tabular-nums'>
              {props.isStream && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    textColorMap[firstVariant]
                  )}
                >
                  {indicator === 'dot' && (
                    <span
                      aria-hidden
                      className={cn(
                        'size-1.5 shrink-0',
                        dotColorMap[firstVariant]
                      )}
                    />
                  )}
                  {firstLabel}
                </span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  textColorMap[totalVariant]
                )}
              >
                {indicator === 'dot' && (
                  <span
                    aria-hidden
                    className={cn(
                      'size-1.5 shrink-0',
                      dotColorMap[totalVariant]
                    )}
                  />
                )}
                {totalLabel}
              </span>
            </div>
            {indicator === 'bar' && (
              <LogTimingTimeline
                useTimeSec={props.useTimeSec}
                frtMs={props.frtMs}
                isStream={props.isStream}
                timing={props.timing}
              />
            )}
          </TooltipTrigger>
          <TooltipContent
            role='tooltip'
            id={tooltipId}
            className='block w-[min(24rem,calc(100vw-2rem))] max-w-none py-3'
          >
            <LogTimingTimeline
              useTimeSec={props.useTimeSec}
              frtMs={props.frtMs}
              isStream={props.isStream}
              timing={props.timing}
              variant='full'
              inTooltip
              className='[&_*]:text-inherit'
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

interface StreamTpsCellProps {
  isStream: boolean
  compact?: boolean
  /** Task logs are asynchronous jobs; stream vs non-stream does not apply. */
  isTask?: boolean
  /** The task request returned its result inline, so it is a synchronous call. */
  isSyncTask?: boolean
  tokensPerSecond?: number | null
  streamStatus?: LogOtherData['stream_status']
  className?: string
}

export function StreamTpsCell(props: StreamTpsCellProps) {
  const { t } = useTranslation()
  const showStreamError =
    props.isStream && props.streamStatus && props.streamStatus.status !== 'ok'
  const tpsLabel =
    props.tokensPerSecond != null
      ? `${Math.round(props.tokensPerSecond)} t/s`
      : '—'
  let streamLabel = props.isStream ? t('Stream') : t('Non-stream')
  if (props.isTask) {
    streamLabel = props.isSyncTask ? t('Sync') : t('Async')
  }

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 text-xs leading-tight',
        props.className
      )}
    >
      <span
        className={cn(
          'inline-flex w-14 shrink-0 items-center gap-1 truncate font-medium',
          props.isStream ? 'text-info' : 'text-muted-foreground'
        )}
      >
        {streamLabel}
        {showStreamError && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={<CircleAlert className='text-destructive size-3' />}
              />
              <TooltipContent>
                <div className='space-y-0.5 text-xs'>
                  <p>
                    {t('Stream Status')}: {t('Error')}
                  </p>
                  <p>{props.streamStatus?.end_reason || 'unknown'}</p>
                  {(props.streamStatus?.error_count ?? 0) > 0 && (
                    <p>
                      {t('Soft Errors')}: {props.streamStatus?.error_count}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
      {(!props.compact ||
        (props.isStream && props.tokensPerSecond != null)) && (
        <span className='text-muted-foreground/70 min-w-0 truncate tabular-nums'>
          {tpsLabel}
        </span>
      )}
    </div>
  )
}
