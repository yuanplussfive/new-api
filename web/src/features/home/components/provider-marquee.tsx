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
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { getLobeIcon } from '@/lib/lobe-icon'

const PROVIDERS = [
  { name: 'OpenAI', icon: 'OpenAI' },
  { name: 'Claude', icon: 'Claude.Color' },
  { name: 'Gemini', icon: 'Gemini.Color' },
  { name: 'DeepSeek', icon: 'DeepSeek.Color' },
  { name: 'Azure OpenAI', icon: 'Azure.Color' },
  { name: 'AWS Bedrock', icon: 'Bedrock.Color' },
  { name: 'Moonshot AI', icon: 'Moonshot' },
  { name: 'Zhipu AI', icon: 'Zhipu.Color' },
  { name: 'Qwen', icon: 'Qwen.Color' },
  { name: 'Mistral AI', icon: 'Mistral.Color' },
  { name: 'Cohere', icon: 'Cohere.Color' },
  { name: 'Ollama', icon: 'Ollama' },
  { name: 'xAI Grok', icon: 'Grok' },
  { name: 'Perplexity', icon: 'Perplexity.Color' },
  { name: 'Minimax', icon: 'Minimax.Color' },
  { name: 'Doubao', icon: 'Doubao.Color' },
  { name: 'Tencent Hunyuan', icon: 'Hunyuan.Color' },
  { name: 'Yi', icon: 'Yi.Color' },
  { name: 'Groq', icon: 'Groq' },
  { name: 'OpenRouter', icon: 'OpenRouter.Color' },
] as const

interface ProviderListProps {
  duplicate?: boolean
  static?: boolean
}

function ProviderList(props: ProviderListProps) {
  const { t } = useTranslation()

  return (
    <ul
      aria-hidden={props.duplicate || undefined}
      aria-label={props.duplicate ? undefined : t('Supported providers')}
      className={
        props.static
          ? 'flex flex-wrap items-center gap-x-8 gap-y-5'
          : 'flex shrink-0 items-center gap-10 pr-10'
      }
    >
      {PROVIDERS.map((provider) => (
        <li
          key={provider.name}
          className='flex shrink-0 items-center gap-2.5 whitespace-nowrap'
        >
          <span
            aria-hidden='true'
            className='flex size-5 items-center justify-center opacity-85 saturate-[0.8]'
          >
            {getLobeIcon(provider.icon, 20)}
          </span>
          <span className='text-content-secondary text-[13px] font-medium tracking-[-0.01em]'>
            {provider.name}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Two equal-width brand groups scrolling without pause or reset jump. */
export function ProviderMarquee() {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className='border-line-subtle bg-background border-y px-5 py-6 sm:px-8'>
        <ProviderList static />
      </div>
    )
  }

  return (
    <div className='border-line-subtle bg-background relative flex items-center border-y'>
      <div className='relative min-w-0 flex-1 overflow-hidden py-6'>
        <div className='from-background via-background/85 pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r to-transparent' />
        <div className='from-background via-background/85 pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l to-transparent' />
        <motion.div
          className='flex w-max will-change-transform'
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 64, ease: 'linear', repeat: Infinity }}
        >
          <ProviderList />
          <ProviderList duplicate />
        </motion.div>
      </div>
    </div>
  )
}
