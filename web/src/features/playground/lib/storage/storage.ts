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
import { useAuthStore } from '@/stores/auth-store'

import { MESSAGE_STATUS, STORAGE_KEYS } from '../../constants'
import type {
  PlaygroundConfig,
  ParameterEnabled,
  Message,
  ThinkingLevel,
} from '../../types'
import {
  finalizeMessage,
  isAssistantMessagePending,
  sanitizeMessagesOnLoad,
} from '../message/message-streaming-utils'
import { completeAssistantTiming } from '../message/message-timing-utils'
import { hasMessageContent } from '../message/message-utils'
import {
  clearArchivedChats,
  deleteArchivedConversation,
  putArchivedConversation,
  readArchivedConversations,
  readMetaValue,
  writeMetaValue,
} from './chat-database'
import {
  MAX_CONVERSATION_TITLE_LENGTH,
  MAX_LOADED_MESSAGE_CHARS,
  MAX_LOADED_MESSAGES_CHARS,
  MAX_STORED_CONVERSATIONS,
  MAX_STORED_CONVERSATIONS_BYTES,
  MAX_STORED_MESSAGES,
  MAX_STORED_MESSAGES_BYTES,
  STORAGE_VERSION,
  activeConversationSchema,
  conversationsSchema,
  messagesSchema,
  parameterEnabledSchema,
  playgroundConfigSchema,
  thinkingOverridesSchema,
  type StoredConversationInput,
} from './storage-schema'

type StoredEnvelope<T> = {
  version: number
  data: T
}

const TRUNCATED_CONTENT_SUFFIX = '\n\n[...]'
const MIN_PREFIX_COLLAPSE_LENGTH = 2000
const MIN_REPEATED_SECTION_COUNT = 3
const SECTION_HEADING_LINE_PATTERN = /^#{2,6}\s+\d+\.\s+.+$/gm

function getUserStorageKey(key: string): string | null {
  // Legacy data has no owner; never assign it to the next signed-in account.
  for (const legacyKey of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(legacyKey)
  }
  const userId = useAuthStore.getState().auth.user?.id
  return userId == null ? null : `${key}:${userId}`
}

function readStoredValue(baseKey: string): unknown | null {
  const key = getUserStorageKey(baseKey)
  if (!key) return null
  const saved = localStorage.getItem(key)
  if (!saved) return null

  return JSON.parse(saved) as unknown
}

function readStoredMessagesValue(): unknown | null {
  const key = getUserStorageKey(STORAGE_KEYS.MESSAGES)
  if (!key) return null
  const saved = localStorage.getItem(key)
  if (!saved) return null

  if (saved.length > MAX_STORED_MESSAGES_BYTES) {
    localStorage.removeItem(key)
    return null
  }

  return JSON.parse(saved) as unknown
}

function unwrapStoredValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value
  }

  if ('version' in value && 'data' in value) {
    return (value as StoredEnvelope<unknown>).data
  }

  return value
}

function writeStoredValue<T>(baseKey: string, data: T): void {
  const key = getUserStorageKey(baseKey)
  if (!key) return
  const payload: StoredEnvelope<T> = {
    version: STORAGE_VERSION,
    data,
  }

  localStorage.setItem(key, JSON.stringify(payload))
}

function trimMessages(messages: Message[]): Message[] {
  if (messages.length <= MAX_STORED_MESSAGES) {
    return messages
  }

  return messages.slice(-MAX_STORED_MESSAGES)
}

function getMessageSize(message: Message): number {
  const versionsSize = message.versions.reduce(
    (total, version) => total + version.content.length,
    0
  )
  const reasoningSize = message.reasoning?.content.length ?? 0

  return versionsSize + reasoningSize
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  if (maxLength <= TRUNCATED_CONTENT_SUFFIX.length) {
    return text.slice(0, maxLength)
  }

  return `${text.slice(0, maxLength - TRUNCATED_CONTENT_SUFFIX.length)}${TRUNCATED_CONTENT_SUFFIX}`
}

type SectionOccurrence = {
  heading: string
  index: number
}

function getSectionOccurrences(text: string): SectionOccurrence[] {
  const occurrences: SectionOccurrence[] = []
  const matches = text.matchAll(SECTION_HEADING_LINE_PATTERN)
  for (const match of matches) {
    const index = match.index
    if (index === undefined) {
      continue
    }

    occurrences.push({
      heading: match[0],
      index,
    })
  }

  return occurrences
}

function getHeadingCounts(
  occurrences: SectionOccurrence[]
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const occurrence of occurrences) {
    counts.set(occurrence.heading, (counts.get(occurrence.heading) ?? 0) + 1)
  }

  return counts
}

