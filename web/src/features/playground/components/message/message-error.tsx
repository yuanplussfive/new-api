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
import { AlertCircle, AlertTriangle } from 'lucide-react'
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
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/stores/auth-store'

import {
  FALLBACK_ERROR_CONTENT,
  getMessageErrorState,
  isAdminRole,
  MODEL_PRICING_SETTINGS_PATH,
} from '../../lib'
import type { Message } from '../../types'

interface MessageErrorProps {
  message: Message
  className?: string
  actions?: ReactNode
}

/**
 * Inline error notice, matching the reference chat: one icon, one text line,
 * optional inline actions instead of a bordered alert card.
 */
export function MessageError(props: MessageErrorProps) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const errorState = getMessageErrorState(
    props.message,
    isAdminRole(user?.role)
  )
  const className = props.className ?? ''
  const actions = props.actions

  if (!errorState) {
    return null
  }

  if (errorState.kind === 'model-price') {
    const content =
      errorState.content === FALLBACK_ERROR_CONTENT
        ? t(FALLBACK_ERROR_CONTENT)
        : errorState.content

    return (
      <div
        className={`text-destructive flex items-start gap-1.5 pt-2 text-[14px] leading-[22px] ${className}`}
      >
        <AlertTriangle className='mt-1 size-4 shrink-0' aria-hidden='true' />
        <div className='min-w-0 space-y-1.5'>
          <p className='break-words whitespace-pre-wrap'>{content}</p>
          <div className='flex flex-wrap items-center gap-3'>
            {errorState.showSettingsLink && (
              <button
                type='button'
                className='text-brand text-[13px] hover:underline'
                onClick={() =>
                  window.open(MODEL_PRICING_SETTINGS_PATH, '_blank')
                }
              >
                {t('Go to Settings')}
              </button>
            )}
            {actions}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`text-destructive flex items-start gap-1.5 pt-2 text-[14px] leading-[22px] ${className}`}
    >
      <AlertCircle className='mt-1 size-4 shrink-0' aria-hidden='true' />
      <div className='min-w-0 space-y-1.5'>
        <p className='break-words whitespace-pre-wrap'>
          {errorState.content === FALLBACK_ERROR_CONTENT
            ? t(FALLBACK_ERROR_CONTENT)
            : errorState.content}
        </p>
        {actions}
      </div>
    </div>
  )
}
