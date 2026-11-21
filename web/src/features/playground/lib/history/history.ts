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
  loadConversationsAsync,
  replaceConversationArchive,
} from '../storage/storage'
import {
  conversationsSchema,
  type StoredConversationInput,
} from '../storage/storage-schema'
import { createZip, decodeZipText, readZip } from './zip'

export const HISTORY_ARCHIVE_VERSION = 1
const MAX_IMPORT_BYTES = 50 * 1024 * 1024
const MANIFEST_FILE = 'manifest.json'
const CONVERSATIONS_FILE = 'conversations.json'
const textEncoder = new TextEncoder()

interface HistoryManifest {
  app: 'new-api-playground'
  version: number
  exportedAt: string
  conversations: number
  messages: number
}

export interface HistoryImportResult {
  conversations: number
  messages: number
}

function countMessages(conversations: StoredConversationInput[]): number {
  return conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0
  )
}

/** Serialize every archived conversation (attachments included) into a ZIP. */
export async function exportChatHistory(): Promise<Blob> {
  const conversations = await loadConversationsAsync()
  const manifest: HistoryManifest = {
    app: 'new-api-playground',
    version: HISTORY_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    conversations: conversations.length,
    messages: countMessages(conversations),
  }

  const archive = createZip([
    {
      name: MANIFEST_FILE,
      data: textEncoder.encode(JSON.stringify(manifest, null, 2)),
    },
    {
      name: CONVERSATIONS_FILE,
      data: textEncoder.encode(JSON.stringify({ conversations })),
    },
  ])

  return new Blob([archive], { type: 'application/zip' })
}

/** Read a history archive and replace the local archive with its contents. */
export async function importChatHistory(
  file: File
): Promise<HistoryImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error('The archive is too large to import')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const files = await readZip(bytes)
  const raw = decodeZipText(files, CONVERSATIONS_FILE)
  if (!raw) {
    throw new Error('This ZIP does not contain conversations.json')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('conversations.json is not valid JSON')
  }

  const list =
    parsed && typeof parsed === 'object' && 'conversations' in parsed
      ? (parsed as { conversations: unknown }).conversations
      : parsed

  let conversations: StoredConversationInput[]
  try {
    conversations = conversationsSchema.parse(list) as StoredConversationInput[]
  } catch {
    throw new Error('The archive contains invalid conversations')
  }

  await replaceConversationArchive(conversations)
  return {
    conversations: conversations.length,
    messages: countMessages(conversations),
  }
}

/** Trigger a browser download for the exported archive. */
export function downloadChatHistory(blob: Blob): void {
  const stamp = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `new-api-chat-history-${stamp}.zip`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
