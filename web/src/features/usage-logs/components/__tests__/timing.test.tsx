import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, describe, expect, test } from 'vitest'

import { toIntlLocale } from '@/i18n/languages'

import { formatTimingMilliseconds, getRequestTiming } from '../../lib/timing'
import type { LogTimingV2 } from '../../types'
import { StreamTpsCell, TimingMetricsCell } from '../timing-metrics-cell'
import { LogTimingTimeline } from '../timing-timeline'

const semanticTiming: LogTimingV2 = {
  version: 2,
  total_ms: 1000,
  first_response_ms: 29,
  first_content_ms: 400,
  thinking_ms: 200,
  tool_generation_ms: 50,
  tool_calls: 2,
  content_ms: 400,
  segments: [
    { phase: 'waiting', start_ms: 0, duration_ms: 29 },
    { phase: 'thinking', start_ms: 100, duration_ms: 200 },
    { phase: 'tool', start_ms: 350, duration_ms: 50 },
    { phase: 'content', start_ms: 400, duration_ms: 400 },
    { phase: 'other', start_ms: 900, duration_ms: 100 },
  ],
}

const toolHelp =
  'Time spent generating tool calls, not executing external tools.'
const thinkingHelp =
  'Observed interval of streamed reasoning output or reasoning item boundaries. Hidden reasoning cannot be measured.'

afterEach(async () => {
  await i18next.changeLanguage('en')
})

