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
import { describe, expect, test } from 'vitest'

import {
  clampThinkingLevel,
  getModelThinkingLevels,
  supportsThinking,
  toReasoningEffort,
} from '../model-thinking'

describe('model thinking levels', () => {
  test('reads catalog levels for a known model', () => {
    expect(getModelThinkingLevels('claude-opus-4-6')).toEqual([
      'off',
      'minimal',
      'low',
      'medium',
      'high',
      'max',
    ])
  })

  test('keeps models without reasoning at off only', () => {
    expect(getModelThinkingLevels('gpt-4o')).toEqual(['off'])
    expect(supportsThinking('gpt-4o')).toBe(false)
  })

  test('honours models that cannot disable reasoning', () => {
    expect(getModelThinkingLevels('o3')).toEqual(['low', 'medium', 'high'])
  })

  test('normalizes gateway prefixes and dated snapshots', () => {
    expect(getModelThinkingLevels('anthropic/claude-sonnet-4-5')).toEqual([
      'off',
      'minimal',
      'low',
      'medium',
      'high',
    ])
    expect(getModelThinkingLevels('claude-opus-4-6-20260101')).toContain('max')
  })

  test('falls back to family heuristics for unknown ids', () => {
    expect(getModelThinkingLevels('deepseek-reasoner')).toEqual([
      'off',
      'low',
      'medium',
      'high',
    ])
    expect(getModelThinkingLevels('some-random-chat-model')).toEqual(['off'])
  })

  test('custom overrides win over the catalog', () => {
    expect(
      getModelThinkingLevels('gpt-4o', { 'gpt-4o': ['off', 'high'] })
    ).toEqual(['off', 'high'])
  })

  test('clamps an unsupported level when the model changes', () => {
    expect(clampThinkingLevel('gpt-4o', 'high')).toBe('off')
    expect(clampThinkingLevel('o3', 'off')).toBe('low')
    expect(clampThinkingLevel('claude-opus-4-6', 'max')).toBe('max')
  })

  test('folds extended levels onto gateway effort values', () => {
    expect(toReasoningEffort('off')).toBeNull()
    expect(toReasoningEffort('minimal')).toBe('minimal')
    expect(toReasoningEffort('high')).toBe('high')
    expect(toReasoningEffort('xhigh')).toBe('high')
    expect(toReasoningEffort('max')).toBe('high')
  })
})
