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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { StoredConversationInput } from '../../../lib/storage/storage-schema'
import { ChatSider } from '../chat-sider'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const conversations: StoredConversationInput[] = [
  {
    id: 'chat-a',
    title: 'Explain API gateways',
    updatedAt: Date.now(),
    messages: [
      {
        key: 'a1',
        from: 'user',
        versions: [{ id: 'a1-v', content: 'Explain API gateways' }],
      },
    ],
  },
]

function renderSider() {
  const props = {
    conversations,
    activeConversationId: 'chat-a',
    onNewConversation: vi.fn(),
    onSelectConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onRenameConversation: vi.fn(),
    onExportHistory: vi.fn().mockResolvedValue(undefined),
    onImportHistory: vi.fn().mockResolvedValue({ conversations: 1 }),
  }
  render(<ChatSider {...props} />)
  return props
}

describe('chat sider', () => {
  it('renames a session from the hover action', async () => {
    const user = userEvent.setup()
    const props = renderSider()

    await user.click(screen.getByRole('button', { name: 'Rename chat' }))
    const input = screen.getByRole('textbox', { name: 'Rename chat' })
    await user.clear(input)
    await user.type(input, 'Renamed chat{Enter}')

    expect(props.onRenameConversation).toHaveBeenCalledWith(
      'chat-a',
      'Renamed chat'
    )
  })

  it('deletes a session from the hover action', async () => {
    const user = userEvent.setup()
    const props = renderSider()

    await user.click(screen.getByRole('button', { name: 'Delete chat' }))
    expect(props.onDeleteConversation).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(props.onDeleteConversation).toHaveBeenCalledWith('chat-a')
  })

  it('triggers history export and import', async () => {
    const user = userEvent.setup()
    const props = renderSider()

    await user.click(screen.getByRole('button', { name: 'Export history' }))
    expect(props.onExportHistory).toHaveBeenCalledTimes(1)

    const file = new File(['zip'], 'history.zip', { type: 'application/zip' })
    await user.upload(
      screen.getByLabelText('Import history', { selector: 'input' }),
      file
    )
    expect(props.onImportHistory).toHaveBeenCalledWith(file)
  })
})
