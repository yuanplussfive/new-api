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

import {
  applyStreamingChunk,
  completeAssistantMessage,
} from '../message-streaming-utils'
import { createLoadingAssistantMessage } from '../message-utils'

describe('assistant streaming updates', () => {
  test('keeps reasoning and content separate when a stream completes', () => {
    let message = createLoadingAssistantMessage(0)
    message = applyStreamingChunk(message, 'reasoning', 'Thought')
    message = applyStreamingChunk(message, 'content', 'Answer')

    const completed = completeAssistantMessage(message)

    expect(completed.reasoning?.content).toBe('Thought')
    expect(completed.versions[0].content).toBe('Answer')
    expect(completed.status).toBe('complete')
    expect(completed.isReasoningStreaming).toBe(false)
  })

  test('accepts a cumulative chunk without duplicating the existing text', () => {
    let message = createLoadingAssistantMessage(0)
    message = applyStreamingChunk(message, 'reasoning', 'Thought')
    message = applyStreamingChunk(message, 'reasoning', 'Thought continued')
    message = applyStreamingChunk(message, 'content', 'Answer')
    message = applyStreamingChunk(message, 'content', 'Answer continued')

    const completed = completeAssistantMessage(message)

    expect(completed.reasoning?.content).toBe('Thought continued')
    expect(completed.versions[0].content).toBe('Answer continued')
  })

  test('extracts legacy think tags from a content chunk', () => {
    let message = createLoadingAssistantMessage(0)
    message = applyStreamingChunk(
      message,
      'content',
      '<think>Thought</think>Answer'
    )

    const completed = completeAssistantMessage(message)

    expect(completed.reasoning?.content).toBe('Thought')
    expect(completed.versions[0].content).toBe('Answer')
    expect(completed.status).toBe('complete')
  })
})
