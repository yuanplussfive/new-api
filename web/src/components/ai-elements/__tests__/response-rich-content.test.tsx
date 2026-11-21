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
import { describe, expect, test, vi } from 'vitest'

import { Response } from '../response'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({
      svg: '<svg data-testid="mermaid-svg"><text>diagram</text></svg>',
    })),
  },
}))

describe('response rich content', () => {
  test('renders fenced code inside a highlighted code block', async () => {
    const { container } = render(
      <Response final>{'```ts\nconst answer = 42\n```'}</Response>
    )

    await waitFor(() => {
      expect(container.textContent).toContain('const answer = 42')
    })
  })

  test('keeps markdown rendering after the old 20k character cutoff', () => {
    const content = `**bold reasoning**\n\n${'detailed thought '.repeat(2500)}`
    render(<Response final>{content}</Response>)

    expect(screen.getByText('bold reasoning').tagName).toBe('STRONG')
  })

  test('renders inline math through KaTeX', async () => {
    render(<Response final>{'Euler: $e^{i\\pi}+1=0$'}</Response>)

    await waitFor(() => {
      expect(document.querySelector('.katex')).toBeTruthy()
    })
  })

  test('renders a mermaid fence as a diagram instead of plain code', async () => {
    render(<Response final>{'```mermaid\ngraph TD;\nA-->B;\n```'}</Response>)

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-diagram')).toBeTruthy()
    })
    expect(screen.getByTestId('mermaid-svg')).toBeTruthy()
    expect(document.querySelector('pre')?.textContent ?? '').not.toContain(
      'graph TD'
    )
  })
})
