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

import { cn } from '@/lib/utils'

interface AnimatedValueProps {
  /** Pre-formatted display string; re-keyed remounts animate the swap. */
  value: string
  className?: string
}

/**
 * Settles a changing metric into place with a short rise and fade instead of
 * snapping. Formatted strings keep currency and unit semantics untouched.
 */
export function AnimatedValue(props: AnimatedValueProps) {
  const shouldReduce = useReducedMotion()

  if (shouldReduce) {
    return <span className={props.className}>{props.value}</span>
  }

  return (
    <span className={cn('block overflow-hidden', props.className)}>
      <motion.span
        key={props.value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.33, 1, 0.68, 1] }}
        className='block'
      >
        {props.value}
      </motion.span>
    </span>
  )
}