function findLastRepeatedSectionRunStart(text: string): number {
  const occurrences = getSectionOccurrences(text)
  const headingCounts = getHeadingCounts(occurrences)
  const lastRepeatedIndexes: number[] = []
  const seenHeadings = new Set<string>()

  for (let index = occurrences.length - 1; index >= 0; index--) {
    const occurrence = occurrences[index]
    const count = headingCounts.get(occurrence.heading) ?? 0

    if (
      count < MIN_REPEATED_SECTION_COUNT ||
      seenHeadings.has(occurrence.heading)
    ) {
      continue
    }

    seenHeadings.add(occurrence.heading)
    lastRepeatedIndexes.push(occurrence.index)
  }

  if (lastRepeatedIndexes.length === 0) {
    return -1
  }

  return Math.min(...lastRepeatedIndexes)
}

function collapseRepeatedSectionSnapshots(text: string): string {
  if (text.length < MIN_PREFIX_COLLAPSE_LENGTH) {
    return text
  }

  const lastRepeatedRunStart = findLastRepeatedSectionRunStart(text)
  if (lastRepeatedRunStart === -1) {
    return text
  }

  return text.slice(lastRepeatedRunStart)
}

function normalizeStoredMessageForLoad(message: Message): Message {
  let changed = false
  const versions = message.versions.map((version) => {
    const collapsedContent = collapseRepeatedSectionSnapshots(version.content)
    const content = truncateText(collapsedContent, MAX_LOADED_MESSAGE_CHARS)

    if (content === version.content && collapsedContent === version.content) {
      return version
    }

    changed = true
    return {
      ...version,
      content,
    }
  })

  const reasoning = message.reasoning
    ? {
        ...message.reasoning,
        content: truncateText(
          message.reasoning.content,
          MAX_LOADED_MESSAGE_CHARS
        ),
      }
    : undefined

  if (reasoning?.content !== message.reasoning?.content) {
    changed = true
  }

  const normalized = changed ? { ...message, versions, reasoning } : message

  if (!isAssistantMessagePending(normalized)) {
    return normalized
  }

  const hasContent = hasMessageContent(normalized)
  const hasReasoning = normalized.reasoning?.content.trim()

  if (!hasContent && !hasReasoning) {
    return normalized
  }

  const completedAt =
    normalized.completedAt ??
    normalized.reasoning?.completedAt ??
    normalized.startedAt ??
    normalized.createdAt ??
    Date.now()

  return completeAssistantTiming(
    {
      ...finalizeMessage(normalized),
      status: MESSAGE_STATUS.COMPLETE,
      isReasoningStreaming: false,
    },
    completedAt
  )
}

function trimMessagesByContentSize(messages: Message[]): Message[] {
  let totalSize = 0
  const result: Message[] = []

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const messageSize = getMessageSize(message)

    if (
      result.length > 0 &&
      totalSize + messageSize > MAX_LOADED_MESSAGES_CHARS
    ) {
      break
    }

    totalSize += messageSize
    result.push(message)
  }

  return result.reverse()
}

/**
 * Load playground config from localStorage
 */
export function loadConfig(): Partial<PlaygroundConfig> {
  try {
    const saved = readStoredValue(STORAGE_KEYS.CONFIG)
    if (!saved) return {}

    return playgroundConfigSchema.parse(unwrapStoredValue(saved))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load config:', error)
  }
  return {}
}

/**
 * Save playground config to localStorage
 */
export function saveConfig(config: Partial<PlaygroundConfig>): void {
  try {
    const parsed = playgroundConfigSchema.parse(config)
    writeStoredValue(STORAGE_KEYS.CONFIG, parsed)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save config:', error)
  }
}

/**
 * Load parameter enabled state from localStorage
 */
export function loadParameterEnabled(): Partial<ParameterEnabled> {
  try {
    const saved = readStoredValue(STORAGE_KEYS.PARAMETER_ENABLED)
    if (!saved) return {}

    return parameterEnabledSchema.parse(unwrapStoredValue(saved))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load parameter enabled:', error)
  }
  return {}
}

/**
 * Save parameter enabled state to localStorage
 */
export function saveParameterEnabled(
  parameterEnabled: Partial<ParameterEnabled>
): void {
  try {
    const parsed = parameterEnabledSchema.parse(parameterEnabled)
    writeStoredValue(STORAGE_KEYS.PARAMETER_ENABLED, parsed)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save parameter enabled:', error)
  }
}

/**
 * Load messages from localStorage
 */
