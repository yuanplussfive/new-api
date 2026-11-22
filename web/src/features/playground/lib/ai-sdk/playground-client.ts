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
import {
  extractReasoningMiddleware,
  generateText,
  streamText,
  wrapLanguageModel,
  type CallSettings,
  type LanguageModel,
  type ModelMessage,
} from 'ai'

import { getFreshAuthHeaders } from '@/lib/api'

import type {
  Message,
  ParameterEnabled,
  PlaygroundApiFormat,
  PlaygroundConfig,
} from '../../types'
import { toReasoningEffort } from '../thinking/model-thinking'
import { getPlaygroundErrorDetails } from './playground-error'
import { toModelMessages } from './playground-messages'

export interface PlaygroundCompletion {
  content: string
  reasoning?: string
}

export interface PlaygroundStreamCallbacks {
  onUpdate: (type: 'reasoning' | 'content', chunk: string) => void
  onComplete: () => void
  onError: (error: string, errorCode?: string) => void
}

interface PlaygroundRequestBase {
  format: PlaygroundApiFormat
  config: PlaygroundConfig
  parameterEnabled: ParameterEnabled
  messages: Message[]
  signal: AbortSignal
}

export function createPlaygroundFetch(
  group: string,
  authHeaders: Record<string, string>,
  format?: PlaygroundApiFormat
): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers)
    // The gateway authenticates playground calls with the session cookie and
    // New-Api-User header. Provider SDK auth headers would be parsed as an API
    // key instead, so drop them before the request leaves the browser.
    headers.delete('authorization')
    headers.delete('x-api-key')
    headers.delete('x-goog-api-key')
    // Restore the playground's real session credential after removing the
    // provider's placeholder auth headers.
    for (const [key, value] of Object.entries(authHeaders)) {
      if (value) headers.set(key, value)
    }

    let body = init?.body
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>
        parsed.group = group
        body = JSON.stringify(parsed)
      } catch {
        // Non-JSON bodies are not produced by the AI SDK providers.
      }
    }

    const response = await fetch(input, {
      ...init,
      body,
      credentials: 'include',
      headers,
    })
    if (format !== 'chat' || !response.ok) return response

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('text/event-stream')) {
      return transformChatSseResponse(response)
    }
    if (contentType.includes('application/json')) {
      return transformChatJsonResponse(response)
    }
    return response
  }
}

type ChatPayloadRecord = Record<string, unknown>

function isPayloadRecord(value: unknown): value is ChatPayloadRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function getReasoningText(block: ChatPayloadRecord): string | undefined {
  for (const key of ['reasoning_content', 'reasoning']) {
    const value = block[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

/**
 * Chat-completions upstreams commonly return reasoning in the non-standard
 * `reasoning_content` field. The OpenAI Chat provider intentionally ignores it,
 * so wrap it in a think tag that AI SDK's extractReasoningMiddleware can parse.
 */
export function rewriteChatReasoningPayload(payload: unknown): unknown {
  if (!isPayloadRecord(payload) || !Array.isArray(payload.choices)) {
    return payload
  }

  for (const choice of payload.choices) {
    if (!isPayloadRecord(choice)) continue
    for (const key of ['delta', 'message']) {
      const block = choice[key]
      if (!isPayloadRecord(block)) continue
      const reasoning = getReasoningText(block)
      if (!reasoning) continue

      const content = typeof block.content === 'string' ? block.content : ''
      block.content = `<think>${reasoning}</think>${content}`
      delete block.reasoning_content
      delete block.reasoning
    }
  }

  return payload
}

function rewriteChatSseLine(line: string): string {
  if (!line.startsWith('data:')) return line

  const data = line.slice(5).trimStart()
  if (data === '[DONE]' || data === '') return line

  try {
    const payload = JSON.parse(data) as unknown
    return `data: ${JSON.stringify(rewriteChatReasoningPayload(payload))}`
  } catch {
    return line
  }
}

function transformChatSseResponse(response: Response): Response {
  if (!response.body) return response

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true })
        let newline = buffer.indexOf('\n')
        while (newline >= 0) {
          const line = buffer.slice(0, newline)
          buffer = buffer.slice(newline + 1)
          controller.enqueue(encoder.encode(`${rewriteChatSseLine(line)}\n`))
          newline = buffer.indexOf('\n')
        }
      },
      flush(controller) {
        buffer += decoder.decode()
        if (buffer) {
          controller.enqueue(encoder.encode(rewriteChatSseLine(buffer)))
        }
      },
    })
  )

  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

