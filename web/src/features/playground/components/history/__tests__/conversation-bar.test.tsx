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
import { ConversationBar } from '../conversation-bar'

const conversations: StoredConversationInput[] = [
  {
    id: 'chat-a',
    title: 'Explain API gateways',
    messages: [
      {
        key: 'a1',
        from: 'user',
        versions: [{ id: 'a1-v', content: 'Explain API gateways' }],
      },
    ],
    updatedAt: 1,
  },
  {
    id: 'chat-b',
    title: '',
    messages: [],
    updatedAt: 2,
  },
]

function renderBar(
  overrides: Partial<React.ComponentProps<typeof ConversationBar>> = {}
) {
  const props = {
    conversations,
    activeConversationId: 'chat-a',
    onNewConversation: vi.fn(),
    onSelectConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    ...overrides,
  }
  render(<ConversationBar {...props} />)
  return props
}

describe('conversation bar', () => {
  it('starts a new chat from the toolbar', async () => {
    const user = userEvent.setup()
    const props = renderBar()

    await user.click(screen.getByRole('button', { name: 'New chat' }))
    expect(props.onNewConversation).toHaveBeenCalledTimes(1)
  })

  it('lists saved conversations and restores the chosen one', async () => {
    const user = userEvent.setup()
    const props = renderBar()

    await user.click(screen.getByRole('button', { name: 'Chat history' }))

    expect(screen.getByText('Explain API gateways')).toBeVisible()
    expect(screen.getByText('New chat', { selector: 'span' })).toBeVisible()

    await user.click(screen.getByText('Explain API gateways'))
    expect(props.onSelectConversation).toHaveBeenCalledWith('chat-a')
  })

  it('deletes a saved conversation without switching to it', async () => {
    const user = userEvent.setup()
    const props = renderBar()

    await user.click(screen.getByRole('button', { name: 'Chat history' }))
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete chat' })
    await user.click(deleteButtons[0])
    expect(props.onDeleteConversation).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(props.onDeleteConversation).toHaveBeenCalledWith('chat-a')
    expect(props.onSelectConversation).not.toHaveBeenCalled()
  })
})
