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
import { History, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import type { StoredConversationInput } from '../../lib/storage/storage-schema'
import { ConversationDeleteConfirmDialog } from './conversation-delete-confirm-dialog'

interface ConversationBarProps {
  conversations: StoredConversationInput[]
  activeConversationId: string
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
}

export function ConversationBar(props: ConversationBarProps) {
  const { t } = useTranslation()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  return (
    <div className='mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-4'>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant='ghost'
              size='sm'
              className='text-content-secondary hover:text-content-strong gap-1.5 px-2'
              aria-label={t('Chat history')}
            />
          }
        >
          <History className='size-4' aria-hidden='true' />
          <span className='text-[12.5px]'>{t('Chat history')}</span>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-72 gap-1 p-1.5'>
          {props.conversations.length === 0 ? (
            <p className='text-content-muted px-2 py-3 text-xs'>
              {t('No saved chats yet')}
            </p>
          ) : (
            <ul className='max-h-80 overflow-y-auto'>
              {props.conversations.map((conversation) => {
                const isActive = conversation.id === props.activeConversationId
                return (
                  <li key={conversation.id}>
                    <div
                      className={
                        isActive
                          ? 'bg-surface-subtle group flex items-center gap-1 rounded-md pr-1'
                          : 'group hover:bg-surface-subtle flex items-center gap-1 rounded-md pr-1'
                      }
                    >
                      <button
                        type='button'
                        onClick={() =>
                          props.onSelectConversation(conversation.id)
                        }
                        className='min-w-0 flex-1 rounded-md px-2 py-1.5 text-left'
                      >
                        <span className='text-content-strong block truncate text-[12.5px]'>
                          {conversation.title || t('New chat')}
                        </span>
                        <span className='text-content-muted block truncate text-[11px]'>
                          {t('{{count}} messages', {
                            count: conversation.messages.length,
                          })}
                        </span>
                      </button>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('Delete chat')}
                        className='text-content-muted hover:text-destructive size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
                        onClick={() => setDeleteConfirmId(conversation.id)}
                      >
                        <Trash2 className='size-3.5' aria-hidden='true' />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      <ConversationDeleteConfirmDialog
        onConfirm={() => {
          if (deleteConfirmId) {
            props.onDeleteConversation(deleteConfirmId)
          }
          setDeleteConfirmId(null)
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null)
        }}
        open={deleteConfirmId !== null}
      />

      <Button
        variant='outline'
        size='sm'
        className='h-8 gap-1.5 rounded-full px-3 text-[12.5px] shadow-none'
        onClick={props.onNewConversation}
      >
        <Plus className='size-3.5' aria-hidden='true' />
        {t('New chat')}
      </Button>
    </div>
  )
}
