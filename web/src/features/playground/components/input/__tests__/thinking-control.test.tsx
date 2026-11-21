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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PlaygroundConfig, ThinkingLevel } from '../../../types'
import { ThinkingControl } from '../thinking-control'

const { openDialog } = vi.hoisted(() => ({ openDialog: vi.fn() }))

vi.mock('../thinking-levels-dialog', () => ({
  ThinkingLevelsDialog: (props: {
    open: boolean
    modelId: string
    levels: ThinkingLevel[]
  }) => {
    openDialog(props)
    return props.open ? (
      <div role='dialog' aria-label='thinking-levels-dialog' />
    ) : null
  },
}))

function buildConfig(
  thinking: PlaygroundConfig['thinking'],
  model = 'claude-opus-4-6'
): PlaygroundConfig {
  return {
    apiFormat: 'chat',
    model,
    group: 'default',
    temperature: 0.7,
    top_p: 1,
    max_tokens: 1024,
    frequency_penalty: 0,
    presence_penalty: 0,
    seed: null,
    stream: true,
    thinking,
  }
}

function renderControl(
  thinking: PlaygroundConfig['thinking'],
  model?: string,
  overrides: Record<string, ThinkingLevel[]> = {}
) {
  const onConfigChange = vi.fn()
  const onThinkingOverrideChange = vi.fn()
  render(
    <ThinkingControl
      config={buildConfig(thinking, model)}
      onConfigChange={onConfigChange}
      onThinkingOverrideChange={onThinkingOverrideChange}
      overrides={overrides}
    />
  )
  return { onConfigChange, onThinkingOverrideChange }
}

beforeEach(() => {
  openDialog.mockClear()
})

describe('thinking control', () => {
  it('lists exactly the levels supported by the selected model', async () => {
    const user = userEvent.setup()
    renderControl('off')

    await user.click(screen.getByRole('button', { name: 'Thinking' }))

    // claude-opus-4-6 supports off/minimal/low/medium/high/max in the catalog.
    expect(screen.getByRole('button', { name: 'Low' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Medium' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'High' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Max' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Extra high' })).toBeNull()
  })

  it('reports the chosen level to the config owner', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = renderControl('off')

    await user.click(screen.getByRole('button', { name: 'Thinking' }))
    await user.click(screen.getByRole('button', { name: 'High' }))

    expect(onConfigChange).toHaveBeenCalledWith('thinking', 'high')
  })

  it('disables the picker for models without reasoning support', async () => {
    const user = userEvent.setup()
    renderControl('off', 'gpt-4o')

    await user.click(screen.getByRole('button', { name: 'Thinking' }))

    expect(
      screen.getByText('This model does not support thinking')
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Low' })).toBeNull()
  })

  it('applies custom level overrides for the model', async () => {
    const user = userEvent.setup()
    renderControl('off', 'gpt-4o', { 'gpt-4o': ['off', 'high'] })

    await user.click(screen.getByRole('button', { name: 'Thinking' }))

    expect(screen.getByRole('button', { name: 'High' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Low' })).toBeNull()
  })

  it('labels the trigger with the active level', () => {
    renderControl('medium')

    expect(screen.getByRole('button', { name: 'Thinking' })).toHaveTextContent(
      'Medium'
    )
  })
})
