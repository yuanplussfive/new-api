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
import { useCallback, useEffect, useRef, useState } from 'react'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../constants'
import {
  saveConfig,
  saveParameterEnabled,
  saveThinkingOverrides,
  loadThinkingOverrides,
  type ThinkingOverrides,
  saveMessages,
  saveActiveConversationIdAsync,
  saveConversationSnapshotAsync,
  applyMessageStateUpdate,
  getInitialParameterEnabled,
  getInitialPlaygroundConfig,
  loadActiveConversationIdAsync,
  deleteConversationAsync,
  loadConversationsAsync,
  renameConversationAsync,
  loadMessages,
  type MessageStateUpdater,
} from '../lib'
import {
  downloadChatHistory,
  exportChatHistory,
  importChatHistory,
} from '../lib/history/history'
import type { StoredConversationInput } from '../lib/storage/storage-schema'
import {
  clampThinkingLevel,
  normalizeModelId,
} from '../lib/thinking/model-thinking'
import type {
  Message,
  PlaygroundConfig,
  ParameterEnabled,
  ThinkingLevel,
  ModelOption,
  GroupOption,
} from '../types'

const MESSAGE_SAVE_DEBOUNCE_MS = 500

/**
 * Main state management hook for playground
 */
export function usePlaygroundState() {
  // Load initial state from localStorage
  const [config, setConfig] = useState<PlaygroundConfig>(
    getInitialPlaygroundConfig
  )

  const [parameterEnabled, setParameterEnabled] = useState<ParameterEnabled>(
    getInitialParameterEnabled
  )
  const [thinkingOverrides, setThinkingOverridesState] =
    useState<ThinkingOverrides>(() => loadThinkingOverrides())
  const thinkingOverridesRef = useRef<ThinkingOverrides>(thinkingOverrides)

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [conversations, setConversations] = useState<StoredConversationInput[]>(
    []
  )
  const [activeConversationId, setActiveConversationId] = useState(() =>
    createConversationId()
  )
  const activeConversationIdRef = useRef(activeConversationId)
  const messagesSaveTimerRef = useRef<number | null>(null)
  const latestMessagesRef = useRef<Message[]>(messages)
  const hasLoadedMessagesRef = useRef(false)

  const [models, setModels] = useState<ModelOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])

  const persistMessages = useCallback((messagesToSave: Message[]) => {
    latestMessagesRef.current = messagesToSave

    if (!hasLoadedMessagesRef.current) {
      return
    }

    if (messagesSaveTimerRef.current !== null) {
      window.clearTimeout(messagesSaveTimerRef.current)
    }

    messagesSaveTimerRef.current = window.setTimeout(() => {
      messagesSaveTimerRef.current = null
      // Keep a compact text-only copy in localStorage as a crash fallback;
      // the full conversation (attachments included) lives in IndexedDB.
      saveMessages(latestMessagesRef.current)
      if (latestMessagesRef.current.length > 0) {
        void saveConversationSnapshotAsync({
          id: activeConversationIdRef.current,
          messages: latestMessagesRef.current,
        }).then(setConversations)
      }
    }, MESSAGE_SAVE_DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    let cancelled = false
    thinkingOverridesRef.current = loadThinkingOverrides()
    setThinkingOverridesState(thinkingOverridesRef.current)
    setConfig((previous) => {
      const thinking = clampThinkingLevel(
        previous.model,
        previous.thinking,
        thinkingOverridesRef.current
      )
      if (thinking === previous.thinking) return previous
      const next = { ...previous, thinking }
      saveConfig(next)
      return next
    })

    void (async () => {
      const archived = await loadConversationsAsync()
      const storedActiveId = await loadActiveConversationIdAsync()
      const archivedActive =
        storedActiveId === null
          ? null
          : (archived.find((item) => item.id === storedActiveId) ?? null)
      const loadedMessages = archivedActive
        ? archivedActive.messages
        : (loadMessages() ?? [])
      if (cancelled) {
        return
      }

      const nextActiveId =
        archivedActive?.id ?? storedActiveId ?? createConversationId()
      activeConversationIdRef.current = nextActiveId
      void saveActiveConversationIdAsync(nextActiveId)
      latestMessagesRef.current = loadedMessages
      hasLoadedMessagesRef.current = true
      setConversations(archived)
      setActiveConversationId(nextActiveId)
      setMessages(loadedMessages)
      setIsLoadingMessages(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(
    () => () => {
      if (messagesSaveTimerRef.current !== null) {
        window.clearTimeout(messagesSaveTimerRef.current)
        saveMessages(latestMessagesRef.current)
      }
    },
    []
  )

  // Update config with automatic save
  const updateConfig = useCallback(
    <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => {
      setConfig((prev) => {
        const updated = { ...prev, [key]: value }
        if (key === 'model' && typeof value === 'string') {
          updated.thinking = clampThinkingLevel(
            value,
            prev.thinking,
            thinkingOverridesRef.current
          )
          updated.apiFormat =
            prev.apiFormatByModel?.[value] ?? DEFAULT_CONFIG.apiFormat
          updated.modelByGroup = {
            ...prev.modelByGroup,
            [prev.group]: value,
          }
        }
        if (key === 'group' && typeof value === 'string') {
          updated.model = prev.modelByGroup?.[value] ?? prev.model
        }
        if (key === 'apiFormat') {
          updated.apiFormatByModel = {
            ...prev.apiFormatByModel,
            [prev.model]: value as PlaygroundConfig['apiFormat'],
          }
        }
        saveConfig(updated)
        return updated
      })
    },
    []
  )

  // Update parameter enabled with automatic save
  const updateParameterEnabled = useCallback(
    (key: keyof ParameterEnabled, value: boolean) => {
      setParameterEnabled((prev) => {
        const updated = { ...prev, [key]: value }
        saveParameterEnabled(updated)
        return updated
      })
    },
    []
  )

  // Update messages with automatic save
  const updateMessages = useCallback(
    (updater: MessageStateUpdater) => {
      setMessages((prev) => {
        const newMessages = applyMessageStateUpdate(prev, updater)
        persistMessages(newMessages)
        return newMessages
      })
    },
    [persistMessages]
  )

  // Clear all messages
  const clearMessages = useCallback(() => {
    updateMessages([])
  }, [updateMessages])

  // Start a fresh conversation and archive the previous one
  const startNewConversation = useCallback(() => {
    if (latestMessagesRef.current.length > 0) {
      void saveConversationSnapshotAsync({
        id: activeConversationIdRef.current,
        messages: latestMessagesRef.current,
      }).then(setConversations)
    }
    const nextId = createConversationId()
    activeConversationIdRef.current = nextId
    void saveActiveConversationIdAsync(nextId)
    latestMessagesRef.current = []
    hasLoadedMessagesRef.current = true
    saveMessages([])
    setActiveConversationId(nextId)
    setMessages([])
  }, [])

  // Switch to an archived conversation
  const selectConversation = useCallback(
    (id: string) => {
      if (id === activeConversationIdRef.current) return
      const target = conversations.find((item) => item.id === id)
      if (!target) return

      if (latestMessagesRef.current.length > 0) {
        void saveConversationSnapshotAsync({
          id: activeConversationIdRef.current,
          messages: latestMessagesRef.current,
        }).then(setConversations)
      }

      activeConversationIdRef.current = id
      void saveActiveConversationIdAsync(id)
      latestMessagesRef.current = target.messages
      saveMessages(target.messages)
      setActiveConversationId(id)
      setMessages(target.messages)
    },
    [conversations]
  )

  // Rename an archived conversation
  const renameArchivedConversation = useCallback(
    (id: string, title: string) => {
      void renameConversationAsync(id, title).then(setConversations)
    },
    []
  )

  // Delete an archived conversation
  const removeConversation = useCallback(
    (id: string) => {
      void deleteConversationAsync(id).then(setConversations)
      if (id === activeConversationIdRef.current) {
        // Drop the in-memory copy first, otherwise starting a new conversation
        // would archive the deleted one right back into storage.
        latestMessagesRef.current = []
        startNewConversation()
      }
    },
    [startNewConversation]
  )

  // Custom thinking levels for one model
  const setThinkingOverride = useCallback(
    (modelId: string, levels: ThinkingLevel[] | null) => {
      const key = normalizeModelId(modelId)
      const next = { ...thinkingOverridesRef.current }
      if (levels && levels.length > 0) {
        next[key] = levels
      } else {
        delete next[key]
      }
      thinkingOverridesRef.current = next
      setThinkingOverridesState(next)
      saveThinkingOverrides(next)
      setConfig((prev) => {
        if (prev.model !== modelId) return prev
        const thinking = clampThinkingLevel(prev.model, prev.thinking, next)
        if (thinking === prev.thinking) return prev
        const updated = { ...prev, thinking }
        saveConfig(updated)
        return updated
      })
    },
    []
  )

  // Export the whole archive as a ZIP download
  const exportHistory = useCallback(async () => {
    const blob = await exportChatHistory()
    downloadChatHistory(blob)
  }, [])

  // Replace the archive with an imported ZIP and open its newest chat
  const importHistory = useCallback(async (file: File) => {
    const result = await importChatHistory(file)
    const archived = await loadConversationsAsync()
    const newest = archived[0]
    setConversations(archived)
    if (newest) {
      activeConversationIdRef.current = newest.id
      void saveActiveConversationIdAsync(newest.id)
      latestMessagesRef.current = newest.messages
      setActiveConversationId(newest.id)
      setMessages(newest.messages)
    }
    return result
  }, [])

  // Reset config to defaults
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
    setParameterEnabled(DEFAULT_PARAMETER_ENABLED)
    saveConfig(DEFAULT_CONFIG)
    saveParameterEnabled(DEFAULT_PARAMETER_ENABLED)
  }, [])

  return {
    // State
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    models,
    groups,

    // Setters
    setModels,
    setGroups,

    // Conversations
    conversations,
    activeConversationId,
    startNewConversation,
    selectConversation,
    removeConversation,
    renameArchivedConversation,
    exportHistory,
    importHistory,
    thinkingOverrides,
    setThinkingOverride,

    // Actions
    updateConfig,
    updateParameterEnabled,
    updateMessages,
    clearMessages,
    resetConfig,
  }
}

function createConversationId(): string {
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
