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
import { afterEach, beforeEach, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { STORAGE_KEYS } from '../../../constants'
import type { Message } from '../../../types'
import {
  clearPlaygroundData,
  deleteConversation,
  loadActiveConversationId,
  loadConfig,
  loadConversations,
  loadMessages,
  loadParameterEnabled,
  saveActiveConversationId,
  saveConfig,
  saveConversationSnapshot,
  saveMessages,
  saveParameterEnabled,
} from '../storage'

const messages: Message[] = [
  {
    key: 'a-chat',
    from: 'user',
    versions: [{ id: 'a-version', content: 'Account A private chat' }],
  },
]

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

afterEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

test('switching accounts isolates config, messages and parameter toggles and preserves returning account data', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  saveConfig({ model: 'account-a-model' })
  saveMessages(messages)
  saveParameterEnabled({ temperature: true })

  useAuthStore.getState().auth.reset()
  useAuthStore.getState().auth.setUser({ id: 2, username: 'B', role: 1 })
  expect(loadConfig()).toEqual({})
  expect(loadMessages()).toBeNull()
  expect(loadParameterEnabled()).toEqual({})
  saveConfig({ model: 'account-b-model' })
  saveMessages([])
  saveParameterEnabled({ temperature: false })

  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  expect(loadConfig()).toEqual({ model: 'account-a-model' })
  expect(loadMessages()).toEqual(messages)
  expect(loadParameterEnabled()).toEqual({ temperature: true })

  clearPlaygroundData()
  expect(loadMessages()).toBeNull()
  useAuthStore.getState().auth.setUser({ id: 2, username: 'B', role: 1 })
  expect(loadConfig()).toEqual({ model: 'account-b-model' })
  expect(loadMessages()).toEqual([])
  expect(loadParameterEnabled()).toEqual({ temperature: false })
})

test('persists the per-model wire format map', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  saveConfig({
    apiFormat: 'responses',
    apiFormatByModel: { 'model-a': 'responses', 'model-b': 'claude' },
    modelByGroup: { default: 'model-a', vip: 'model-b' },
  })

  expect(loadConfig()).toEqual({
    apiFormat: 'responses',
    apiFormatByModel: { 'model-a': 'responses', 'model-b': 'claude' },
    modelByGroup: { default: 'model-a', vip: 'model-b' },
  })
})

test('legacy global data is removed instead of assigned to the first signed-in account', () => {
  localStorage.setItem(
    STORAGE_KEYS.CONFIG,
    JSON.stringify({ model: 'legacy-model' })
  )
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
  localStorage.setItem(
    STORAGE_KEYS.PARAMETER_ENABLED,
    JSON.stringify({ temperature: true })
  )
  useAuthStore.getState().auth.setUser({ id: 2, username: 'B', role: 1 })

  expect(loadConfig()).toEqual({})
  expect(loadMessages()).toBeNull()
  expect(loadParameterEnabled()).toEqual({})
  for (const key of Object.values(STORAGE_KEYS)) {
    expect(localStorage.getItem(key)).toBeNull()
  }
})

test('storage calls without a signed-in user do not persist shared data', () => {
  saveConfig({ model: 'signed-out-model' })
  saveMessages(messages)
  saveParameterEnabled({ temperature: true })
  expect(loadConfig()).toEqual({})
  expect(loadMessages()).toBeNull()
  expect(loadParameterEnabled()).toEqual({})
  expect(localStorage.length).toBe(0)
})

test('archives conversations locally and restores the last opened one', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })

  const first = saveConversationSnapshot({ id: 'chat-a', messages })
  expect(first).toHaveLength(1)
  expect(first[0].title).toBe('Account A private chat')

  const secondMessages: Message[] = [
    {
      key: 'b-chat',
      from: 'user',
      versions: [{ id: 'b-version', content: 'Second conversation' }],
    },
  ]
  const second = saveConversationSnapshot({
    id: 'chat-b',
    messages: secondMessages,
  })
  expect(second.map((item) => item.id)).toEqual(['chat-b', 'chat-a'])

  const updated = saveConversationSnapshot({
    id: 'chat-a',
    messages: [...messages, { ...messages[0], key: 'a-follow-up' }],
  })
  expect(updated.map((item) => item.id)).toEqual(['chat-a', 'chat-b'])

  saveActiveConversationId('chat-a')
  expect(loadActiveConversationId()).toBe('chat-a')
  expect(loadConversations().map((item) => item.id)).toEqual([
    'chat-a',
    'chat-b',
  ])

  expect(deleteConversation('chat-b').map((item) => item.id)).toEqual([
    'chat-a',
  ])
  saveActiveConversationId(null)
  expect(loadActiveConversationId()).toBeNull()
})

test('conversation archive is scoped to the signed-in account and cleared with playground data', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  saveConversationSnapshot({ id: 'chat-a', messages })
  saveActiveConversationId('chat-a')

  useAuthStore.getState().auth.setUser({ id: 2, username: 'B', role: 1 })
  expect(loadConversations()).toEqual([])
  expect(loadActiveConversationId()).toBeNull()

  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  expect(loadConversations()).toHaveLength(1)

  clearPlaygroundData()
  expect(loadConversations()).toEqual([])
  expect(loadActiveConversationId()).toBeNull()
})
