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
import type { ThinkingLevel } from '../../types'
import catalog from './model-catalog.json'

/**
 * Model → thinking-level capability table.
 *
 * Generated from @earendil-works/pi-ai 1.5.0 (MIT) model catalog, which tracks
 * each provider's `reasoning` flag and `thinkingLevelMap`. Only the providers a
 * generic OpenAI-compatible gateway is likely to expose are kept, plus a
 * pattern-based fallback for ids the catalog does not know yet.
 */

const LEVEL_ORDER: ThinkingLevel[] = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]

const CATALOG = new Map<string, ThinkingLevel[]>(
  (catalog.models as { id: string; levels: ThinkingLevel[] }[]).map((entry) => [
    entry.id,
    entry.levels,
  ])
)

const HEURISTICS: { pattern: RegExp; levels: ThinkingLevel[] }[] = [
  {
    pattern: /^(o[134]|o[134]-|gpt-5|gpt-6|codex)/,
    levels: ['low', 'medium', 'high'],
  },
  {
    pattern:
      /^(claude-(3[.-]7|4|5|opus|sonnet|haiku)|claude-(opus|sonnet|haiku)-[4-9])/,
    levels: ['off', 'low', 'medium', 'high'],
  },
  {
    pattern: /^gemini-(2[.-]5|3)/,
    levels: ['off', 'low', 'medium', 'high'],
  },
  {
    pattern: /(reasoner|deepseek-(r|v3[.-]2|v4)|qwq|qwen3|thinking)/,
    levels: ['off', 'low', 'medium', 'high'],
  },
  {
    pattern: /^grok-([3-9]|x)/,
    levels: ['off', 'low', 'medium', 'high'],
  },
  {
    pattern: /(glm-4[.-][5-9]|kimi-k2|minimax-m[12]|magistral|mistral-large-3)/,
    levels: ['off', 'low', 'medium', 'high'],
  },
]

/** Normalize a gateway model id into the catalog's key space. */
export function normalizeModelId(modelId: string): string {
  const segments = modelId.trim().toLowerCase().split('/')
  const last = segments.at(-1) ?? ''
  return last.replaceAll('_', '-')
}

function catalogLookup(modelId: string): ThinkingLevel[] | null {
  const normalized = normalizeModelId(modelId)
  const candidates = [normalized]

  const withoutDate = normalized.replace(/-\d{8}$/, '')
  if (withoutDate !== normalized) candidates.push(withoutDate)

  const withoutLatest = normalized.replace(/-latest$/, '')
  if (withoutLatest !== normalized) candidates.push(withoutLatest)

  const withoutVersion = normalized.replace(/-v\d+(-\d+)?$/, '')
  if (withoutVersion !== normalized) candidates.push(withoutVersion)

  for (const candidate of candidates) {
    const levels = CATALOG.get(candidate)
    if (levels) return levels
  }

  // Catalog ids are prefixes for dated snapshots (claude-opus-4-6-20260101).
  for (const [id, levels] of CATALOG) {
    if (id.length >= 6 && normalized.startsWith(`${id}-`)) {
      return levels
    }
  }

  return null
}

/**
 * Supported thinking levels for a model. Custom overrides win over the
 * bundled catalog, which wins over family heuristics. Unknown models only
 * expose `off` so we never send an unsupported reasoning request.
 */
export function getModelThinkingLevels(
  modelId: string,
  overrides: Record<string, ThinkingLevel[]> = {}
): ThinkingLevel[] {
  const normalized = normalizeModelId(modelId)
  const override = overrides[normalized]
  if (override && override.length > 0) {
    return LEVEL_ORDER.filter((level) => override.includes(level))
  }

  const fromCatalog = catalogLookup(modelId)
  if (fromCatalog) {
    return fromCatalog
  }

  for (const heuristic of HEURISTICS) {
    if (heuristic.pattern.test(normalized)) {
      return heuristic.levels
    }
  }

  return ['off']
}

export function supportsThinking(
  modelId: string,
  overrides: Record<string, ThinkingLevel[]> = {}
): boolean {
  return getModelThinkingLevels(modelId, overrides).length > 1
}

/** Keep the configured level valid when the model changes. */
export function clampThinkingLevel(
  modelId: string,
  level: ThinkingLevel,
  overrides: Record<string, ThinkingLevel[]> = {}
): ThinkingLevel {
  const levels = getModelThinkingLevels(modelId, overrides)
  if (levels.includes(level)) {
    return level
  }
  return levels.includes('off') ? 'off' : levels[0]
}

/**
 * OpenAI-compatible gateways understand low/medium/high; the extended levels
 * exist per provider in the catalog, so fold them onto the nearest value.
 */
export function toReasoningEffort(
  level: ThinkingLevel
): 'minimal' | 'low' | 'medium' | 'high' | null {
  if (level === 'off') return null
  if (level === 'minimal') return 'minimal'
  if (level === 'xhigh' || level === 'max') return 'high'
  return level
}

export function getThinkingLevelLabelKey(level: ThinkingLevel): string {
  const labels: Record<ThinkingLevel, string> = {
    off: 'Off',
    minimal: 'Minimal',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    xhigh: 'Extra high',
    max: 'Max',
  }
  return labels[level]
}
