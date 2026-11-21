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
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { StoredConversationInput } from '../../lib/storage/storage-schema'
import { ConversationDeleteConfirmDialog } from './conversation-delete-confirm-dialog'

interface ChatSiderProps {
  conversations: StoredConversationInput[]
  activeConversationId: string
  onNewConversation: () => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onRenameConversation: (id: string, title: string) => void
  onExportHistory: () => Promise<void>
  onImportHistory: (file: File) => Promise<{ conversations: number }>
}

const DAY_MS = 24 * 60 * 60 * 1000

function groupLabel(timestamp: number, t: (key: string) => string): string {
  const days = Math.floor((Date.now() - timestamp) / DAY_MS)
  if (days <= 0) return t('Today')
  if (days === 1) return t('Yesterday')
  if (days < 7) return t('Previous 7 days')
  return t('Earlier')
}

/** Session rail mirroring the reference demo: 261px, pill new-chat, dated list. */
export function ChatSider(props: ChatSiderProps) {
  const { t } = useTranslation()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const result = await props.onImportHistory(file)
      toast.success(
        t('Imported {{count}} conversations', { count: result.conversations })
      )
    } catch {
      toast.error(t('Import failed'))
    }
  }

  const groups: { label: string; items: StoredConversationInput[] }[] = []
  for (const conversation of props.conversations) {
    const label = groupLabel(conversation.updatedAt, t)
    const group = groups.find((item) => item.label === label)
    if (group) group.items.push(conversation)
    else groups.push({ label, items: [conversation] })
  }

  const commitRename = () => {
    if (renamingId) props.onRenameConversation(renamingId, draftTitle)
    setRenamingId(null)
  }

  return (
    <aside className='border-line-subtle bg-surface-subtle/40 hidden w-[261px] shrink-0 flex-col border-r px-3 pt-1.5 lg:flex'>
      <button
        type='button'
        onClick={props.onNewConversation}
        className='bg-background text-foreground border-line hover:bg-surface-hover mt-4 flex h-10 w-full shrink-0 items-center justify-center rounded-full border px-4 text-[14px] font-medium shadow-sm transition-colors'
      >
        <Plus className='mr-1.5 size-4' aria-hidden='true' />
        {t('New chat')}
      </button>

      <div className='mt-6 min-h-0 flex-1 overflow-y-auto pb-4'>
        {groups.length === 0 ? (
          <p className='text-content-muted px-2 pt-2 text-[12.5px]'>
            {t('No saved chats yet')}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className='mb-3'>
              <div className='text-content-muted px-2.5 pb-1 text-[12px] leading-5'>
                {group.label}
              </div>
              <ul>
                {group.items.map((conversation) => {
                  const isActive =
                    conversation.id === props.activeConversationId
                  return (
                    <li key={conversation.id} className='group/item'>
                      {renamingId === conversation.id ? (
                        <Input
                          autoFocus
                          value={draftTitle}
                          onChange={(event) =>
                            setDraftTitle(event.target.value)
                          }
                          onBlur={commitRename}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') commitRename()
                            if (event.key === 'Escape') setRenamingId(null)
                          }}
                          className='h-9 rounded-[12px] text-[13px]'
                          aria-label={t('Rename chat')}
                        />
                      ) : (
                        <div
                          className={
                            isActive
                              ? 'bg-surface-panel text-foreground flex h-10 items-center rounded-[12px] px-2.5'
                              : 'text-content-secondary hover:bg-surface-subtle flex h-10 items-center rounded-[12px] px-2.5'
                          }
                        >
                          <button
                            type='button'
                            className='min-w-0 flex-1 truncate text-left text-[14px] leading-[18px]'
                            title={conversation.title || t('New chat')}
                            onClick={() =>
                              props.onSelectConversation(conversation.id)
                            }
                            onDoubleClick={() => {
                              setRenamingId(conversation.id)
                              setDraftTitle(conversation.title)
                            }}
                          >
                            {conversation.title || t('New chat')}
                          </button>
                          <button
                            type='button'
                            aria-label={t('Rename chat')}
                            className='text-content-muted hover:text-foreground ml-1 hidden size-6 shrink-0 items-center justify-center rounded-full group-hover/item:flex'
                            onClick={() => {
                              setRenamingId(conversation.id)
                              setDraftTitle(conversation.title)
                            }}
                          >
                            <Pencil className='size-3.5' aria-hidden='true' />
                          </button>
                          <button
                            type='button'
                            aria-label={t('Delete chat')}
                            className='text-content-muted hover:text-destructive ml-1 hidden size-6 shrink-0 items-center justify-center rounded-full group-hover/item:flex'
                            onClick={() => setDeleteConfirmId(conversation.id)}
                          >
                            <Trash2 className='size-3.5' aria-hidden='true' />
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </div>

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

      <div className='border-line-subtle flex items-center gap-1 border-t py-2'>
        <Button
          className='text-content-secondary h-8 flex-1 justify-start gap-1.5 px-2 text-[12.5px]'
          onClick={() => void props.onExportHistory()}
          size='sm'
          variant='ghost'
        >
          <Download className='size-3.5' aria-hidden='true' />
          {t('Export history')}
        </Button>
        <Button
          className='text-content-secondary h-8 flex-1 justify-start gap-1.5 px-2 text-[12.5px]'
          onClick={handleImportClick}
          size='sm'
          variant='ghost'
        >
          <Upload className='size-3.5' aria-hidden='true' />
          {t('Import history')}
        </Button>
        <input
          ref={fileInputRef}
          accept='.zip,application/zip'
          aria-label={t('Import history')}
          className='hidden'
          onChange={(event) => void handleImportFile(event)}
          type='file'
        />
      </div>
    </aside>
  )
}