export function loadMessages(): Message[] | null {
  try {
    const saved = readStoredMessagesValue()
    if (!saved) return null

    const parsed = messagesSchema.parse(unwrapStoredValue(saved)) as Message[]
    const normalized = parsed.map(normalizeStoredMessageForLoad)
    const normalizedChanged = normalized.some(
      (message, index) => message !== parsed[index]
    )
    const trimmed = trimMessages(normalized)
    const sizeTrimmed = trimMessagesByContentSize(trimmed)
    const sanitized = sanitizeMessagesOnLoad(sizeTrimmed)

    if (
      normalizedChanged ||
      trimmed !== normalized ||
      sizeTrimmed !== trimmed ||
      sanitized !== sizeTrimmed
    ) {
      saveMessages(sanitized)
    }

    return sanitized
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load messages:', error)
  }
  return null
}

/**
 * Remove attachment data URLs before writing to localStorage.
 */
function toStoredMessages(
  messages: Message[],
  options: { includeAttachments?: boolean } = {}
): Message[] {
  const trimmed = trimMessages(messages)
  const persisted = trimmed.map((message) => {
    const copy = { ...message }
    // localStorage cannot hold image data URLs, IndexedDB can.
    if (!options.includeAttachments) {
      delete copy.attachments
    }
    return copy
  })
  return messagesSchema.parse(persisted) as Message[]
}

function stripConversationAttachments(
  conversations: StoredConversationInput[]
): StoredConversationInput[] {
  return conversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => {
      const copy: Record<string, unknown> = { ...message }
      delete copy.attachments
      return copy as StoredConversationInput['messages'][number]
    }),
  }))
}

/**
 * Derive a short conversation title from its first user message.
 */
function getConversationTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((message) => message.from === 'user')
  if (!firstUserMessage) return ''

  const firstVersion =
    firstUserMessage.versions[firstUserMessage.versionIndex ?? 0]
  const text = (firstVersion?.content ?? '')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CONVERSATION_TITLE_LENGTH)

  return text
}

/**
 * Load the locally archived conversations, newest first.
 */
export function loadConversations(): StoredConversationInput[] {
  try {
    const saved = readStoredValue(STORAGE_KEYS.CONVERSATIONS)
    if (!saved) return []

    const parsed = conversationsSchema.parse(
      unwrapStoredValue(saved)
    ) as StoredConversationInput[]
    return parsed.sort((left, right) => right.updatedAt - left.updatedAt)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load conversations:', error)
  }
  return []
}

/**
 * Persist the archived conversations list.
 */
export function saveConversations(
  conversations: StoredConversationInput[]
): void {
  try {
    const parsed = conversationsSchema.parse(
      conversations.slice(0, MAX_STORED_CONVERSATIONS)
    )
    // Keep the archive inside the localStorage quota: drop the oldest chats
    // instead of failing the whole write.
    let bounded = parsed
    while (
      bounded.length > 1 &&
      JSON.stringify(bounded).length > MAX_STORED_CONVERSATIONS_BYTES
    ) {
      bounded = bounded.slice(0, -1)
    }
    writeStoredValue(STORAGE_KEYS.CONVERSATIONS, bounded)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save conversations:', error)
  }
}

/**
 * Upsert the active conversation into the archive.
 */
export function saveConversationSnapshot(
  conversation: Pick<StoredConversationInput, 'id' | 'messages'>
): StoredConversationInput[] {
  const storedMessages = toStoredMessages(conversation.messages)
  const snapshot: StoredConversationInput = {
    id: conversation.id,
    title: getConversationTitle(storedMessages),
    messages: storedMessages,
    updatedAt: Date.now(),
  }
  const others = loadConversations().filter(
    (item) => item.id !== conversation.id
  )
  const next = [snapshot, ...others].slice(0, MAX_STORED_CONVERSATIONS)
  saveConversations(next)
  return next
}

export function deleteConversation(id: string): StoredConversationInput[] {
  const next = loadConversations().filter((item) => item.id !== id)
  saveConversations(next)
  return next
}

export function loadActiveConversationId(): string | null {
  try {
    const saved = readStoredValue(STORAGE_KEYS.ACTIVE_CONVERSATION)
    if (!saved) return null
    return activeConversationSchema.parse(unwrapStoredValue(saved))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load active conversation:', error)
  }
  return null
}

/**
 * Remember which conversation is open.
 */
