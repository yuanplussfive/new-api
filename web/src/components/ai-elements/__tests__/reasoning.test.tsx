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
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { Reasoning, ReasoningContent, ReasoningTrigger } from '../reasoning'

describe('reasoning markdown', () => {
  test('keeps long reasoning formatted as markdown instead of raw text', () => {
    const content = `**bold reasoning**\n\n${'detailed thought '.repeat(2500)}`

    render(
      <Reasoning defaultOpen isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>{content}</ReasoningContent>
      </Reasoning>
    )

    expect(screen.getByText('bold reasoning').tagName).toBe('STRONG')
  })

  test('caps expanded reasoning height and scrolls overflowing content', () => {
    render(
      <Reasoning defaultOpen isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>{'thought '.repeat(4000)}</ReasoningContent>
      </Reasoning>
    )

    const scroll = screen.getByTestId('reasoning-scroll')
    expect(scroll.className).toContain('max-h-[min(40vh,360px)]')
    expect(scroll.className).toContain('overflow-y-auto')
  })

  test('reveals long completed reasoning progressively when opened', async () => {
    const content = `start\n\n${'line\n\n'.repeat(3000)}end-marker`

    render(
      <Reasoning defaultOpen isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>{content}</ReasoningContent>
      </Reasoning>
    )

    expect(screen.queryByText(/end-marker/)).toBeNull()
    await waitFor(() => {
      expect(screen.getByText(/end-marker/)).toBeTruthy()
    })
  })

  test('uses the DeepSeek think glyph in the trigger', () => {
    const { container } = render(
      <Reasoning defaultOpen isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>thought</ReasoningContent>
      </Reasoning>
    )

    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(svg?.querySelectorAll('path')).toHaveLength(2)
  })
})
