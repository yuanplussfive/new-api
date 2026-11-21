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
import type {
  AssistantModelMessage,
  ModelMessage,
  SystemModelMessage,
  UserModelMessage,
} from 'ai'

import type { Message } from '../../types'
import { formatMessageForAPI, isValidMessage } from '../message/message-utils'

type FormattedPart =
  | { type: 'text'; text?: string }
  | { type: 'image_url'; image_url?: { url?: string } }

function toAssistantContent(message: Message): string {
  const formatted = formatMessageForAPI(message)
  if (typeof formatted.content === 'string') return formatted.content

  return (formatted.content as FormattedPart[])
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('')
}

function toUserContent(message: Message): UserModelMessage['content'] {
  const formatted = formatMessageForAPI(message)
  if (typeof formatted.content === 'string') return formatted.content

  const parts: Array<
    { type: 'text'; text: string } | { type: 'image'; image: string }
  > = []
  for (const part of formatted.content as FormattedPart[]) {
    if (part.type === 'text') {
      parts.push({ type: 'text', text: part.text ?? '' })
      continue
    }
    const url = part.image_url?.url
    if (url) parts.push({ type: 'image', image: url })
  }
  return parts
}

/**
 * Translate the playground's versioned messages into AI SDK model messages.
 * Only the active version is sent, matching the previous wire builders.
 */
export function toModelMessages(messages: Message[]): ModelMessage[] {
  return messages.filter(isValidMessage).map((message) => {
    if (message.from === 'system') {
      return {
        role: 'system',
        content: toAssistantContent(message),
      } satisfies SystemModelMessage
    }

    if (message.from === 'assistant') {
      return {
        role: 'assistant',
        content: toAssistantContent(message),
      } satisfies AssistantModelMessage
    }

    return {
      role: 'user',
      content: toUserContent(message),
    } satisfies UserModelMessage
  })
}
