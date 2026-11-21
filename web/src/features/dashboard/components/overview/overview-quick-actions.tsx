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

import { Button } from '@/components/ui/button'

import type { QuickAction } from './overview-types'

export function QuickActionItem(props: { action: QuickAction }) {
  const Icon = props.action.icon

  return (
    <Button
      variant='ghost'
      aria-label={props.action.title}
      className='text-content-secondary hover:text-content-strong h-9 justify-start gap-2.5 rounded-[7px] px-2.5 text-left'
      render={<Link to={props.action.to} />}
    >
      <Icon className='size-3.5 shrink-0' aria-hidden='true' />
      <span className='min-w-0 flex-1 truncate text-[12.5px] font-medium'>
        {props.action.title}
      </span>
      <span aria-hidden='true' className='text-content-muted text-[11px]'>
        →
      </span>
    </Button>
  )
}

export function CompactQuickAction(props: { action: QuickAction }) {
  const Icon = props.action.icon

  return (
    <Button
      variant='outline'
      size='sm'
      className='bg-background/70 h-8 min-w-24 gap-1.5 px-2.5'
      render={<Link to={props.action.to} />}
    >
      <Icon data-icon='inline-start' />
      <span>{props.action.title}</span>
    </Button>
  )
}
