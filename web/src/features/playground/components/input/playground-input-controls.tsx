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
import { SendIcon, SquareIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PromptInputButton } from '@/components/ai-elements/prompt-input'
import { ModelGroupSelector } from '@/components/model-group-selector'

import { PLAYGROUND_API_FORMATS } from '../../constants'
import { getInputControlState } from '../../lib'
import type { GroupOption, ModelOption, PlaygroundApiFormat } from '../../types'

type PlaygroundInputControlsProps = {
  disabled?: boolean
  groups: GroupOption[]
  groupValue: string
  isGenerating?: boolean
  isModelLoading?: boolean
  models: ModelOption[]
  modelValue: string
  apiFormat: PlaygroundApiFormat
  onApiFormatChange: (value: PlaygroundApiFormat) => void
  onGroupChange: (value: string) => void
  onModelChange: (value: string) => void
  onStop?: () => void
  text: string
  tools: ReactNode
}

export function PlaygroundInputControls({
  disabled,
  groups,
  groupValue,
  isGenerating,
  isModelLoading = false,
  models,
  modelValue,
  apiFormat,
  onApiFormatChange,
  onGroupChange,
  onModelChange,
  onStop,
  text,
  tools,
}: PlaygroundInputControlsProps) {
  const { t } = useTranslation()
  const { canSubmit, isSelectorDisabled, shouldShowStop } =
    getInputControlState({
      disabled,
      groups,
      hasStopHandler: Boolean(onStop),
      isGenerating,
      isModelLoading,
      models,
      text,
    })

  const renderSelector = () => (
    <ModelGroupSelector
      className='w-full sm:w-auto'
      apiFormat={apiFormat}
      apiFormats={PLAYGROUND_API_FORMATS.map((format) => ({
        value: format.value,
        label: t(format.label),
      }))}
      selectedModel={modelValue}
      models={models}
      onModelChange={onModelChange}
      onApiFormatChange={(value) =>
        onApiFormatChange(value as PlaygroundApiFormat)
      }
      selectedGroup={groupValue}
      groups={groups}
      onGroupChange={onGroupChange}
      disabled={isSelectorDisabled}
    />
  )

  const renderSubmitButton = () =>
    shouldShowStop ? (
      <PromptInputButton
        className='border-line bg-surface-subtle text-destructive hover:bg-surface-hover size-[34px] shrink-0 rounded-full border p-0'
        onClick={onStop}
        variant='secondary'
      >
        <SquareIcon className='fill-current' size={14} />
        <span className='sr-only'>{t('Stop')}</span>
      </PromptInputButton>
    ) : (
      <PromptInputButton
        className='bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground size-[34px] shrink-0 rounded-full p-0 shadow-none'
        disabled={!canSubmit}
        type='submit'
        variant='default'
      >
        <SendIcon size={16} />
        <span className='sr-only'>{t('Send')}</span>
      </PromptInputButton>
    )

  return (
    <div className='flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center'>
      <div className='flex min-w-0 items-center gap-0.5'>{tools}</div>

      <div className='flex min-w-0 items-center gap-1.5 sm:ml-auto'>
        <div className='min-w-0 flex-1 sm:flex-none'>{renderSelector()}</div>
        {renderSubmitButton()}
      </div>
    </div>
  )
}
