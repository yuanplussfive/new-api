import type { FileUIPart } from 'ai'
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
import { X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  PromptInput,
  PromptInputAttachments,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTextarea,
  usePromptInputAttachments,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'

import { getSubmittableInputText } from '../../lib'
import type {
  GroupOption,
  MessageAttachment,
  ModelOption,
  ParameterEnabled,
  PlaygroundConfig,
  ThinkingLevel,
} from '../../types'
import { PlaygroundInputControls } from './playground-input-controls'
import { PlaygroundInputTools } from './playground-input-tools'

const MAX_ATTACHMENTS = 4
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

interface PlaygroundInputProps {
  config: PlaygroundConfig
  onSubmit: (text: string, attachments: MessageAttachment[]) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  models: ModelOption[]
  modelValue: string
  onModelChange: (value: string) => void
  isModelLoading?: boolean
  groups: GroupOption[]
  groupValue: string
  onGroupChange: (value: string) => void
  hasMessages?: boolean
  onConfigChange: <K extends keyof PlaygroundConfig>(
    key: K,
    value: PlaygroundConfig[K]
  ) => void
  onClearMessages?: () => void
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

function AttachmentCard(props: { attachment: FileUIPart & { id: string } }) {
  const { t } = useTranslation()
  const attachments = usePromptInputAttachments()
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: [0.33, 1, 0.68, 1] }}
      className='group border-line-subtle bg-surface-subtle relative size-16 overflow-hidden rounded-[16px] border'
    >
      <img
        src={props.attachment.url}
        alt={props.attachment.filename ?? ''}
        className='size-full object-cover'
      />
      <button
        type='button'
        aria-label={t('Remove attachment')}
        onClick={() => attachments.remove(props.attachment.id)}
        className='absolute top-0 right-0 flex size-5 items-center justify-center bg-black/60 text-white opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100'
      >
        <X className='size-3' aria-hidden='true' />
      </button>
    </motion.div>
  )
}

export function PlaygroundInput(props: PlaygroundInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')

  const handleSubmit = (message: PromptInputMessage) => {
    if (props.disabled) return

    const submittableText = getSubmittableInputText(message) ?? ''
    const attachments: MessageAttachment[] = (message.files ?? []).map(
      (file) => ({
        id: file.url,
        mediaType: file.mediaType,
        name: file.filename ?? 'image',
        url: file.url,
      })
    )

    if (!submittableText && attachments.length === 0) return

    props.onSubmit(submittableText, attachments)
    setText('')
  }

  return (
    <div className='grid shrink-0 gap-4 px-1 md:pb-4'>
      <PromptInput
        accept='image/*'
        className='relative'
        groupClassName='bg-[var(--chat-input-fill)]! border border-line rounded-[24px] overflow-hidden transition-[border-color,box-shadow] duration-150 focus-within:border-line-strong'
        maxFiles={MAX_ATTACHMENTS}
        maxFileSize={MAX_ATTACHMENT_BYTES}
        globalDrop
        multiple
        onError={(error) => toast.error(error.message)}
        onSubmit={handleSubmit}
      >
        <PromptInputHeader className='flex flex-wrap gap-2 px-4 pt-3 empty:hidden'>
          <PromptInputAttachments>
            {(attachment) => <AttachmentCard attachment={attachment} />}
          </PromptInputAttachments>
        </PromptInputHeader>

        <PromptInputTextarea
          autoComplete='off'
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck={false}
          className='min-h-[60px] px-3 pt-3 pb-0 text-[16px] leading-6'
          disabled={props.disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('Enter a message')}
          value={text}
        />

        <PromptInputFooter className='border-0 bg-transparent px-3 py-3'>
          <PlaygroundInputControls
            apiFormat={props.config.apiFormat}
            disabled={props.disabled}
            groups={props.groups}
            groupValue={props.groupValue}
            isGenerating={props.isGenerating}
            isModelLoading={props.isModelLoading}
            models={props.models}
            modelValue={props.modelValue}
            onApiFormatChange={(value) =>
              props.onConfigChange('apiFormat', value)
            }
            onGroupChange={props.onGroupChange}
            onModelChange={props.onModelChange}
            onStop={props.onStop}
            text={text}
            tools={
              <PlaygroundInputTools
                config={props.config}
                disabled={props.disabled}
                hasMessages={props.hasMessages}
                onConfigChange={props.onConfigChange}
                onClearMessages={props.onClearMessages}
                onParameterEnabledChange={props.onParameterEnabledChange}
                onThinkingOverrideChange={props.onThinkingOverrideChange}
                parameterEnabled={props.parameterEnabled}
                thinkingOverrides={props.thinkingOverrides}
              />
            }
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