export function saveActiveConversationId(id: string | null): void {
  try {
    if (id === null) {
      const key = getUserStorageKey(STORAGE_KEYS.ACTIVE_CONVERSATION)
      if (key) localStorage.removeItem(key)
      return
    }
    writeStoredValue(
      STORAGE_KEYS.ACTIVE_CONVERSATION,
      activeConversationSchema.parse(id)
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save active conversation:', error)
  }
}

export type ThinkingOverrides = Record<string, ThinkingLevel[]>

/** Per-model thinking level overrides chosen by the user. */
export function loadThinkingOverrides(): ThinkingOverrides {
  try {
    const saved = readStoredValue(STORAGE_KEYS.THINKING_OVERRIDES)
    if (!saved) return {}
    return thinkingOverridesSchema.parse(unwrapStoredValue(saved))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load thinking overrides:', error)
  }
  return {}
}

export function saveThinkingOverrides(overrides: ThinkingOverrides): void {
  try {
    writeStoredValue(
      STORAGE_KEYS.THINKING_OVERRIDES,
      thinkingOverridesSchema.parse(overrides)
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save thinking overrides:', error)
  }
}

/**
 * Save messages to localStorage
 */
export function saveMessages(messages: Message[]): void {
  try {
    writeStoredValue(STORAGE_KEYS.MESSAGES, toStoredMessages(messages))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save messages:', error)
  }
}

const ACTIVE_CONVERSATION_META_KEY = 'active'

/**
 * Read the archive from IndexedDB, migrating any legacy localStorage archive
 * the first time it runs. Falls back to localStorage when IndexedDB is absent
 * (private windows with storage disabled).
 */
export async function loadConversationsAsync(): Promise<
  StoredConversationInput[]
> {
  const fromDatabase = await readArchivedConversations()
  if (fromDatabase === null) {
    return loadConversations()
  }

  if (fromDatabase.length > 0) {
    return fromDatabase
  }

  const legacy = loadConversations()
  for (const conversation of legacy) {
    await putArchivedConversation(conversation)
  }
  return legacy
}

/**
 * Upsert a conversation into IndexedDB (attachments included), pruning the
 * oldest entries past the archive limit.
 */
export async function saveConversationSnapshotAsync(
  conversation: Pick<StoredConversationInput, 'id' | 'messages'>
): Promise<StoredConversationInput[]> {
  const storedMessages = toStoredMessages(conversation.messages, {
    includeAttachments: true,
  })
  const snapshot: StoredConversationInput = {
    id: conversation.id,
    title: getConversationTitle(storedMessages),
    messages: storedMessages,
    updatedAt: Date.now(),
  }
  const existing = await loadConversationsAsync()
  const others = existing.filter((item) => item.id !== conversation.id)
  const next = [snapshot, ...others].slice(0, MAX_STORED_CONVERSATIONS)
  const removed = [snapshot, ...others].slice(MAX_STORED_CONVERSATIONS)

  const saved = await putArchivedConversation(snapshot)
  if (!saved) {
    saveConversations(stripConversationAttachments(next))
    return next
  }

  for (const item of removed) {
    await deleteArchivedConversation(item.id)
  }
  return next
}

export async function renameConversationAsync(
  id: string,
  title: string
): Promise<StoredConversationInput[]> {
  const next = (await loadConversationsAsync()).map((item) =>
    item.id === id
      ? { ...item, title: title.trim().slice(0, MAX_CONVERSATION_TITLE_LENGTH) }
      : item
  )
  const target = next.find((item) => item.id === id)
  if (target) {
    const saved = await putArchivedConversation(target)
    if (!saved) {
      saveConversations(stripConversationAttachments(next))
    }
  }
  return next
}

export async function deleteConversationAsync(
  id: string
): Promise<StoredConversationInput[]> {
  const current = await loadConversationsAsync()
  const next = current.filter((item) => item.id !== id)
  const removed = await deleteArchivedConversation(id)
  if (!removed) {
    saveConversations(stripConversationAttachments(next))
  }
  return next
}

/**
 * Replace the whole archive (history import). IndexedDB is cleared first so
 * conversations missing from the archive do not survive the import.
 */
export async function replaceConversationArchive(
  conversations: StoredConversationInput[]
): Promise<boolean> {
  const bounded = [...conversations]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_STORED_CONVERSATIONS)

  const cleared = await clearArchivedChats()
  if (!cleared) {
    saveConversations(stripConversationAttachments(bounded))
    return false
  }

  for (const conversation of bounded) {
    await putArchivedConversation(conversation)
  }
  return true
}

export async function loadActiveConversationIdAsync(): Promise<string | null> {
  const fromDatabase = await readMetaValue(ACTIVE_CONVERSATION_META_KEY)
  if (fromDatabase !== null) {
    try {
      return activeConversationSchema.parse(fromDatabase)
    } catch {
      return null
    }
  }
  return loadActiveConversationId()
}

export async function saveActiveConversationIdAsync(
  id: string | null
): Promise<void> {
  const saved = await writeMetaValue(ACTIVE_CONVERSATION_META_KEY, id)
  if (!saved) {
    saveActiveConversationId(id)
  }
}

/**
 * Clear the signed-in user's playground data
 */
export function clearPlaygroundData(): void {
  try {
    for (const baseKey of Object.values(STORAGE_KEYS)) {
      const key = getUserStorageKey(baseKey)
      if (key) localStorage.removeItem(key)
    }
    void clearArchivedChats()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear playground data:', error)
  }
}
