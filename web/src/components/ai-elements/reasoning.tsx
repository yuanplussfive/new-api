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
'use client'

import { ChevronDownIcon } from 'lucide-react'
import {
  type ComponentProps,
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useControllableState } from '@/lib/use-controllable-state'
import { cn } from '@/lib/utils'

import { DeepSeekThinkIcon } from './deepseek-think-icon'
import { Response } from './response'
import { Shimmer } from './shimmer'

type ReasoningContextValue = {
  isStreaming: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  duration: number
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null)

const useReasoning = () => {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning')
  }
  return context
}

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  duration?: number
}

const AUTO_CLOSE_DELAY = 1000
const MS_IN_S = 1000

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    })
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: 0,
    })

    const [hasAutoClosed, setHasAutoClosed] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStartTime(Date.now())
        }
      } else if (startTime !== null) {
        setDuration(Math.ceil((Date.now() - startTime) / MS_IN_S))
        setStartTime(null)
      }
    }, [isStreaming, startTime, setDuration])

    // Auto-open when streaming starts, auto-close when streaming ends (once only)
    useEffect(() => {
      if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed) {
        // Add a small delay before closing to allow user to see the content
        const timer = setTimeout(() => {
          setIsOpen(false)
          setHasAutoClosed(true)
        }, AUTO_CLOSE_DELAY)

        return () => clearTimeout(timer)
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosed])

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen)
    }

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Collapsible
          className={cn('not-prose mb-4', className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    )
  }
)

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>

export const ReasoningTrigger = memo(
  ({ className, children, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning()
    const { t } = useTranslation()
    const thinkingText = t('Thought for {{duration}} seconds', {
      duration: duration ?? 0,
    })

    return (
      <CollapsibleTrigger
        className={cn(
          'text-content-secondary hover:text-foreground group flex h-[34px] w-fit max-w-full items-center gap-1.5 text-[13px] leading-none transition-colors [&_p]:m-0',
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <span className='text-primary grid size-4 place-items-center'>
              <DeepSeekThinkIcon className='size-4' />
            </span>
            <span className='min-w-0 truncate leading-none font-medium'>
              {isStreaming ? (
                <Shimmer duration={1}>{t('Thinking...')}</Shimmer>
              ) : (
                thinkingText
              )}
            </span>
            <ChevronDownIcon
              className={cn(
                'size-3.5 transition-transform duration-200 ease-out',
                isOpen ? 'rotate-180' : 'rotate-0'
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    )
  }
)

const PROGRESSIVE_INITIAL_CHARS = 4000
const PROGRESSIVE_CHUNK_CHARS = 8000
const PROGRESSIVE_CHUNK_DELAY_MS = 32

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string
}

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const { isStreaming, isOpen } = useReasoning()
    const { t } = useTranslation()
    const hasStreamedRef = useRef(isStreaming)
    const [visibleChars, setVisibleChars] = useState(PROGRESSIVE_INITIAL_CHARS)

    useEffect(() => {
      if (isStreaming) {
        hasStreamedRef.current = true
      }
    }, [isStreaming])

    const progressive =
      !isStreaming &&
      !hasStreamedRef.current &&
      children.length > PROGRESSIVE_INITIAL_CHARS

    useEffect(() => {
      if (!isOpen || !progressive || visibleChars >= children.length) {
        return
      }

      const timer = setTimeout(() => {
        setVisibleChars((current) =>
          Math.min(children.length, current + PROGRESSIVE_CHUNK_CHARS)
        )
      }, PROGRESSIVE_CHUNK_DELAY_MS)

      return () => clearTimeout(timer)
    }, [children.length, isOpen, progressive, visibleChars])

    const visibleContent = progressive
      ? children.slice(0, Math.min(visibleChars, children.length))
      : children

    return (
      <CollapsibleContent
        className={cn(
          'CollapsibleContent group/reasoning-content mt-1 max-w-[78ch] text-[13px] leading-6',
          'text-content-secondary outline-none',
          className
        )}
        {...props}
      >
        {isOpen ? (
          <div className='relative pt-1 pb-1 pl-[22px] transition-[opacity,transform] duration-200 ease-out group-data-[closed]/reasoning-content:-translate-y-1 group-data-[closed]/reasoning-content:opacity-0 group-data-[open]/reasoning-content:translate-y-0 group-data-[open]/reasoning-content:opacity-100 motion-reduce:transition-none'>
            <span
              aria-hidden='true'
              className='bg-line-subtle absolute top-8 bottom-1 left-[7.5px] w-px'
            />
            <span
              aria-hidden='true'
              className='absolute top-[9px] left-0 grid size-4 place-items-center'
            >
              <span
                className={cn(
                  'size-[5px] rounded-full',
                  isStreaming ? 'bg-primary animate-pulse' : 'bg-content-muted'
                )}
              />
            </span>
            <div
              className='max-h-[min(40vh,360px)] overflow-y-auto overscroll-contain pr-2'
              data-testid='reasoning-scroll'
            >
              <Response
                className='grid gap-1.5 [&_li]:my-1 [&_ol]:my-2 [&_p]:my-2 [&_p]:leading-6 [&_ul]:my-2'
                final={!isStreaming}
                maxParsedChars={200_000}
                parserId='new-api-reasoning'
              >
                {visibleContent}
              </Response>
              {progressive && visibleChars < children.length ? (
                <div
                  className='text-content-muted py-1 text-[11px]'
                  role='status'
                >
                  {t('Loading...')}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </CollapsibleContent>
    )
  }
)

Reasoning.displayName = 'Reasoning'
ReasoningTrigger.displayName = 'ReasoningTrigger'
ReasoningContent.displayName = 'ReasoningContent'
