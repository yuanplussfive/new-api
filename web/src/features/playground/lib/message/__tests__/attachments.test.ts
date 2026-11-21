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

import type { MessageAttachment } from '../../../types'
import { appendUserMessagePair } from '../conversation-message-utils'
import { createUserMessage, formatMessageForAPI } from '../message-utils'

const attachment: MessageAttachment = {
  id: 'attachment-1',
  mediaType: 'image/png',
  name: 'diagram.png',
  url: 'data:image/png;base64,AAAA',
}

describe('playground message attachments', () => {
  test('keeps plain string content when a message has no attachments', () => {
    const message = createUserMessage('Hello')

    expect(formatMessageForAPI(message)).toEqual({
      role: 'user',
      content: 'Hello',
    })
  })

  test('sends text and image parts when a message has attachments', () => {
    const message = createUserMessage('Describe this', Date.now(), [attachment])

    expect(formatMessageForAPI(message)).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this' },
        { type: 'image_url', image_url: { url: attachment.url } },
      ],
    })
  })

  test('omits the text part when only attachments are sent', () => {
    const message = createUserMessage('   ', Date.now(), [attachment])

    expect(formatMessageForAPI(message)).toEqual({
      role: 'user',
      content: [{ type: 'image_url', image_url: { url: attachment.url } }],
    })
  })

  test('attaches images to the appended user message', () => {
    const messages = appendUserMessagePair([], 'Look', [attachment])

    expect(messages).toHaveLength(2)
    expect(messages[0]?.attachments).toEqual([attachment])
    expect(messages[1]?.from).toBe('assistant')
  })
})
