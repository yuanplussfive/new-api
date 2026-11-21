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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './card'
import { IconBadge, type IconBadgeTone } from './icon-badge'

type TitledCardProps = {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children?: ReactNode
  disableHoverEffect?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  iconClassName?: string
  iconTone?: IconBadgeTone
  titleClassName?: string
  descriptionClassName?: string
  /**
   * `plain` drops the card frame so the section reads as a region of the
   * page surface. Used where stacked cards would fight the page layout.
   */
  variant?: 'card' | 'plain'
}

export function TitledCard({
  title,
  description,
  icon,
  action,
  children,
  disableHoverEffect,
  className,
  headerClassName,
  contentClassName,
  iconClassName,
  iconTone,
  titleClassName,
  descriptionClassName,
  variant = 'card',
}: TitledCardProps) {
  const isPlain = variant === 'plain'

  return (
    <Card
      data-slot='titled-card'
      data-card-hover={disableHoverEffect ? 'false' : undefined}
      className={cn(
        'gap-0 overflow-hidden py-0',
        isPlain && 'border-0 bg-transparent shadow-none',
        className
      )}
    >
      <CardHeader
        className={cn(
          'border-b border-line-subtle p-4 !pb-4 sm:px-5 sm:!pb-4',
          isPlain && 'px-0 sm:px-0',
          headerClassName
        )}
      >
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex min-w-0 items-center gap-3'>
            {icon != null &&
              (isPlain ? (
                <span
                  className='text-content-muted flex size-4 shrink-0 items-center justify-center [&_svg]:size-4'
                  aria-hidden='true'
                >
                  {icon}
                </span>
              ) : (
                <IconBadge size='title' tone={iconTone} className={iconClassName}>
                  {icon}
                </IconBadge>
              ))}
            <div className='min-w-0'>
              <CardTitle
                className={cn(
                  'text-[15px] font-semibold tracking-[-0.01em] sm:text-base',
                  titleClassName
                )}
              >
                {title}
              </CardTitle>
              {description != null && (
                <CardDescription
                  className={cn('text-content-secondary text-[12.5px] sm:text-[13px]', descriptionClassName)}
                >
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {action != null && (
            <div className='w-full shrink-0 sm:w-auto'>{action}</div>
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn('p-3 sm:p-5', isPlain && 'px-0 sm:px-0', contentClassName)}
      >
        {children}
      </CardContent>
    </Card>
  )
}
