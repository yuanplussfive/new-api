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
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { isValidElement } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap select-none outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(35_33_28/0.14)] hover:bg-[color-mix(in_oklch,var(--primary)_90%,var(--foreground))] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_2px_4px_rgb(35_33_28/0.16)]',
        outline:
          'border-line bg-surface-panel text-content-primary shadow-[0_1px_1px_rgb(35_33_28/0.04)] hover:border-line-strong hover:bg-surface-hover hover:text-content-strong aria-expanded:bg-surface-hover',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary)_88%,var(--foreground))] aria-expanded:bg-secondary',
        ghost:
          'text-content-secondary hover:bg-surface-hover hover:text-content-strong aria-expanded:bg-surface-hover',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/16 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/26',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-[34px] px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        xs: "h-[26px] gap-1 rounded-md px-2 text-[11.5px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[7px] px-2.5 text-[12.5px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-[38px] px-4 text-[13.5px] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-[34px]',
        'icon-xs': "size-[26px] rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 rounded-[7px]',
        'icon-lg': 'size-[38px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function isNativeButtonRender(render: ButtonPrimitive.Props['render']) {
  if (!render || !isValidElement(render)) {
    return true
  }

  return render.type === 'button'
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }))}
      nativeButton={nativeButton ?? isNativeButtonRender(render)}
      render={render}
      {...props}
    />
  )
}

export { Button, buttonVariants }
