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
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { StartStepItem } from './overview-setup-step'
import type { StartStep } from './overview-types'

interface OverviewSetupGuideProps {
  id: string
  expanded: boolean
  complete: boolean
  steps: StartStep[]
  onToggle: () => void
}

export function OverviewSetupGuide(props: OverviewSetupGuideProps) {
  const { t } = useTranslation()
  const completedCount = props.steps.filter((step) => step.completed).length
  const progress = props.steps.length
    ? Math.round((completedCount / props.steps.length) * 100)
    : 0

  return (
    <>
      <section
        id={props.id}
        hidden={!props.expanded}
        data-dashboard-panel=''
        className='overflow-hidden rounded-xl border border-line bg-card'
      >
        {props.expanded && (
          <>
            <div className='flex flex-wrap items-start justify-between gap-3 px-4 py-3'>
              <div className='min-w-0'>
                <div className='flex items-baseline gap-2'>
                  <h3 className='text-content-strong text-[12.5px] font-semibold'>
                    {t('Build on your API gateway in minutes')}
                  </h3>
                  <span className='text-content-muted text-[11.5px] font-medium tabular-nums'>
                    {completedCount}/{props.steps.length}
                  </span>
                </div>
                <div
                  className='bg-surface-subtle mt-2.5 h-[3px] w-44 overflow-hidden rounded-full'
                  role='presentation'
                >
                  <div
                    className='bg-primary h-full rounded-full transition-[width] duration-500 ease-out'
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <Button
                variant='ghost'
                size='sm'
                aria-expanded={props.expanded}
                aria-controls={props.id}
                onClick={props.onToggle}
              >
                <ChevronUp aria-hidden='true' />
                {t('Hide setup guide')}
              </Button>
            </div>
            <ol className='divide-y divide-line-subtle border-t border-line-subtle'>
              {props.steps.map((step, index) => (
                <StartStepItem key={step.title} step={step} index={index} />
              ))}
            </ol>
          </>
        )}
      </section>
      {!props.expanded && !props.complete && (
        <div
          data-dashboard-panel=''
          className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card px-5 py-3.5'
        >
          <div className='min-w-0'>
            <h3 className='text-content-strong text-[13px] font-medium'>
              {t('Setup guide')}
            </h3>
            <p className='text-content-secondary mt-0.5 text-[12px]'>
              {t('Setup progress: {{completed}}/{{total}}', {
                completed: completedCount,
                total: props.steps.length,
              })}
            </p>
          </div>
          <Button
            variant='outline'
            size='sm'
            aria-expanded={props.expanded}
            aria-controls={props.id}
            onClick={props.onToggle}
          >
            <ChevronDown aria-hidden='true' />
            {t('Show setup guide')}
          </Button>
        </div>
      )}
    </>
  )
}
