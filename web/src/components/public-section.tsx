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

import { cn } from '@/lib/utils'

interface PublicSectionProps {
  children: ReactNode
  className?: string
  /** Hairline above the section, used to separate same-tone blocks. */
  bordered?: boolean
  /** Dark band; the public pages only use it for the closing action. */
  tone?: 'default' | 'dark'
}

/**
 * Shared rhythm for every public section: one container width, one vertical
 * scale, one horizontal padding. Sections supply their own inner grid so the
 * landing and about pages keep an identical cadence.
 */
export function PublicSection(props: PublicSectionProps) {
  return (
    <section
      className={cn(
        'px-5 sm:px-8',
        props.tone === 'dark' && 'bg-[#0b0f14] text-neutral-50',
        props.bordered && 'border-line-subtle border-t',
        props.className
      )}
    >
      <div className='mx-auto max-w-[1120px] py-16 lg:py-24'>
        {props.children}
      </div>
    </section>
  )
}
