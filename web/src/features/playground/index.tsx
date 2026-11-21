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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { PlaygroundChat } from './components/chat/playground-chat'
import { ChatSider } from './components/history/chat-sider'
import { ConversationBar } from './components/history/conversation-bar'
import { PlaygroundInput } from './components/input/playground-input'
import {
  useChatHandler,
  usePlaygroundConversation,
  usePlaygroundOptions,
  usePlaygroundState,
} from './hooks'

export function Playground() {
  const { t } = useTranslation()
  const {
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    models,
    groups,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
    updateParameterEnabled,
    clearMessages,
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
  } = usePlaygroundState()

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  const {
    editingMessageKey,
    handleSendMessage,
    handleRegenerateMessage,
    handleEditMessage,
    handleEditOpenChange,
    applyEdit,
    handleDeleteMessage,
    handleSelectVersion,
  } = usePlaygroundConversation({
    messages,
    updateMessages,
    sendChat,
  })

  const handleClearMessages = () => {
    handleEditOpenChange(false)
    clearMessages()
  }

  const { isLoadingModels } = usePlaygroundOptions({
    currentGroup: config.group,
    currentModel: config.model,
    setGroups,
    setModels,
    updateConfig,
  })

  return (
    <div className='chat-surface relative flex size-full min-h-0 overflow-hidden'>
      <ChatSider
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={() => {
          handleEditOpenChange(false)
          startNewConversation()
        }}
        onSelectConversation={selectConversation}
        onDeleteConversation={removeConversation}
        onRenameConversation={renameArchivedConversation}
        onExportHistory={exportHistory}
        onImportHistory={importHistory}
      />

      <div
        className={cn(
          'relative flex min-w-0 flex-1 flex-col overflow-hidden',
          messages.length === 0 && 'justify-center'
        )}
      >
        <div className='lg:hidden'>
          <ConversationBar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onNewConversation={() => {
              handleEditOpenChange(false)
              startNewConversation()
            }}
            onSelectConversation={selectConversation}
            onDeleteConversation={removeConversation}
          />
        </div>

        {/* Full-width scroll container: scrolling works even over side whitespace */}
        <div
          className={cn(
            'flex min-h-0 flex-col overflow-hidden',
            messages.length > 0 && 'flex-1'
          )}
        >
          <PlaygroundChat
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onRegenerateMessage={handleRegenerateMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onSelectVersion={handleSelectVersion}
            onSelectPrompt={handleSendMessage}
            isGenerating={isGenerating}
            editingKey={editingMessageKey}
            onCancelEdit={handleEditOpenChange}
            onSaveEdit={(newContent) => applyEdit(newContent, false)}
            onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
          />
        </div>

        {/* Input area: center content and constrain to the same container width */}
        <div className='mx-auto w-full max-w-(--chat-column-max) px-(--chat-column-padding) pb-4'>
          <PlaygroundInput
            config={config}
            disabled={isGenerating}
            groups={groups}
            groupValue={config.group}
            isGenerating={isGenerating}
            isModelLoading={isLoadingModels}
            modelValue={config.model}
            models={models}
            onGroupChange={(value) => updateConfig('group', value)}
            onConfigChange={updateConfig}
            onClearMessages={handleClearMessages}
            onModelChange={(value) => updateConfig('model', value)}
            onParameterEnabledChange={updateParameterEnabled}
            onStop={stopGeneration}
            onSubmit={(text, attachments) =>
              handleSendMessage(text, attachments)
            }
            parameterEnabled={parameterEnabled}
            thinkingOverrides={thinkingOverrides}
            onThinkingOverrideChange={setThinkingOverride}
            hasMessages={messages.length > 0}
          />
          <p className='text-content-muted mt-2 text-center text-[11px] leading-4 sm:hidden'>
            {t('Content is AI-generated; please verify important information.')}
          </p>
        </div>
      </div>
    </div>
  )
}
