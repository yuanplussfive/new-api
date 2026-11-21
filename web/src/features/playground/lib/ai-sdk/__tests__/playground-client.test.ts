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
import { describe, expect, test, vi } from 'vitest'

import type { Message, MessageAttachment } from '../../../types'
import { createUserMessage } from '../../message/message-utils'
import { createPlaygroundFetch } from '../playground-client'
import { getPlaygroundErrorDetails } from '../playground-error'
import { toModelMessages } from '../playground-messages'

const attachment: MessageAttachment = {
  id: 'attachment-1',
  mediaType: 'image/png',
  name: 'diagram.png',
  url: 'data:image/png;base64,AAAA',
}

function assistantMessage(content: string): Message {
  return {
    key: 'assistant-1',
    from: 'assistant',
    versions: [{ id: 'version-1', content }],
    versionIndex: 0,
    status: 'complete',
  }
}

describe('playground AI SDK messages', () => {
  test('maps system, user and assistant roles to model messages', () => {
    const messages: Message[] = [
      {
        key: 'system-1',
        from: 'system',
        versions: [{ id: 'version-1', content: 'Be brief.' }],
        versionIndex: 0,
        status: 'complete',
      },
      createUserMessage('Hello'),
      assistantMessage('Hi'),
    ]

    expect(toModelMessages(messages)).toEqual([
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ])
  })

  test('keeps image attachments as AI SDK image parts', () => {
    const message = createUserMessage('Describe this', Date.now(), [attachment])

    expect(toModelMessages([message])).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this' },
          { type: 'image', image: attachment.url },
        ],
      },
    ])
  })
})

describe('playground AI SDK transport', () => {
  test('injects the group and restores the session credential', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ input, init })
        return new Response('ok')
      }
    )
    vi.stubGlobal('fetch', fetchMock)

    try {
      const requestFetch = createPlaygroundFetch('vip', {
        Authorization: 'Bearer session-key',
        'New-Api-User': '16',
      })
      await requestFetch('/pg/chat/completions', {
        body: JSON.stringify({ model: 'model-a' }),
        headers: {
          Authorization: 'Bearer provider-key',
          'Content-Type': 'application/json',
          'x-api-key': 'provider-key',
        },
        method: 'POST',
      })

      const call = calls[0]
      const headers = new Headers(call?.init?.headers)
      expect(headers.get('authorization')).toBe('Bearer session-key')
      expect(headers.get('x-api-key')).toBeNull()
      expect(headers.get('new-api-user')).toBe('16')
      expect(JSON.parse(String(call?.init?.body))).toEqual({
        model: 'model-a',
        group: 'vip',
      })
      expect(call?.init?.credentials).toBe('include')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('playground AI SDK errors', () => {
  test('reads the gateway message and code from an API response body', () => {
    expect(
      getPlaygroundErrorDetails({
        message: 'Request failed',
        responseBody: JSON.stringify({
          error: { code: 'bad_request', message: 'Invalid input' },
        }),
      })
    ).toEqual({ message: 'Invalid input', code: 'bad_request' })
  })

  test('falls back to the error message when no body is available', () => {
    expect(getPlaygroundErrorDetails(new Error('network down'))).toEqual({
      message: 'network down',
    })
  })
})
