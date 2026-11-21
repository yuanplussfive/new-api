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
import { Paperclip, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  PromptInputButton,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type {
  ParameterEnabled,
  PlaygroundConfig,
  ThinkingLevel,
} from '../../types'
import { PlaygroundParameterPanel } from './playground-parameter-panel'
import { ThinkingControl } from './thinking-control'

type PlaygroundInputToolsProps = {
  config: PlaygroundConfig
  disabled?: boolean
  hasMessages?: boolean
  onClearMessages?: () => void
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onParameterEnabledChange: (
    key: keyof ParameterEnabled,
    value: boolean
  ) => void
  parameterEnabled: ParameterEnabled
  thinkingOverrides: Record<string, ThinkingLevel[]>
  onThinkingOverrideChange: (
    modelId: string,
    levels: ThinkingLevel[] | null
  ) => void
}

export function PlaygroundInputTools(props: PlaygroundInputToolsProps) {
  const { t } = useTranslation()
  const attachments = usePromptInputAttachments()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const handleClearMessages = () => {
    props.onClearMessages?.()
    setClearConfirmOpen(false)
    toast.success(t('Conversation cleared'))
  }

  return (
    <>
      <PromptInputTools className='gap-0.5'>
        <Tooltip>
          <TooltipTrigger
            render={
              <PromptInputButton
                aria-label={t('Add images')}
                className='text-muted-foreground hover:text-foreground'
                disabled={props.disabled}
                onClick={() => attachments.openFileDialog()}
                variant='ghost'
              />
            }
          >
            <Paperclip size={16} aria-hidden='true' />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('Add images')}</p>
          </TooltipContent>
        </Tooltip>

        <ThinkingControl
          config={props.config}
          disabled={props.disabled}
          onConfigChange={props.onConfigChange}
          onThinkingOverrideChange={props.onThinkingOverrideChange}
          overrides={props.thinkingOverrides}
        />

        <PlaygroundParameterPanel
          config={props.config}
          disabled={props.disabled}
          onConfigChange={props.onConfigChange}
          onParameterEnabledChange={props.onParameterEnabledChange}
          parameterEnabled={props.parameterEnabled}
        />

        {props.hasMessages && props.onClearMessages ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <PromptInputButton
                  aria-label={t('Clear chat history')}
                  className='text-muted-foreground hover:text-destructive'
                  disabled={props.disabled}
                  onClick={() => setClearConfirmOpen(true)}
                  variant='ghost'
                />
              }
            >
              <Trash2 size={16} aria-hidden='true' />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('Clear chat history')}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </PromptInputTools>

      <ConfirmDialog
        destructive
        desc={t(
          'All playground messages saved in this browser will be removed. This cannot be undone.'
        )}
        confirmText={t('Clear')}
        handleConfirm={handleClearMessages}
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title={t('Clear chat history?')}
      />
    </>
  )
}
