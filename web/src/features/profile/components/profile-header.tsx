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

import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserAvatarFallback } from '@/lib/avatar'
import { formatCompactNumber, formatQuota } from '@/lib/format'
import { getRoleLabel } from '@/lib/roles'

import { getDisplayName } from '../lib'
import type { UserProfile } from '../types'

interface ProfileHeaderProps {
  profile: UserProfile | null
  loading: boolean
}

function ProfileHeaderSkeleton() {
  return (
    <section className='profile-identity' aria-busy='true'>
      <div className='profile-identity-main'>
        <Skeleton className='profile-avatar' />
        <div className='flex min-w-0 flex-1 flex-col gap-2'>
          <Skeleton className='h-7 w-48 max-w-full' />
          <Skeleton className='h-4 w-64 max-w-full' />
        </div>
      </div>
      <div className='profile-stats' aria-hidden='true'>
        {['balance', 'usage', 'requests'].map((key) => (
          <div key={key} className='profile-stat'>
            <Skeleton className='h-3.5 w-20 max-w-full' />
            <Skeleton className='mt-2 h-6 w-28 max-w-full' />
          </div>
        ))}
      </div>
    </section>
  )
}

export function ProfileHeader(props: ProfileHeaderProps) {
  const { t } = useTranslation()

  if (props.loading) return <ProfileHeaderSkeleton />
  if (!props.profile) return null

  const displayName = getDisplayName(props.profile)
  const avatarName = props.profile.username || displayName
  const avatarFallback = getUserAvatarFallback(avatarName)
  const roleLabel = getRoleLabel(props.profile.role)
  const stats = [
    {
      label: t('Current Balance'),
      value: formatQuota(props.profile.quota),
    },
    {
      label: t('Total Usage'),
      value: formatQuota(props.profile.used_quota),
    },
    {
      label: t('API Requests'),
      value: formatCompactNumber(props.profile.request_count),
    },
  ]

  return (
    <section className='profile-identity' aria-label={t('Personal Settings')}>
      <div className='profile-identity-main'>
        <Avatar className='profile-avatar'>
          <AvatarFallback className='profile-avatar-fallback'>
            {avatarFallback}
          </AvatarFallback>
        </Avatar>

        <div className='profile-identity-copy'>
          <div className='profile-identity-heading'>
            <h1 className='profile-identity-name' title={displayName}>
              {displayName}
            </h1>
            <span className='profile-role'>{roleLabel}</span>
          </div>

          <div className='profile-identity-details'>
            <span className='profile-identity-contact'>
              @{props.profile.username}
            </span>
            {props.profile.email && (
              <span className='profile-identity-contact'>
                {props.profile.email}
              </span>
            )}
            <span className='profile-user-id'>
              <span>
                {t('User ID')} {props.profile.id}
              </span>
              <CopyButton
                value={String(props.profile.id)}
                aria-label={`${t('Copy to clipboard')}: ${t('User ID')}`}
                className='profile-copy-button'
                iconClassName='size-3.5'
              />
            </span>
          </div>
        </div>
      </div>

      <dl className='profile-stats'>
        {stats.map((item) => (
          <div key={item.label} className='profile-stat'>
            <dt>{item.label}</dt>
            <dd title={item.value}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