describe('request timing', () => {
  test('ignores legacy unversioned tool and thinking durations rather than inventing observed phases', () => {
    render(
      <LogTimingTimeline
        useTimeSec={1}
        frtMs={100}
        isStream
        timing={{ dns_ms: 29, thinking_ms: 200, tool_ms: 50 }}
        variant='full'
      />
    )

    expect(screen.queryByText('Tool calls')).toBeNull()
    expect(screen.queryByText('Tool-call generation')).toBeNull()
    expect(screen.queryByText('Thinking')).toBeNull()
    expect(screen.queryByText('DNS')).toBeNull()
    expect(screen.queryByText('Stream')).toBeNull()
    expect(
      screen.getByText('First response').nextElementSibling
    ).toHaveTextContent('100ms')
    expect(screen.getByText('Duration').nextElementSibling).toHaveTextContent(
      '1s'
    )
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  test('shows v2 semantic intervals at their proportional offsets and milestones separately', () => {
    render(
      <LogTimingTimeline
        useTimeSec={2}
        isStream
        timing={semanticTiming}
        variant='full'
      />
    )

    const timeline = within(
      screen.getByRole('group', { name: 'Request timing' })
    )
    expect(timeline.getByText('Duration').nextElementSibling).toHaveTextContent(
      '1s'
    )
    expect(
      timeline.getByText('First response').nextElementSibling
    ).toHaveTextContent('29ms')
    expect(
      timeline.getByText('First text').nextElementSibling
    ).toHaveTextContent('400ms')
    expect(timeline.getByRole('group', { name: 'Thinking' })).toHaveTextContent(
      '200ms'
    )
    expect(
      timeline.getByRole('group', { name: 'Tool-call generation' })
    ).toHaveTextContent('50ms')
    expect(timeline.getByText('Tool calls: 2')).toBeVisible()
    expect(
      timeline.getByRole('img', { name: 'Thinking: 100ms – 300ms' })
    ).toHaveStyle({ left: '10%', width: '20%' })
    expect(
      timeline.getByRole('img', { name: 'Tool-call generation: 350ms – 400ms' })
    ).toHaveStyle({ left: '35%', width: '5%' })
    expect(
      timeline.getByRole('img', { name: 'Other: 900ms – 1s' })
    ).toHaveStyle({ left: '90%', width: '10%' })
    expect(timeline.getAllByRole('img')).toHaveLength(5)
    expect(
      timeline
        .getAllByRole('group')
        .map((row) => row.getAttribute('aria-label'))
    ).toEqual([
      'Waiting',
      'Thinking',
      'Tool-call generation',
      'Content',
      'Other',
    ])
    for (const label of [
      'DNS',
      'Connect',
      'TLS',
      'Send',
      'Stream',
      'First token',
    ]) {
      expect(timeline.queryByText(label)).toBeNull()
    }
  })

  test('explains observed reasoning and tool-call generation through keyboard-accessible shared tooltips', async () => {
    const user = userEvent.setup()
    render(
      <LogTimingTimeline
        useTimeSec={1}
        isStream
        timing={semanticTiming}
        variant='full'
      />
    )

    await user.tab()
    expect(screen.getByText('Thinking')).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent(thinkingHelp)
    await user.tab()
    expect(screen.getByText('Tool-call generation')).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent(toolHelp)
  })

  test.each([
    ['absent', undefined],
    ['empty legacy object', {}],
    ['empty v2', { version: 2, total_ms: 1000, segments: [] }],
    [
      'explicit zero phases',
      {
        version: 2,
        total_ms: 1000,
        thinking_ms: 0,
        tool_generation_ms: 0,
        tool_calls: 0,
        content_ms: 0,
        segments: [],
      },
    ],
  ])(
    'shows only recorded milestones and total when phases are %s',
    (_name, timing) => {
      render(
        <LogTimingTimeline
          useTimeSec={1}
          isStream
          timing={timing}
          variant='full'
        />
      )

      expect(screen.getByText('Duration').nextElementSibling).toHaveTextContent(
        '1s'
      )
      expect(screen.queryByText('Thinking')).toBeNull()
      expect(screen.queryByText('Tool-call generation')).toBeNull()
      expect(screen.queryByText('Content')).toBeNull()
      expect(screen.queryByText('Waiting')).toBeNull()
      expect(screen.queryByText('First response')).toBeNull()
      expect(screen.queryByText('First text')).toBeNull()
      expect(screen.queryAllByRole('img')).toHaveLength(0)
    }
  )

  test('does not imply thinking or tools for a normal text-only stream', () => {
    render(
      <LogTimingTimeline
        useTimeSec={2}
        isStream
        timing={{
          version: 2,
          total_ms: 1000,
          first_response_ms: 100,
          first_content_ms: 400,
          content_ms: 600,
          segments: [{ phase: 'content', start_ms: 400, duration_ms: 600 }],
        }}
        variant='full'
      />
    )
    expect(screen.getByRole('group', { name: 'Content' })).toHaveTextContent(
      '600ms'
    )
    expect(screen.queryByText('Thinking')).toBeNull()
    expect(screen.queryByText('Tool-call generation')).toBeNull()
    expect(screen.queryByText(/Tool calls:/)).toBeNull()
  })

  test('shows observed tool count without fabricating a zero-duration tool phase', async () => {
    const user = userEvent.setup()
    render(
      <LogTimingTimeline
        useTimeSec={1}
        isStream
        timing={{
          version: 2,
          total_ms: 1000,
          tool_generation_ms: 0,
          tool_calls: 2,
          segments: [],
        }}
        variant='full'
      />
    )

    expect(screen.getByText('Tool calls: 2')).toBeVisible()
    expect(screen.queryByText('0ms')).toBeNull()
    expect(screen.queryByText('0.0s')).toBeNull()
    expect(screen.queryByText('Tool-call generation')).toBeNull()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    await user.tab()
    expect(await screen.findByRole('tooltip')).toHaveTextContent(toolHelp)
  })

  test('preserves fractional and tiny durations rather than displaying fake zero seconds', () => {
    render(
      <LogTimingTimeline
        useTimeSec={0}
        isStream
        timing={{
          version: 2,
          total_ms: 29.5,
          first_response_ms: 0,
          first_content_ms: 0.0001,
          tool_calls: 1,
          segments: [
            { phase: 'tool', start_ms: 1, duration_ms: 0.25 },
            { phase: 'thinking', start_ms: 2, duration_ms: 0.0001 },
          ],
        }}
        variant='full'
      />
    )

    expect(screen.getByText('Duration').nextElementSibling).toHaveTextContent(
      '29.5ms'
    )
    expect(
      screen.getByText('First response').nextElementSibling
    ).toHaveTextContent('0ms')
    expect(
      screen.getByRole('group', { name: 'Tool-call generation' })
    ).toHaveTextContent('0.25ms')
    expect(screen.getByRole('group', { name: 'Thinking' })).toHaveTextContent(
      '<0.01ms'
    )
    expect(screen.queryByText('0.0s')).toBeNull()
  })

  test('renders non-stream timing as total only even if v2 contains semantic phases', () => {
    render(
      <LogTimingTimeline
        useTimeSec={2}
        frtMs={100}
        isStream={false}
        timing={semanticTiming}
        variant='full'
      />
    )

    expect(screen.getByText('Duration').nextElementSibling).toHaveTextContent(
      '1s'
    )
    expect(screen.queryByText('First response')).toBeNull()
    expect(screen.queryByText('First text')).toBeNull()
    expect(screen.queryByText('Thinking')).toBeNull()
    expect(screen.queryByText('Tool-call generation')).toBeNull()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  test.each([
    ['unknown version', { ...semanticTiming, version: 3 }],
    ['NaN total', { ...semanticTiming, total_ms: Number.NaN }],
    ['infinite total', { ...semanticTiming, total_ms: Infinity }],
    ['negative duration', { ...semanticTiming, thinking_ms: -1 }],
    ['infinite duration', { ...semanticTiming, tool_generation_ms: Infinity }],
    ['NaN milestone', { ...semanticTiming, first_response_ms: Number.NaN }],
    ['milestone beyond total', { ...semanticTiming, first_content_ms: 1001 }],
    ['backwards milestones', { ...semanticTiming, first_content_ms: 1 }],
    ['fractional count', { ...semanticTiming, tool_calls: 1.5 }],
    ['negative count', { ...semanticTiming, tool_calls: -1 }],
    [
      'tool duration with explicit zero count',
      { ...semanticTiming, tool_calls: 0 },
    ],
    ['missing segments', { version: 2, total_ms: 1000 }],
    ['non-array segments', { version: 2, total_ms: 1000, segments: {} }],
    [
      'unknown phase',
      {
        version: 2,
        total_ms: 1000,
        segments: [{ phase: 'network', start_ms: 0, duration_ms: 10 }],
      },
    ],
    [
      'negative offset',
      {
        version: 2,
        total_ms: 1000,
        segments: [{ phase: 'tool', start_ms: -1, duration_ms: 10 }],
      },
    ],
    [
      'NaN duration',
      {
        version: 2,
        total_ms: 1000,
        segments: [{ phase: 'tool', start_ms: 0, duration_ms: Number.NaN }],
      },
    ],
    [
      'infinite offset',
      {
        version: 2,
        total_ms: 1000,
        segments: [{ phase: 'tool', start_ms: Infinity, duration_ms: 10 }],
      },
    ],
    [
      'negative interval',
      {
        version: 2,
        total_ms: 1000,
        segments: [{ phase: 'tool', start_ms: 0, duration_ms: -1 }],
      },
    ],
    [
      'overlapping intervals',
      {
        version: 2,
        total_ms: 1000,
        segments: [
          { phase: 'thinking', start_ms: 100, duration_ms: 200 },
          { phase: 'tool', start_ms: 200, duration_ms: 100 },
        ],
      },
    ],
    [
      'unordered intervals',
      {
        version: 2,
        total_ms: 1000,
        segments: [
          { phase: 'thinking', start_ms: 500, duration_ms: 100 },
          { phase: 'tool', start_ms: 0, duration_ms: 100 },
        ],
      },
    ],
    [
      'interval beyond total',
      {
        version: 2,
        total_ms: 1000,
        segments: [{ phase: 'tool', start_ms: 999, duration_ms: 2 }],
      },
    ],
    [
      'summary oversum',
      {
        version: 2,
        total_ms: 1000,
        thinking_ms: 600,
        content_ms: 600,
        segments: [],
      },
    ],
    [
      'uncorroborated positive summary',
      { version: 2, total_ms: 1000, tool_generation_ms: 20, segments: [] },
    ],
    ['contradictory phase summary', { ...semanticTiming, thinking_ms: 201 }],
    [
      'too many intervals',
      {
        version: 2,
        total_ms: 1000,
        segments: Array.from({ length: 257 }, () => ({
          phase: 'tool',
          start_ms: 0,
          duration_ms: 0,
        })),
      },
    ],
  ])(
    'falls back to first response and total for invalid v2: %s',
    (_name, timing) => {
      expect(getRequestTiming(2, 100, true, timing)).toEqual({
        totalMs: 2000,
        firstResponseMs: 100,
        segments: [],
        phases: [],
      })
    }
  )

  test.each([undefined, 0, -1, Number.NaN, Infinity, 1001])(
    'omits absent or invalid legacy frt %s instead of inventing a milestone',
    (frt) => {
      expect(
        getRequestTiming(1, frt, true, undefined).firstResponseMs
      ).toBeUndefined()
    }
  )

  test.each([Number.NaN, Infinity, -1])(
    'keeps invalid legacy total %s out of the timing UI',
    (total) => {
      render(
        <TimingMetricsCell
          useTimeSec={total}
          frtMs={29}
          completionTokens={0}
          isStream
        />
      )
      expect(
        screen.getByLabelText('First response: N/A; Duration: —')
      ).toBeVisible()
      expect(screen.queryByText(/NaN|Infinity|0\.0s/)).toBeNull()
    }
  )

  test('accepts fractional interval boundaries with ordinary summation noise', () => {
    const timing = getRequestTiming(1, undefined, true, {
      version: 2,
      total_ms: 0.3,
      segments: [
        { phase: 'thinking', start_ms: 0, duration_ms: 0.1 },
        { phase: 'tool', start_ms: 0.1, duration_ms: 0.2 },
      ],
    })
    expect(timing.totalMs).toBe(0.3)
    expect(timing.phases).toEqual([
      { phase: 'thinking', durationMs: 0.1 },
      { phase: 'tool', durationMs: 0.2 },
    ])
  })

  test('retains first and total numbers side by side with keyboard-accessible phase details', async () => {
    const user = userEvent.setup()
    render(
      <TimingMetricsCell
        useTimeSec={2}
        frtMs={200}
        completionTokens={10}
        isStream
        timing={{ ...semanticTiming, total_ms: 1750 }}
      />
    )

    const trigger = screen.getByLabelText(
      'First response: 29ms; Duration: 1.75s'
    )
    expect(trigger).toHaveTextContent('29ms1.75s')
    expect(screen.queryByText('First response')).toBeNull()
    expect(screen.queryByText('Duration')).toBeNull()
    const first = screen.getByText('29ms')
    expect(first.parentElement).toHaveClass('flex', 'items-center')
    expect(first.parentElement).not.toHaveClass('flex-col', 'flex-wrap')
    await user.tab()
    expect(trigger).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Tool-call generation'
    )
    expect(screen.getByRole('tooltip')).toHaveTextContent('First text')
  })

  test('retains the existing stream TPS display alongside the revised timing', () => {
    render(<StreamTpsCell isStream tokensPerSecond={42.4} />)
    expect(screen.getByText('Stream')).toBeVisible()
    expect(screen.getByText('42 t/s')).toBeVisible()
  })

  test.each(['zhCN', 'zhTW', 'en', 'fr', 'ru', 'ja', 'vi', 'invalid'])(
    'formats precise timing safely for interface language %s',
    (language) => {
      const locale = toIntlLocale(language)
      const expected = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
      }).format(29.5)
      expect(formatTimingMilliseconds(29.5, locale)).toBe(`${expected}ms`)
      expect(formatTimingMilliseconds(0.0001, locale)).not.toContain('0.0s')
    }
  )

  test('updates precise timing number formatting when the language changes', async () => {
    render(
      <TimingMetricsCell
        useTimeSec={1.75}
        frtMs={29.5}
        completionTokens={0}
        isStream
      />
    )
    expect(screen.getByText('29.5ms')).toBeVisible()
    await i18next.changeLanguage('fr')
    expect(await screen.findByText('29,5ms')).toBeVisible()
    expect(screen.getByText('1,75s')).toBeVisible()
  })
})
