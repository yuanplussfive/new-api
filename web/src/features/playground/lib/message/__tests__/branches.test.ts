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
import { describe, expect, test } from 'vitest'

import { createRegeneratedMessages } from '../conversation-message-utils'
import {
  createMessageVersion,
  createUserMessage,
  getCurrentVersion,
  updateCurrentVersionContent,
} from '../message-utils'

const assistantWithBranches = () => ({
  key: 'assistant-1',
  from: 'assistant' as const,
  versions: [createMessageVersion('first answer')],
  createdAt: 1,
})

describe('playground message versions', () => {
  test('returns the first version when no version is selected', () => {
    const message = assistantWithBranches()

    expect(getCurrentVersion(message).content).toBe('first answer')
  })

  test('returns the selected version', () => {
    const message = {
      ...assistantWithBranches(),
      versions: [
        createMessageVersion('first answer'),
        createMessageVersion('second answer'),
      ],
      versionIndex: 1,
    }

    expect(getCurrentVersion(message).content).toBe('second answer')
  })

  test('updates only the selected version', () => {
    const message = {
      ...assistantWithBranches(),
      versions: [
        createMessageVersion('first answer'),
        createMessageVersion('second answer'),
      ],
      versionIndex: 1,
    }

    const updated = updateCurrentVersionContent(message, 'streamed text')

    expect(updated.versions[0].content).toBe('first answer')
    expect(updated.versions[1].content).toBe('streamed text')
  })

  test('regenerating appends a branch and keeps the turn in place', () => {
    const user = createUserMessage('hello', 1)
    const assistant = assistantWithBranches()
    const messages = [user, assistant]

    const regenerated = createRegeneratedMessages(messages, assistant.key)

    expect(regenerated).not.toBeNull()
    expect(regenerated).toHaveLength(2)
    expect(regenerated?.[1].key).toBe(assistant.key)
    expect(regenerated?.[1].versions).toHaveLength(2)
    expect(regenerated?.[1].versionIndex).toBe(1)
    expect(regenerated?.[1].status).toBe('loading')
  })
})
