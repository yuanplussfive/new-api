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
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { loadConversations, saveConversations } from '../../storage/storage'
import type { StoredConversationInput } from '../../storage/storage-schema'
import { exportChatHistory, importChatHistory } from '../history'
import { createZip } from '../zip'

const archivedConversation: StoredConversationInput[] = [
  {
    id: 'chat-imported',
    title: 'Imported chat',
    updatedAt: 1,
    messages: [
      {
        key: 'msg-1',
        from: 'user',
        versions: [{ id: 'version-1', content: 'hello archive' }],
      },
    ],
  },
]

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.setUser({ id: 7, username: 'history', role: 1 })
})

afterEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

describe('chat history archive', () => {
  test('exports the archive as a ZIP containing manifest and conversations', async () => {
    saveConversations(archivedConversation)

    const blob = await exportChatHistory()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const { readZip, decodeZipText } = await import('../zip')
    const files = await readZip(bytes)

    expect(files.has('manifest.json')).toBe(true)
    expect(files.has('conversations.json')).toBe(true)
    expect(decodeZipText(files, 'manifest.json')).toContain(
      '"conversations": 1'
    )
    expect(decodeZipText(files, 'conversations.json')).toContain(
      'Imported chat'
    )
  })

  test('imports a ZIP and replaces the local archive', async () => {
    const encoder = new TextEncoder()
    const archive = createZip([
      {
        name: 'conversations.json',
        data: encoder.encode(
          JSON.stringify({ conversations: archivedConversation })
        ),
      },
    ])
    const file = new File([archive], 'history.zip', {
      type: 'application/zip',
    })

    const result = await importChatHistory(file)

    expect(result).toEqual({ conversations: 1, messages: 1 })
    expect(loadConversations()[0]?.title).toBe('Imported chat')
  })

  test('rejects an archive without conversations.json', async () => {
    const encoder = new TextEncoder()
    const archive = createZip([
      { name: 'manifest.json', data: encoder.encode('{}') },
    ])
    const file = new File([archive], 'empty.zip', { type: 'application/zip' })

    await expect(importChatHistory(file)).rejects.toThrow(
      'does not contain conversations.json'
    )
  })
})
