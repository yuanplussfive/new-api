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
import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProviderMarquee } from '../components/provider-marquee'

const BRANDS = [
  'OpenAI',
  'Claude',
  'Gemini',
  'DeepSeek',
  'Azure OpenAI',
  'AWS Bedrock',
  'Moonshot AI',
  'Zhipu AI',
  'Qwen',
  'Mistral AI',
  'Cohere',
  'Ollama',
  'xAI Grok',
  'Perplexity',
  'Minimax',
  'Doubao',
  'Tencent Hunyuan',
  'Yi',
  'Groq',
  'OpenRouter',
]

let shouldReduceMotion = false

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  return { ...actual, useReducedMotion: () => shouldReduceMotion }
})

function setReducedMotion(matches: boolean): void {
  shouldReduceMotion = matches
}

describe('ProviderMarquee', () => {
  beforeEach(() => {
    setReducedMotion(false)
  })

  it('exposes one complete accessible provider list while hiding the duplicate', async () => {
    render(<ProviderMarquee />)

    const list = screen.getByRole('list', { name: 'Supported providers' })
    const names = within(list)
      .getAllByRole('listitem')
      .map((item) => item.lastElementChild?.textContent)
    expect(names).toEqual(BRANDS)
    const lists = screen.getAllByRole('list', { hidden: true })
    expect(lists).toHaveLength(2)
    expect(lists[1]).toHaveAttribute('aria-hidden', 'true')
    expect(lists[0].parentElement).not.toHaveClass('gap-10')
    expect(lists[0]).toHaveClass('pr-10')
    expect(lists[1]).toHaveClass('pr-10')
    expect(await within(list).findByText('OpenRouter')).toBeVisible()
  })

  it('renders an official Lobe SVG beside every provider name', async () => {
    render(<ProviderMarquee />)

    const list = screen.getByRole('list', { name: 'Supported providers' })
    for (const name of BRANDS) {
      const item = within(list)
        .getAllByText(name)
        .find((element) => element.tagName.toLowerCase() === 'span')
        ?.closest('li')
      expect(item).not.toBeNull()
      await waitFor(() => {
        expect(item?.querySelector('svg')).toBeInTheDocument()
      })
    }
  })

  it('shows every provider in a wrapping static list when motion is reduced', () => {
    setReducedMotion(true)
    render(<ProviderMarquee />)

    const list = screen.getByRole('list', { name: 'Supported providers' })
    expect(list).toHaveClass('flex-wrap')
    expect(within(list).getAllByRole('listitem')).toHaveLength(BRANDS.length)
    const lastProvider = screen
      .getAllByText('OpenRouter')
      .find((element) => element.tagName.toLowerCase() === 'span')
    expect(lastProvider?.closest('.overflow-hidden')).toBeNull()
    expect(lastProvider).toBeVisible()
  })

  it('keeps scrolling continuously without a pause control', () => {
    render(<ProviderMarquee />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getAllByRole('list', { hidden: true })).toHaveLength(2)
  })
})
