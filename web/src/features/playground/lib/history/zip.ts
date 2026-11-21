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

/**
 * Minimal ZIP reader/writer for chat history archives.
 *
 * The writer stores entries uncompressed (images are already compressed and
 * the JSON payload stays small), which keeps the implementation dependency
 * free. The reader understands stored and deflated entries, so archives
 * produced by other tools can still be imported.
 */

const LOCAL_FILE_SIGNATURE = 0x04034b50
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const FLAG_UTF8 = 0x0800
const METHOD_STORE = 0
const METHOD_DEFLATE = 8

export interface ZipEntryInput {
  name: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true)
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Build a ZIP archive with UTF-8 file names and stored (uncompressed) data. */
export function createZip(entries: ZipEntryInput[]): Uint8Array<ArrayBuffer> {
  const prepared = entries.map((entry) => {
    const nameBytes = encoder.encode(entry.name)
    return {
      nameBytes,
      data: entry.data,
      crc: crc32(entry.data),
    }
  })

  const localSize = prepared.reduce(
    (total, entry) => total + 30 + entry.nameBytes.length + entry.data.length,
    0
  )
  const centralSize = prepared.reduce(
    (total, entry) => total + 46 + entry.nameBytes.length,
    0
  )
  const totalSize = localSize + centralSize + 22
  const output = new Uint8Array(totalSize)
  const view = new DataView(output.buffer)
  let offset = 0
  const offsets: number[] = []

  for (const entry of prepared) {
    offsets.push(offset)
    writeUint32(view, offset, LOCAL_FILE_SIGNATURE)
    writeUint16(view, offset + 4, 20)
    writeUint16(view, offset + 6, FLAG_UTF8)
    writeUint16(view, offset + 8, METHOD_STORE)
    writeUint16(view, offset + 10, 0)
    writeUint16(view, offset + 12, 0)
    writeUint32(view, offset + 14, entry.crc)
    writeUint32(view, offset + 18, entry.data.length)
    writeUint32(view, offset + 22, entry.data.length)
    writeUint16(view, offset + 26, entry.nameBytes.length)
    writeUint16(view, offset + 28, 0)
    output.set(entry.nameBytes, offset + 30)
    output.set(entry.data, offset + 30 + entry.nameBytes.length)
    offset += 30 + entry.nameBytes.length + entry.data.length
  }

  const centralStart = offset
  prepared.forEach((entry, index) => {
    writeUint32(view, offset, CENTRAL_DIRECTORY_SIGNATURE)
    writeUint16(view, offset + 4, 20)
    writeUint16(view, offset + 6, 20)
    writeUint16(view, offset + 8, FLAG_UTF8)
    writeUint16(view, offset + 10, METHOD_STORE)
    writeUint16(view, offset + 12, 0)
    writeUint16(view, offset + 14, 0)
    writeUint32(view, offset + 16, entry.crc)
    writeUint32(view, offset + 20, entry.data.length)
    writeUint32(view, offset + 24, entry.data.length)
    writeUint16(view, offset + 28, entry.nameBytes.length)
    writeUint16(view, offset + 30, 0)
    writeUint16(view, offset + 32, 0)
    writeUint16(view, offset + 34, 0)
    writeUint16(view, offset + 36, 0)
    writeUint32(view, offset + 38, 0)
    writeUint32(view, offset + 42, offsets[index])
    output.set(entry.nameBytes, offset + 46)
    offset += 46 + entry.nameBytes.length
  })

  writeUint32(view, offset, END_OF_CENTRAL_DIRECTORY_SIGNATURE)
  writeUint16(view, offset + 4, 0)
  writeUint16(view, offset + 6, 0)
  writeUint16(view, offset + 8, prepared.length)
  writeUint16(view, offset + 10, prepared.length)
  writeUint32(view, offset + 12, centralSize)
  writeUint32(view, offset + 16, centralStart)
  writeUint16(view, offset + 20, 0)

  return output
}

function toReadableStream(data: Uint8Array): ReadableStream<BufferSource> {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(copy)
      controller.close()
    },
  })
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress ZIP entries')
  }
  const stream = toReadableStream(data).pipeThrough(
    new DecompressionStream('deflate-raw')
  )
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

/** Read a ZIP archive into a name → bytes map. */
export async function readZip(
  bytes: Uint8Array
): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const files = new Map<string, Uint8Array>()
  let offset = 0

  while (offset + 4 <= bytes.length) {
    const signature = view.getUint32(offset, true)
    if (signature === CENTRAL_DIRECTORY_SIGNATURE) {
      break
    }
    if (signature !== LOCAL_FILE_SIGNATURE) {
      throw new Error('Unsupported ZIP archive')
    }

    const flags = view.getUint16(offset + 6, true)
    const method = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLength + extraLength
    const name = decoder.decode(
      bytes.subarray(nameStart, nameStart + nameLength)
    )

    if ((flags & 0x08) !== 0) {
      throw new Error('ZIP data descriptors are not supported')
    }
    if (method !== METHOD_STORE && method !== METHOD_DEFLATE) {
      throw new Error(`Unsupported ZIP compression method: ${method}`)
    }

    const data = bytes.subarray(dataStart, dataStart + compressedSize)
    files.set(name, method === METHOD_DEFLATE ? await inflateRaw(data) : data)
    offset = dataStart + compressedSize
  }

  return files
}

/** Convenience helper: read a single UTF-8 text entry. */
export function decodeZipText(
  files: Map<string, Uint8Array>,
  name: string
): string | null {
  const data = files.get(name)
  return data ? decoder.decode(data) : null
}
