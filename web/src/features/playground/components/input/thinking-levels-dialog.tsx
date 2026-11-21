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
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { getThinkingLevelLabelKey } from '../../lib/thinking/model-thinking'
import type { ThinkingLevel } from '../../types'

const LEVELS: ThinkingLevel[] = [
  'off',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
]

interface ThinkingLevelsDialogProps {
  open: boolean
  modelId: string
  levels: ThinkingLevel[]
  defaultLevels: ThinkingLevel[]
  onOpenChange: (open: boolean) => void
  onSave: (levels: ThinkingLevel[] | null) => void
}

/** Per-model override editor: pick exactly which reasoning levels to offer. */
export function ThinkingLevelsDialog(props: ThinkingLevelsDialogProps) {
  const { t } = useTranslation()

  const toggle = (level: ThinkingLevel): ThinkingLevel[] => {
    const selected = new Set(props.levels)
    if (selected.has(level)) {
      selected.delete(level)
    } else {
      selected.add(level)
    }
    return LEVELS.filter((item) => selected.has(item))
  }

  const draft = props.defaultLevels
  const hasOverride = props.levels.join(',') !== draft.join(',')

  return (
    <Dialog
      description={t('Choose which reasoning levels this model exposes.')}
      footer={
        <div className='flex w-full items-center justify-between gap-2'>
          <Button
            onClick={() => props.onSave(null)}
            size='sm'
            type='button'
            variant='ghost'
          >
            {t('Reset to default')}
          </Button>
          <Button
            onClick={() => props.onOpenChange(false)}
            size='sm'
            type='button'
          >
            {t('Close')}
          </Button>
        </div>
      }
      onOpenChange={props.onOpenChange}
      open={props.open}
      title={t('Thinking levels for {{model}}', { model: props.modelId })}
    >
      <div className='grid gap-1.5'>
        {LEVELS.map((level) => {
          const selected = props.levels.includes(level)
          return (
            <button
              key={level}
              aria-pressed={selected}
              className={cn(
                'flex h-9 items-center justify-between border px-3 text-left text-[13px] transition-colors',
                selected
                  ? 'border-line-strong bg-surface-subtle text-foreground'
                  : 'border-line-subtle text-content-secondary hover:bg-surface-subtle'
              )}
              onClick={() => props.onSave(toggle(level))}
              type='button'
            >
              <span>{t(getThinkingLevelLabelKey(level))}</span>
              <span className='text-content-muted text-[11px]'>
                {selected ? t('Included') : t('Excluded')}
              </span>
            </button>
          )
        })}
        <p className='text-content-muted mt-1 text-[11.5px]'>
          {hasOverride
            ? t('Custom levels now apply to this model.')
            : t('Using the built-in levels for this model.')}
        </p>
      </div>
    </Dialog>
  )
}
