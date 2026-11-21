import { formatNumber } from '@/lib/format'

import type { LogTimingV2, TimingPhase, TimingSegment } from '../types'

const TIMING_PHASES = new Set<TimingPhase>([
  'waiting',
  'thinking',
  'content',
  'tool',
  'other',
])

function isMilliseconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Timing arrives in parsed log JSON, so the TypeScript shape is not evidence. */
function isSemanticTiming(value: unknown): value is LogTimingV2 {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const timing = value as Record<string, unknown>
  if (
    timing.version !== 2 ||
    !isMilliseconds(timing.total_ms) ||
    !Array.isArray(timing.segments) ||
    timing.segments.length > 256
  ) {
    return false
  }
  const total = timing.total_ms
  const tolerance = 0.001
  for (const key of [
    'first_response_ms',
    'first_content_ms',
    'thinking_ms',
    'content_ms',
    'tool_generation_ms',
  ]) {
    if (
      timing[key] !== undefined &&
      (!isMilliseconds(timing[key]) || timing[key] > total)
    ) {
      return false
    }
  }
  if (
    timing.tool_calls !== undefined &&
    (!Number.isSafeInteger(timing.tool_calls) ||
      (timing.tool_calls as number) < 0)
  ) {
    return false
  }
  if (
    typeof timing.first_response_ms === 'number' &&
    typeof timing.first_content_ms === 'number' &&
    timing.first_content_ms < timing.first_response_ms
  ) {
    return false
  }

  const sums: Record<TimingPhase, number> = {
    waiting: 0,
    thinking: 0,
    content: 0,
    tool: 0,
    other: 0,
  }
  let previousEnd = 0
  for (const entry of timing.segments) {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      return false
    }
    const segment = entry as Record<string, unknown>
    if (
      !TIMING_PHASES.has(segment.phase as TimingPhase) ||
      !isMilliseconds(segment.start_ms) ||
      !isMilliseconds(segment.duration_ms)
    ) {
      return false
    }
    const end = segment.start_ms + segment.duration_ms
    if (
      !Number.isFinite(end) ||
      segment.start_ms + tolerance < previousEnd ||
      end > total + tolerance
    ) {
      return false
    }
    previousEnd = end
    sums[segment.phase as TimingPhase] += segment.duration_ms
  }

  if (
    timing.tool_calls === 0 &&
    (sums.tool > 0 ||
      (typeof timing.tool_generation_ms === 'number' &&
        timing.tool_generation_ms > 0))
  ) {
    return false
  }

  const observedTotal =
    sums.waiting +
    sums.other +
    ((timing.thinking_ms as number | undefined) ?? sums.thinking) +
    ((timing.content_ms as number | undefined) ?? sums.content) +
    ((timing.tool_generation_ms as number | undefined) ?? sums.tool)
  if (observedTotal > total + tolerance) return false

  // A summary must not contradict the observed intervals for that phase.
  for (const [key, phase] of [
    ['thinking_ms', 'thinking'],
    ['content_ms', 'content'],
    ['tool_generation_ms', 'tool'],
  ] as const) {
    if (
      timing[key] !== undefined &&
      ((timing[key] === 0) !== (sums[phase] === 0) ||
        Math.abs((timing[key] as number) - sums[phase]) > 0.001)
    ) {
      return false
    }
  }
  return true
}

export interface RequestTiming {
  totalMs: number | null
  firstResponseMs?: number
  firstContentMs?: number
  segments: TimingSegment[]
  phases: { phase: TimingPhase; durationMs: number }[]
  toolCalls?: number
}

/** Legacy timing cannot distinguish generated tool calls from other output. */
export function getRequestTiming(
  useTimeSec: number,
  frtMs: number | null | undefined,
  isStream: boolean,
  timing: unknown
): RequestTiming {
  const legacyTotalMs = useTimeSec * 1000
  const fallback: RequestTiming = {
    totalMs: isMilliseconds(legacyTotalMs) ? legacyTotalMs : null,
    segments: [],
    phases: [],
  }
  if (
    isStream &&
    isMilliseconds(frtMs) &&
    frtMs > 0 &&
    fallback.totalMs !== null &&
    frtMs <= fallback.totalMs
  ) {
    fallback.firstResponseMs = frtMs
  }
  if (!isSemanticTiming(timing)) return fallback

  const result: RequestTiming = {
    totalMs: timing.total_ms,
    segments: [],
    phases: [],
  }
  // Non-stream responses have no observable streamed phase boundaries.
  if (!isStream) return result

  result.firstResponseMs = timing.first_response_ms
  result.firstContentMs = timing.first_content_ms
  result.toolCalls = timing.tool_calls
  result.segments = timing.segments.filter((segment) => segment.duration_ms > 0)
  // Keep phase rows in the order they were first observed, even when a tool
  // call precedes visible text or reasoning resumes later in the same stream.
  const phases = new Map<TimingPhase, number>()
  for (const segment of result.segments) {
    phases.set(
      segment.phase,
      (phases.get(segment.phase) ?? 0) + segment.duration_ms
    )
  }
  result.phases = Array.from(phases, ([phase, durationMs]) => ({
    phase,
    durationMs,
  }))
  return result
}

/** Shared seconds formatter rounds 29ms to 0.0s; keep subsecond precision here. */
export function formatTimingMilliseconds(
  milliseconds: number | null | undefined,
  locale?: string
): string {
  if (milliseconds == null || !isMilliseconds(milliseconds)) return '—'
  if (milliseconds >= 1000) {
    return `${formatNumber(milliseconds / 1000, locale)}s`
  }
  // Preserve positive durations below formatNumber's two-decimal resolution.
  if (milliseconds > 0 && milliseconds < 0.01) {
    return `<${formatNumber(0.01, locale)}ms`
  }
  return `${formatNumber(milliseconds, locale)}ms`
}
