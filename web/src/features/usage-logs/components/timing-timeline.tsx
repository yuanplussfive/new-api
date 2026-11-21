import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toIntlLocale } from '@/i18n/languages'
import { cn } from '@/lib/utils'

import { formatTimingMilliseconds, getRequestTiming } from '../lib/timing'
import type { LogOtherData, TimingPhase } from '../types'

interface LogTimingTimelineProps {
  useTimeSec: number
  frtMs?: number | null
  isStream: boolean
  timing?: LogOtherData['timing']
  className?: string
  variant?: 'bar' | 'full'
  /** Tooltip content must not contain nested interactive tooltip triggers. */
  inTooltip?: boolean
}

const PHASE_TONES: Record<TimingPhase, string> = {
  waiting: 'bg-content-secondary/60',
  thinking: 'bg-info/50',
  content: 'bg-info',
  tool: 'bg-warning',
  other: 'bg-content-muted/50',
}

/** Semantic intervals use their actual offsets; milestones are not phases. */
export function LogTimingTimeline(props: LogTimingTimelineProps) {
  const { t, i18n } = useTranslation()
  const helpId = useId()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const timing = getRequestTiming(
    props.useTimeSec,
    props.frtMs,
    props.isStream,
    props.timing
  )
  const span = timing.totalMs || 1
  const phaseLabels: Record<TimingPhase, string> = {
    waiting: t('Waiting'),
    thinking: t('Thinking'),
    content: t('Content'),
    tool: t('Tool-call generation'),
    other: t('Other'),
  }

  if (props.variant !== 'full') {
    return (
      <div
        aria-hidden='true'
        className={cn(
          'bg-line-subtle relative h-1.5 w-full overflow-hidden',
          props.className
        )}
      >
        {timing.segments.map((segment) => (
          <span
            key={`${segment.phase}-${segment.start_ms}`}
            style={{
              left: `${(segment.start_ms / span) * 100}%`,
              width: `${(segment.duration_ms / span) * 100}%`,
            }}
            className={cn('absolute h-full', PHASE_TONES[segment.phase])}
          />
        ))}
        {timing.firstResponseMs !== undefined && (
          <span
            style={{ left: `${(timing.firstResponseMs / span) * 100}%` }}
            className='bg-content-secondary absolute inset-y-0 w-px -translate-x-px'
          />
        )}
      </div>
    )
  }

  const toolHelp = t(
    'Time spent generating tool calls, not executing external tools.'
  )
  const phaseHelp: Partial<Record<TimingPhase, string>> = {
    tool: toolHelp,
    thinking: t(
      'Observed interval of streamed reasoning output or reasoning item boundaries. Hidden reasoning cannot be measured.'
    ),
  }
  const showToolCount =
    (timing.toolCalls ?? 0) > 0 &&
    !timing.phases.some((phase) => phase.phase === 'tool')

  return (
    <TooltipProvider>
      <div
        role='group'
        aria-label={t('Request timing')}
        className={cn('min-w-0 space-y-3 text-xs', props.className)}
      >
        <dl className='border-line-subtle flex flex-wrap gap-x-6 gap-y-2 border-b pb-2'>
          <div>
            <dt className='text-content-muted'>{t('Duration')}</dt>
            <dd className='mt-0.5 font-mono tabular-nums'>
              {formatTimingMilliseconds(timing.totalMs, locale)}
            </dd>
          </div>
          {timing.firstResponseMs !== undefined && (
            <div>
              <dt className='text-content-muted'>{t('First response')}</dt>
              <dd className='mt-0.5 font-mono tabular-nums'>
                {formatTimingMilliseconds(timing.firstResponseMs, locale)}
              </dd>
            </div>
          )}
          {timing.firstContentMs !== undefined && (
            <div>
              <dt className='text-content-muted'>{t('First text')}</dt>
              <dd className='mt-0.5 font-mono tabular-nums'>
                {formatTimingMilliseconds(timing.firstContentMs, locale)}
              </dd>
            </div>
          )}
        </dl>
        {timing.phases.map((phase) => (
          <div
            key={phase.phase}
            role='group'
            aria-label={phaseLabels[phase.phase]}
            className='space-y-1'
          >
            <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
              {phaseHelp[phase.phase] && !props.inTooltip ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span
                        tabIndex={0}
                        aria-describedby={`${helpId}-${phase.phase}`}
                        aria-description={phaseHelp[phase.phase]}
                      />
                    }
                    className='cursor-help underline decoration-dotted underline-offset-4'
                  >
                    {phaseLabels[phase.phase]}
                  </TooltipTrigger>
                  <TooltipContent
                    role='tooltip'
                    id={`${helpId}-${phase.phase}`}
                  >
                    {phaseHelp[phase.phase]}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className='text-content-secondary'>
                  {phaseLabels[phase.phase]}
                </span>
              )}
              <span className='font-mono tabular-nums'>
                {formatTimingMilliseconds(phase.durationMs, locale)}
              </span>
            </div>
            {timing.segments.some(
              (segment) => segment.phase === phase.phase
            ) && (
              <div className='bg-line-subtle relative h-3 w-full'>
                {timing.segments.map((segment) => {
                  if (segment.phase !== phase.phase) return null
                  const start = formatTimingMilliseconds(
                    segment.start_ms,
                    locale
                  )
                  const end = formatTimingMilliseconds(
                    segment.start_ms + segment.duration_ms,
                    locale
                  )
                  return (
                    <span
                      key={`${segment.phase}-${segment.start_ms}`}
                      role='img'
                      aria-label={`${phaseLabels[phase.phase]}: ${start} – ${end}`}
                      style={{
                        left: `${(segment.start_ms / span) * 100}%`,
                        width: `${(segment.duration_ms / span) * 100}%`,
                      }}
                      className={cn(
                        'absolute h-full',
                        PHASE_TONES[segment.phase]
                      )}
                    />
                  )
                })}
              </div>
            )}
            {props.inTooltip && phaseHelp[phase.phase] && (
              <p className='text-[11px] leading-relaxed'>
                {phaseHelp[phase.phase]}
              </p>
            )}
            {phase.phase === 'tool' && (timing.toolCalls ?? 0) > 0 && (
              <div className='text-content-muted'>
                {t('Tool calls: {{count}}', { count: timing.toolCalls })}
              </div>
            )}
          </div>
        ))}
        {showToolCount && props.inTooltip && (
          <div>
            <p>{t('Tool calls: {{count}}', { count: timing.toolCalls })}</p>
            <p className='mt-1 text-[11px] leading-relaxed'>{toolHelp}</p>
          </div>
        )}
        {showToolCount && !props.inTooltip && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  aria-describedby={`${helpId}-count`}
                  aria-description={toolHelp}
                />
              }
              className='inline-block cursor-help underline decoration-dotted underline-offset-4'
            >
              {t('Tool calls: {{count}}', { count: timing.toolCalls })}
            </TooltipTrigger>
            <TooltipContent role='tooltip' id={`${helpId}-count`}>
              {toolHelp}
            </TooltipContent>
          </Tooltip>
        )}
        {timing.segments.length > 0 && (
          <div
            aria-hidden='true'
            className='text-content-muted flex justify-between font-mono text-[10px] tabular-nums'
          >
            <span>{formatTimingMilliseconds(0, locale)}</span>
            <span>{formatTimingMilliseconds(timing.totalMs, locale)}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
