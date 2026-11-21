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
import { LaptopIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { toIntlLocale } from '@/i18n/languages'
import dayjs from '@/lib/dayjs'
import { formatTimestampRelative } from '@/lib/format'
import type { LoginSession } from '@/stores/auth-store'

import { loginMethodLabel, sessionDevice } from './login-session-utils'

interface LoginSessionItemProps {
  session: LoginSession
  onRevoke: (session: LoginSession) => void
}

export function LoginSessionItem({ session, onRevoke }: LoginSessionItemProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const maxTouchPoints =
    session.current && typeof navigator !== 'undefined'
      ? navigator.maxTouchPoints
      : 0

  return (
    <div className='flex items-start gap-3 py-3'>
      <div className='text-content-muted mt-0.5 flex size-5 shrink-0 items-center justify-center'>
        <HugeiconsIcon icon={LaptopIcon} className='size-4' strokeWidth={2} />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <p className='text-content-strong text-[13px] font-medium'>
            {sessionDevice(
              session.user_agent,
              t('Unknown device'),
              t('Browser'),
              maxTouchPoints
            )}
          </p>
          {session.current && (
            <span className='text-content-muted text-[10px] tracking-[0.05em] uppercase'>
              {t('Current')}
            </span>
          )}
        </div>
        <p className='text-content-muted mt-0.5 font-mono text-[10.5px] tabular-nums'>
          {t('IP: {{ip}} · Method: {{method}}', {
            ip: session.ip || t('Unknown'),
            method: loginMethodLabel(session.login_method, t),
          })}
        </p>
        <p className='text-content-muted mt-0.5 font-mono text-[10.5px] tabular-nums'>
          {t('Last active {{time}} · Expires {{expires}}', {
            time: formatTimestampRelative(
              session.last_active_at,
              'seconds',
              locale
            ),
            expires: dayjs.unix(session.expires_at).format('YYYY-MM-DD HH:mm'),
          })}
        </p>
      </div>
      <Button
        type='button'
        variant={session.current ? 'outline' : 'ghost'}
        size='sm'
        className='shrink-0 self-start px-2 text-[11.5px]'
        onClick={() => onRevoke(session)}
      >
        {session.current ? t('Sign out') : t('Revoke')}
      </Button>
    </div>
  )
}
