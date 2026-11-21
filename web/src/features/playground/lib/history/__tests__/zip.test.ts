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
import { deflateRawSync } from 'node:zlib'

import { describe, expect, test } from 'vitest'

import { createZip, decodeZipText, readZip } from '../zip'

const encoder = new TextEncoder()

describe('zip archive', () => {
  test('round-trips stored entries with UTF-8 names', async () => {
    const archive = createZip([
      { name: 'manifest.json', data: encoder.encode('{"version":1}') },
      { name: '会话/conversations.json', data: encoder.encode('[]') },
    ])

    const files = await readZip(archive)

    expect(files.size).toBe(2)
    expect(decodeZipText(files, 'manifest.json')).toBe('{"version":1}')
    expect(decodeZipText(files, '会话/conversations.json')).toBe('[]')
  })

  test('rejects payloads that are not a ZIP archive', async () => {
    await expect(readZip(encoder.encode('not a zip'))).rejects.toThrow(
      'Unsupported ZIP archive'
    )
  })

  test('reads deflated entries written by other tools', async () => {
    const content = encoder.encode('{"conversations":[]}')
    const compressed = new Uint8Array(deflateRawSync(content))
    const name = encoder.encode('conversations.json')
    const local = new Uint8Array(30 + name.length + compressed.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true)
    view.setUint16(8, 8, true)
    view.setUint32(18, compressed.length, true)
    view.setUint32(22, content.length, true)
    view.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(compressed, 30 + name.length)

    const files = await readZip(local)

    expect(decodeZipText(files, 'conversations.json')).toBe(
      '{"conversations":[]}'
    )
  })
})
