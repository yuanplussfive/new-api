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
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  index?: string
  label?: string
  title?: string
  description?: string
  className?: string
}

/** Plain editorial heading; decorative indices are intentionally omitted. */
export function SectionHeading(props: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-3', props.className)}>
      {props.label && (
        <span className='text-content-muted font-mono text-[11px] tracking-[0.12em] uppercase'>
          {props.label}
        </span>
      )}
      {props.title && (
        <h2 className='text-content-strong text-[clamp(1.5rem,2.4vw,2.15rem)] leading-[1.2] font-medium tracking-[-0.025em] text-balance'>
          {props.title}
        </h2>
      )}
      {props.description && (
        <p className='text-content-secondary max-w-xl text-[14px] leading-[1.8]'>
          {props.description}
        </p>
      )}
    </div>
  )
}
