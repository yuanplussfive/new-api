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
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { DEFAULT_CONFIG } from '../../../constants'
import type { PlaygroundConfig } from '../../../types'
import {
  loadConfig,
  loadThinkingOverrides,
  saveConfig,
  saveThinkingOverrides,
} from '../storage'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.setUser({ id: 3, username: 'levels', role: 1 })
})

afterEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

describe('thinking level persistence', () => {
  test('keeps extended levels such as max after a reload', () => {
    const config: PlaygroundConfig = { ...DEFAULT_CONFIG, thinking: 'max' }
    saveConfig(config)

    expect(loadConfig().thinking).toBe('max')
  })

  test('stores per-model overrides separately from the config', () => {
    saveThinkingOverrides({ 'gpt-4o': ['off', 'high'] })

    expect(loadThinkingOverrides()).toEqual({ 'gpt-4o': ['off', 'high'] })
  })
})
