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
import type { StoredConversationInput } from './storage-schema'

const DATABASE_NAME = 'new-api-playground'
const DATABASE_VERSION = 1
const CONVERSATIONS_STORE = 'conversations'
const META_STORE = 'meta'

interface MetaRecord {
  key: string
  value: string
}

let databasePromise: Promise<IDBDatabase | null> | null = null

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB error'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction error'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) {
    return databasePromise
  }

  databasePromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    } catch {
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const store = database.createObjectStore(CONVERSATIONS_STORE, {
          keyPath: 'id',
        })
        store.createIndex('updatedAt', 'updatedAt')
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })

  return databasePromise
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | null
): Promise<T | null> {
  const database = await openDatabase()
  if (!database) {
    return null
  }

  try {
    const transaction = database.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = run(store)
    const result = request ? await requestToPromise(request) : null
    await transactionDone(transaction)
    return result
  } catch {
    return null
  }
}

/** All archived conversations, newest first, or null when IndexedDB is unavailable. */
export async function readArchivedConversations(): Promise<
  StoredConversationInput[] | null
> {
  const result = await withStore<StoredConversationInput[]>(
    CONVERSATIONS_STORE,
    'readonly',
    (store) => store.getAll()
  )
  if (!result) {
    return null
  }
  return result.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putArchivedConversation(
  conversation: StoredConversationInput
): Promise<boolean> {
  const result = await withStore(CONVERSATIONS_STORE, 'readwrite', (store) =>
    store.put(conversation)
  )
  return result !== null
}

export async function deleteArchivedConversation(id: string): Promise<boolean> {
  const result = await withStore(CONVERSATIONS_STORE, 'readwrite', (store) =>
    store.delete(id)
  )
  return result !== null
}

export async function readMetaValue(key: string): Promise<string | null> {
  const record = await withStore<MetaRecord | undefined>(
    META_STORE,
    'readonly',
    (store) => store.get(key)
  )
  return record?.value ?? null
}

export async function writeMetaValue(
  key: string,
  value: string | null
): Promise<boolean> {
  if (value === null) {
    const result = await withStore(META_STORE, 'readwrite', (store) =>
      store.delete(key)
    )
    return result !== null
  }
  const result = await withStore(META_STORE, 'readwrite', (store) =>
    store.put({ key, value })
  )
  return result !== null
}

/** Wipe every archived chat and meta value (account deletion / clear chat). */
export async function clearArchivedChats(): Promise<boolean> {
  const database = await openDatabase()
  if (!database) {
    return false
  }
  try {
    const transaction = database.transaction(
      [CONVERSATIONS_STORE, META_STORE],
      'readwrite'
    )
    transaction.objectStore(CONVERSATIONS_STORE).clear()
    transaction.objectStore(META_STORE).clear()
    await transactionDone(transaction)
    return true
  } catch {
    return false
  }
}
