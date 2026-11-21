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
import { describe, expect, it, vi } from 'vitest'

import { ModelGroupSelector } from '../model-group-selector'

const baseProps = {
  selectedModel: 'model-a',
  models: [
    { label: 'Model A', value: 'model-a' },
    { label: 'Model B', value: 'model-b' },
  ],
  onModelChange: vi.fn(),
  selectedGroup: 'default',
  groups: [{ label: 'Default', value: 'default' }],
  onGroupChange: vi.fn(),
}

const apiFormats = [
  { value: 'chat', label: 'Chat Completions' },
  { value: 'responses', label: 'Responses' },
  { value: 'claude', label: 'Claude Messages' },
]

describe('model group selector wire format', () => {
  it('selects the wire format from the model popover', async () => {
    const user = userEvent.setup()
    const onApiFormatChange = vi.fn()
    render(
      <ModelGroupSelector
        {...baseProps}
        apiFormat='chat'
        apiFormats={apiFormats}
        onApiFormatChange={onApiFormatChange}
      />
    )

    await user.click(screen.getByRole('combobox'))
    const responses = await screen.findByRole('button', { name: 'Responses' })
    expect(responses).toHaveAttribute('aria-pressed', 'false')

    await user.click(responses)
    expect(onApiFormatChange).toHaveBeenCalledWith('responses')

    await user.click(screen.getByText('Model B'))
    expect(baseProps.onModelChange).toHaveBeenCalledWith('model-b')
    expect(screen.getByRole('button', { name: 'Responses' })).toBeVisible()
  })

  it('hides wire format controls when the caller does not opt in', async () => {
    const user = userEvent.setup()
    render(<ModelGroupSelector {...baseProps} />)

    await user.click(screen.getByRole('combobox'))
    expect(
      screen.queryByRole('button', { name: 'Responses' })
    ).not.toBeInTheDocument()
  })
})
