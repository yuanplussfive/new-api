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
'use client'

import {
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Alert02Icon,
  MultiplicationSignCircleIcon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/context/theme-provider'

const Toaster = (props: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      className='toaster group'
      icons={{
        success: (
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className='text-success size-4'
          />
        ),
        info: (
          <HugeiconsIcon
            icon={InformationCircleIcon}
            strokeWidth={2}
            className='text-content-muted size-4'
          />
        ),
        warning: (
          <HugeiconsIcon
            icon={Alert02Icon}
            strokeWidth={2}
            className='text-warning size-4'
          />
        ),
        error: (
          <HugeiconsIcon
            icon={MultiplicationSignCircleIcon}
            strokeWidth={2}
            className='text-destructive size-4'
          />
        ),
        loading: (
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className='text-content-muted size-4 animate-spin'
          />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: 'items-start gap-2.5 px-3 py-2.5 backdrop-blur-md',
          title: 'text-[12.5px] leading-4 font-medium',
          description: 'text-[11.5px] leading-4 text-content-secondary',
          icon: 'mt-0.5',
          closeButton:
            'border-line-subtle bg-surface-raised text-content-muted',
        },
      }}
      style={
        {
          '--normal-bg':
            'color-mix(in srgb, var(--surface-raised) 92%, transparent)',
          '--normal-text': 'var(--content-primary)',
          '--normal-border': 'transparent',
          '--success-bg':
            'color-mix(in srgb, var(--surface-raised) 92%, transparent)',
          '--success-border': 'transparent',
          '--success-text': 'var(--content-primary)',
          '--info-bg':
            'color-mix(in srgb, var(--surface-raised) 92%, transparent)',
          '--info-border': 'transparent',
          '--info-text': 'var(--content-primary)',
          '--warning-bg':
            'color-mix(in srgb, var(--surface-raised) 92%, transparent)',
          '--warning-border': 'transparent',
          '--warning-text': 'var(--content-primary)',
          '--error-bg':
            'color-mix(in srgb, var(--surface-raised) 92%, transparent)',
          '--error-border': 'transparent',
          '--error-text': 'var(--content-primary)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
