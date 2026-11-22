import { render, screen, within } from '@testing-library/react'
import i18next from 'i18next'
import { afterEach, describe, expect, test } from 'vitest'

import { NonStreamTiming } from '../non-stream-timing'
import { RequestActivity } from '../request-activity'

afterEach(async () => {
  await i18next.changeLanguage('en')
})

describe('request activity', () => {
  test('shows reasoning and generated tool calls without duplicating outputs', () => {
    render(
      <RequestActivity
        activity={{
          version: 1,
          reasoning: { used: true, tokens: 512 },
          tools: [
            { type: 'function_call', name: 'lookup', count: 1 },
            { type: 'web_search_call', count: 2 },
          ],
          outputs: ['reasoning', 'function_call', 'message'],
        }}
      />
    )

    const activity = within(
      screen.getByRole('list', { name: 'Request activity' })
    )
    expect(activity.getByText('Reasoning')).toBeVisible()
    expect(activity.getByText('512 tokens')).toBeVisible()
    expect(activity.getByText('Function call')).toBeVisible()
    expect(activity.getByText('lookup')).toBeVisible()
    expect(activity.getByText('Web search')).toBeVisible()
    expect(activity.getByText('×2')).toBeVisible()
    expect(activity.queryByText('Message')).toBeNull()
  })

  test('renders nothing when the response has no semantic activity', () => {
    const { container } = render(<RequestActivity activity={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('non-stream transport timing', () => {
  test('shows upstream wait and response transfer without inventing model phases', () => {
    render(<NonStreamTiming totalMs={2400} upstreamWaitMs={2100} />)

    const timing = within(
      screen.getByRole('group', { name: 'Transport timing' })
    )
    expect(timing.getByText('Duration').nextElementSibling).toHaveTextContent(
      '2.4s'
    )
    expect(timing.getByText('Upstream wait').parentElement).toHaveTextContent(
      '2.1s'
    )
    expect(
      timing.getByText('Response transfer').parentElement
    ).toHaveTextContent('300ms')
    expect(timing.queryByText('Thinking')).toBeNull()
    expect(timing.queryByText('Tool-call generation')).toBeNull()
  })

  test('falls back to a single total-duration bar when no transport split exists', () => {
    render(<NonStreamTiming totalMs={1200} />)

    expect(screen.getByText('Duration').nextElementSibling).toHaveTextContent(
      '1.2s'
    )
    expect(screen.queryByText('Upstream wait')).toBeNull()
    expect(screen.queryByText('Response transfer')).toBeNull()
  })
})
