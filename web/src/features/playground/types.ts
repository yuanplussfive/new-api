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
// Message types
export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'loading' | 'streaming' | 'complete' | 'error'

export type PlaygroundMessageLayoutMode = 'alternating' | 'left'

export interface MessageVersion {
  id: string
  content: string
}

export interface MessageAttachment {
  id: string
  name: string
  mediaType: string
  /** Data URL kept in memory; stripped before persisting to localStorage. */
  url: string
}

export interface Message {
  key: string
  from: MessageRole
  versions: MessageVersion[]
  /** Active version index; regenerating appends a version and selects it. */
  versionIndex?: number
  attachments?: MessageAttachment[]
  createdAt?: number
  startedAt?: number
  completedAt?: number
  durationMs?: number
  sources?: { href: string; title: string }[]
  reasoning?: {
    content: string
    duration: number
    startedAt?: number
    completedAt?: number
    durationMs?: number
  }
  isReasoningStreaming?: boolean
  isReasoningComplete?: boolean
  isContentComplete?: boolean
  status?: MessageStatus
  errorCode?: string | null
}

// API payload types
export interface ChatCompletionMessage {
  role: MessageRole
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

// Configuration types
export type PlaygroundApiFormat = 'chat' | 'responses' | 'claude' | 'gemini'

export interface PlaygroundConfig {
  model: string
  /** Wire protocol used by the next request; persisted with the config. */
  apiFormat: PlaygroundApiFormat
  /** Per-model wire protocol overrides, restored when switching models. */
  apiFormatByModel?: Record<string, PlaygroundApiFormat>
  /** Last model picked in each group, restored when switching back. */
  modelByGroup?: Record<string, string>
  group: string
  temperature: number
  top_p: number
  max_tokens: number
  frequency_penalty: number
  presence_penalty: number
  seed: number | null
  stream: boolean
  /** Reasoning effort: off keeps the provider default (no thinking request). */
  thinking: ThinkingLevel
}

export type ThinkingLevel =
  | 'off'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max'

export interface ParameterEnabled {
  temperature: boolean
  top_p: boolean
  max_tokens: boolean
  frequency_penalty: boolean
  presence_penalty: boolean
  seed: boolean
}

// Model and group options
export interface ModelOption {
  label: string
  value: string
  /** Icon key configured in model settings; absent means no icon. */
  icon?: string
}

export interface GroupOption {
  label: string
  value: string
  ratio: number | string
  desc?: string
}