async function transformChatJsonResponse(
  response: Response
): Promise<Response> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return response
  }

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')

  return new Response(JSON.stringify(rewriteChatReasoningPayload(payload)), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

async function createLanguageModel(
  format: PlaygroundApiFormat,
  config: PlaygroundConfig,
  authHeaders: Record<string, string>
): Promise<LanguageModel> {
  const origin = window.location.origin
  const requestFetch = createPlaygroundFetch(config.group, authHeaders, format)
  const common = {
    apiKey: 'playground',
    fetch: requestFetch,
    headers: authHeaders,
  }

  if (format === 'claude') {
    const { createAnthropic } = await import('@ai-sdk/anthropic')
    return createAnthropic({
      ...common,
      baseURL: `${origin}/pg`,
    })(config.model)
  }

  if (format === 'gemini') {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
    return createGoogleGenerativeAI({
      ...common,
      baseURL: `${origin}/pg/v1beta`,
    })(config.model)
  }

  const { createOpenAI } = await import('@ai-sdk/openai')
  const provider = createOpenAI({
    ...common,
    baseURL: `${origin}/pg`,
  })
  if (format === 'responses') {
    return provider.responses(config.model)
  }

  return wrapLanguageModel({
    model: provider.chat(config.model),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  })
}

function buildCallSettings(
  format: PlaygroundApiFormat,
  config: PlaygroundConfig,
  parameterEnabled: ParameterEnabled
): CallSettings {
  const settings: CallSettings = {
    abortSignal: undefined,
    maxRetries: 0,
  }

  if (parameterEnabled.temperature) {
    settings.temperature = config.temperature
  }
  if (parameterEnabled.top_p) {
    settings.topP = config.top_p
  }
  if (parameterEnabled.max_tokens || format === 'claude') {
    settings.maxOutputTokens = config.max_tokens > 0 ? config.max_tokens : 4096
  }
  if (format !== 'claude' && format !== 'gemini') {
    if (parameterEnabled.frequency_penalty) {
      settings.frequencyPenalty = config.frequency_penalty
    }
    if (parameterEnabled.presence_penalty) {
      settings.presencePenalty = config.presence_penalty
    }
    if (parameterEnabled.seed && config.seed !== null) {
      settings.seed = config.seed
    }
  }

  const reasoning = toReasoningEffort(config.thinking)
  if (reasoning) {
    settings.reasoning = reasoning
  }

  return settings
}

async function prepareRequest(options: PlaygroundRequestBase): Promise<{
  model: LanguageModel
  messages: ModelMessage[]
  settings: CallSettings
}> {
  const authHeaders = await getFreshAuthHeaders()
  const model = await createLanguageModel(
    options.format,
    options.config,
    authHeaders
  )
  return {
    model,
    messages: toModelMessages(options.messages),
    settings: buildCallSettings(
      options.format,
      options.config,
      options.parameterEnabled
    ),
  }
}

export async function generatePlaygroundCompletion(
  options: PlaygroundRequestBase
): Promise<PlaygroundCompletion> {
  const { model, messages, settings } = await prepareRequest(options)
  const result = await generateText({
    ...settings,
    abortSignal: options.signal,
    messages,
    model,
  })

  return {
    content: result.text,
    reasoning: result.reasoningText || undefined,
  }
}

export async function streamPlaygroundCompletion(
  options: PlaygroundRequestBase & PlaygroundStreamCallbacks
): Promise<void> {
  let request: Awaited<ReturnType<typeof prepareRequest>>
  try {
    request = await prepareRequest(options)
  } catch (error) {
    if (options.signal.aborted) return
    const details = getPlaygroundErrorDetails(error)
    options.onError(details.message, details.code)
    return
  }

  let completed = false
  try {
    const result = streamText({
      ...request.settings,
      abortSignal: options.signal,
      messages: request.messages,
      model: request.model,
    })

    for await (const part of result.stream) {
      if (options.signal.aborted) return

      if (part.type === 'text-delta') {
        options.onUpdate('content', part.text)
      } else if (part.type === 'reasoning-delta') {
        options.onUpdate('reasoning', part.text)
      } else if (part.type === 'error') {
        const details = getPlaygroundErrorDetails(part.error)
        options.onError(details.message, details.code)
        completed = true
        return
      } else if (part.type === 'abort') {
        return
      } else if (part.type === 'finish') {
        completed = true
        options.onComplete()
        return
      }
    }

    if (!completed && !options.signal.aborted) {
      options.onComplete()
    }
  } catch (error) {
    if (options.signal.aborted) return
    const details = getPlaygroundErrorDetails(error)
    options.onError(details.message, details.code)
  }
}
