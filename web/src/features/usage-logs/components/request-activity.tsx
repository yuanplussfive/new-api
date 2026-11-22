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
import { Brain, Image, Search, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatTokens } from '@/lib/format'

import type { LogActivity } from '../types'

interface RequestActivityProps {
  activity?: LogActivity
}

function toolLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case 'function_call':
      return t('Function call')
    case 'tool_use':
      return t('Tool use')
    case 'web_search_call':
      return t('Web search')
    case 'file_search_call':
      return t('File search')
    case 'image_generation_call':
      return t('Image generation')
    case 'custom_tool_call':
      return t('Custom tool')
    case 'mcp_call':
      return t('MCP call')
    case 'computer_call':
      return t('Computer use')
    case 'code_interpreter_call':
      return t('Code interpreter')
    default:
      return type.replaceAll('_', ' ')
  }
}

function activityIcon(type: string) {
  if (type.includes('search')) return Search
  if (type.includes('image')) return Image
  if (type.includes('function') || type.includes('tool')) return Wrench
  return Wrench
}

export function RequestActivity(props: RequestActivityProps) {
  const { t } = useTranslation()
  const activity = props.activity
  if (!activity) return null

  const reasoning = activity.reasoning?.used ? activity.reasoning : undefined
  const tools = activity.tools?.filter((tool) => tool.count > 0) ?? []
  const outputs =
    activity.outputs?.filter((output) => output === 'image_generation_call') ??
    []
  if (!reasoning && tools.length === 0 && outputs.length === 0) return null

  return (
    <div className='[column-span:all]'>
      <div className='text-content-muted flex items-center gap-1.5 text-[10px] font-medium tracking-[0.08em] uppercase'>
        <Brain className='size-3.5' aria-hidden='true' />
        {t('Request activity')}
      </div>
      <div
        role='list'
        aria-label={t('Request activity')}
        className='mt-2 flex flex-wrap gap-1.5'
      >
        {reasoning && (
          <span
            role='listitem'
            className='border-line-subtle bg-surface-panel text-content-secondary inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]'
          >
            <Brain className='size-3' aria-hidden='true' />
            {t('Reasoning')}
            {reasoning.tokens ? (
              <span className='text-content-muted font-mono tabular-nums'>
                {t('{{count}} tokens', {
                  count: formatTokens(reasoning.tokens),
                })}
              </span>
            ) : null}
          </span>
        )}
        {tools.map((tool, index) => {
          const Icon = activityIcon(tool.type)
          const label = toolLabel(tool.type, t)
          return (
            <span
              key={`${tool.type}-${tool.name ?? ''}-${index}`}
              role='listitem'
              className='border-line-subtle bg-surface-panel text-content-secondary inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]'
            >
              <Icon className='size-3' aria-hidden='true' />
              {label}
              {tool.name ? (
                <span className='max-w-40 truncate font-mono'>{tool.name}</span>
              ) : null}
              <span className='text-content-muted font-mono tabular-nums'>
                ×{formatTokens(tool.count)}
              </span>
            </span>
          )
        })}
        {outputs.map((output) => (
          <span
            key={output}
            role='listitem'
            className='border-line-subtle text-content-muted inline-flex items-center rounded-md border px-2 py-1 text-[11px]'
          >
            {toolLabel(output, t)}
          </span>
        ))}
      </div>
    </div>
  )
}
