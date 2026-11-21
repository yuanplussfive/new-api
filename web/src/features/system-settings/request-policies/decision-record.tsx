import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { PolicyEvent } from './api'
import { policyLabel } from './policy-label'

/**
 * Waterfall trace: each decision starts where the previous one ended, so the
 * bar length reads as that attempt's share of the request time. A pure CSS
 * layout keeps it legible at dialog width without pulling in a chart runtime.
 */
export function PolicyDecisionRecord(props: {
  events: PolicyEvent[] | null
  channelNames?: Record<number, string>
}) {
  const { t } = useTranslation()
  const events = props.events ?? []
  const totalMs = events.reduce(
    (sum, event) => sum + Math.max(event.elapsed_ms, 0),
    0
  )
  const span = Math.max(totalMs, 1)

  let cursor = 0
  const rows = events.map((event) => {
    const elapsed = Math.max(event.elapsed_ms, 0)
    const start = cursor
    cursor += elapsed
    return { event, elapsed, start }
  })

  return (
    <div className='min-w-0'>
      <ol aria-label={t('Request decision flow')} className='min-w-0'>
        {rows.map(({ event, elapsed, start }, index) => {
          const failed =
            event.decision.action === 'failure' || (event.status ?? 0) >= 400
          const stopped = event.decision.action === 'stop'
          const width = `${Math.max((elapsed / span) * 100, 0.75)}%`
          const offset = `${(start / span) * 100}%`
          let barTone = 'bg-content-secondary/70'
          if (stopped) barTone = 'bg-warning'
          if (failed) barTone = 'bg-destructive'
          const meta = [
            event.attempt > 0 ? `${t('Attempt')} ${event.attempt}` : null,
            `${t('Source')}: ${policyLabel(t, event.decision.source)}`,
            event.group,
            event.rule,
            event.health ? policyLabel(t, event.health) : null,
          ]
            .filter(Boolean)
            .join(' · ')

          return (
            <motion.li
              key={`${event.attempt}:${event.channel_id ?? 0}:${event.decision.action}:${event.decision.reason}:${event.rule ?? ''}`}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: index * 0.03 }}
              className='border-line-subtle min-w-0 border-b py-2 first:pt-0 last:border-b-0 last:pb-0'
            >
              <div className='flex min-w-0 items-baseline justify-between gap-3'>
                <div className='flex min-w-0 items-baseline gap-2'>
                  <span className='text-content-muted shrink-0 font-mono text-[11px] tabular-nums'>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'truncate text-[12.5px] leading-5 font-medium',
                      stopped && 'text-warning',
                      failed && 'text-destructive'
                    )}
                  >
                    {policyLabel(t, event.decision.reason)}
                    {event.channel_id
                      ? ` · ${props.channelNames?.[event.channel_id] ?? `#${event.channel_id}`}`
                      : ''}
                  </span>
                </div>
                <span className='text-content-secondary shrink-0 font-mono text-[11px] tabular-nums'>
                  {elapsed} ms
                </span>
              </div>
              <div
                aria-hidden='true'
                className='bg-line-subtle relative mt-1.5 h-1 w-full overflow-hidden'
              >
                <span
                  style={{ marginLeft: offset, width }}
                  className={cn('block h-full', barTone)}
                />
              </div>
              <p className='text-content-muted mt-1 truncate text-[11px] leading-4'>
                {meta}
              </p>
            </motion.li>
          )
        })}
      </ol>
      {rows.length > 0 && (
        <p className='text-content-muted border-line-subtle mt-1 border-t pt-1.5 text-right font-mono text-[11px] tabular-nums'>
          {totalMs} ms
        </p>
      )}
    </div>
  )
}
