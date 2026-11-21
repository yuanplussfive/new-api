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

import { cn } from '@/lib/utils'

import type { HeroSignal } from './overview-types'

const TONE_DOT_CLASS: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
}

export function OverviewServiceStatus(props: { signals: HeroSignal[] }) {
  const { t } = useTranslation()

  return (
    <section
      data-dashboard-panel=''
      className='bg-card flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line'
    >
      <header className='flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3'>
        <h3 className='text-content-strong text-[12.5px] font-semibold'>
          {t('Service status')}
        </h3>
        <span className='text-content-muted font-mono text-[10.5px] tracking-[0.04em] uppercase'>
          live
        </span>
      </header>
      <ul className='divide-y divide-line-subtle'>
        {props.signals.map((signal) => {
          const Icon = signal.icon
          return (
            <li
              key={signal.label}
              className='flex items-center justify-between gap-3 px-4 py-2.5'
            >
              <span className='flex min-w-0 items-center gap-2'>
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    TONE_DOT_CLASS[signal.tone] ?? 'bg-content-muted'
                  )}
                  aria-hidden='true'
                />
                <Icon
                  className='text-content-muted size-3.5 shrink-0'
                  aria-hidden='true'
                />
                <span className='text-content-secondary truncate text-[12px]'>
                  {signal.label}
                </span>
              </span>
              <span className='text-content-strong shrink-0 text-[12px] font-medium'>
                {signal.value}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
