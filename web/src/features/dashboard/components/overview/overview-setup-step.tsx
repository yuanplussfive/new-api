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
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { StartStep } from './overview-types'

export function StartStepItem(props: { step: StartStep; index: number }) {
  return (
    <li>
      <Link
        to={props.step.to}
        className='group/hover flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none'
      >
        <span
          className={cn(
            'flex size-[22px] shrink-0 items-center justify-center rounded-full border text-[10.5px] font-semibold tabular-nums transition-colors',
            props.step.completed
              ? 'border-success/35 bg-success/10 text-success'
              : 'border-line text-content-muted'
          )}
          aria-hidden='true'
        >
          {props.step.completed ? (
            <Check className='size-3' strokeWidth={2.75} />
          ) : (
            props.index + 1
          )}
        </span>

        <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <span className='text-content-strong truncate text-[13px] font-medium'>
            {props.step.title}
          </span>
          <span className='text-content-secondary line-clamp-1 text-[12px]'>
            {props.step.description}
          </span>
        </span>

        <ArrowRight
          className='text-content-muted size-3.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover/hover:opacity-100 group-focus-visible/hover:opacity-100'
          aria-hidden='true'
        />
      </Link>
    </li>
  )
}
