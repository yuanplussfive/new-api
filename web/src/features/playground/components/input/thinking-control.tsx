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
import { Check, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DeepSeekThinkIcon } from '@/components/ai-elements/deepseek-think-icon'
import { PromptInputButton } from '@/components/ai-elements/prompt-input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import {
  getModelThinkingLevels,
  getThinkingLevelLabelKey,
} from '../../lib/thinking/model-thinking'
import type { PlaygroundConfig, ThinkingLevel } from '../../types'
import { ThinkingLevelsDialog } from './thinking-levels-dialog'

interface ThinkingControlProps {
  config: PlaygroundConfig
  disabled?: boolean
  overrides: Record<string, ThinkingLevel[]>
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onThinkingOverrideChange: (
    modelId: string,
    levels: ThinkingLevel[] | null
  ) => void
}

/**
 * Reasoning effort pill. Levels come from the per-model capability table, so a
 * model that only supports low/medium/high never shows an unsupported option.
 */
export function ThinkingControl(props: ThinkingControlProps) {
  const { t } = useTranslation()
  const [customOpen, setCustomOpen] = useState(false)
  const levels = getModelThinkingLevels(props.config.model, props.overrides)
  const supported = levels.length > 1
  const active = props.config.thinking !== 'off' && supported

  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <PromptInputButton
              aria-label={t('Thinking')}
              className={cn(
                'gap-1.5 rounded-full px-2.5 text-[12.5px]',
                active
                  ? 'border-line-strong bg-surface-subtle text-foreground border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              disabled={props.disabled}
              variant='ghost'
            />
          }
        >
          <DeepSeekThinkIcon className='size-[15px]' />
          <span className='hidden sm:inline'>
            {active
              ? t(getThinkingLevelLabelKey(props.config.thinking))
              : t('Thinking')}
          </span>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          className='chat-menu w-48 gap-1 rounded-[12px] p-1.5'
        >
          {supported ? (
            levels.map((level) => {
              const selected = props.config.thinking === level
              return (
                <button
                  key={level}
                  type='button'
                  onClick={() => props.onConfigChange('thinking', level)}
                  className={cn(
                    'flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[12.5px] transition-colors',
                    selected
                      ? 'bg-surface-subtle text-foreground'
                      : 'text-content-secondary hover:bg-surface-subtle'
                  )}
                >
                  <span>{t(getThinkingLevelLabelKey(level))}</span>
                  {selected ? (
                    <Check className='size-3.5' aria-hidden='true' />
                  ) : null}
                </button>
              )
            })
          ) : (
            <p className='text-content-muted px-2 py-2 text-[12px]'>
              {t('This model does not support thinking')}
            </p>
          )}
          <div className='border-line-subtle mt-1 border-t pt-1'>
            <button
              type='button'
              onClick={() => {
                setCustomOpen(true)
              }}
              className='text-content-secondary hover:bg-surface-subtle flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-left text-[12px]'
            >
              <Settings2 className='size-3.5' aria-hidden='true' />
              {t('Customize thinking levels')}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ThinkingLevelsDialog
        defaultLevels={getModelThinkingLevels(props.config.model)}
        levels={levels}
        modelId={props.config.model}
        onOpenChange={setCustomOpen}
        onSave={(next) =>
          props.onThinkingOverrideChange(props.config.model, next)
        }
        open={customOpen}
      />
    </>
  )
}
