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
import type { ReactNode } from 'react'

import type { IconBadgeTone } from '@/components/ui/icon-badge'
import { cn } from '@/lib/utils'

/**
 * Rows stay on one line so long identifiers can be scanned down the value
 * column, matching the dense table above the dialog.
 */
export function DetailRow(props: {
  label: ReactNode
  value: ReactNode
  mono?: boolean
  muted?: boolean
}) {
  return (
    <div className='grid min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] items-baseline gap-x-3 py-1.5 text-xs leading-5 sm:grid-cols-[7rem_minmax(0,1fr)]'>
      <span className='text-content-muted min-w-0'>{props.label}</span>
      <span
        className={cn(
          'min-w-0 break-all',
          props.mono && 'font-mono text-[11.5px]',
          props.muted && 'text-content-muted'
        )}
      >
        {props.value}
      </span>
    </div>
  )
}

export function DetailSection(props: {
  icon?: ReactNode
  iconTone?: IconBadgeTone
  label: string
  variant?: 'default' | 'danger'
  children: ReactNode
}) {
  const isDanger = props.variant === 'danger'
  return (
    <section className='min-w-0'>
      <div
        className={cn(
          'text-content-secondary flex items-center gap-1.5 border-b border-line-subtle pb-1.5 text-[12px] font-semibold',
          isDanger && 'text-destructive'
        )}
      >
        {props.icon != null && (
          <span
            aria-hidden='true'
            className='inline-flex size-3.5 items-center'
          >
            {props.icon}
          </span>
        )}
        {props.label}
      </div>
      <div className='divide-line-subtle min-w-0 divide-y'>
        {props.children}
      </div>
    </section>
  )
}
