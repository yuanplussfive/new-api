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
import { Skeleton } from '@/components/ui/skeleton'

import type { UserProfile } from '../types'
import { NotificationTab } from './tabs/notification-tab'

interface ProfileSettingsCardProps {
  profile: UserProfile | null
  loading: boolean
  onProfileUpdate: () => void
  quotaRemindEnabled: boolean
  quotaRemindThreshold: number
}

export function ProfileSettingsCard(props: ProfileSettingsCardProps) {
  if (props.loading) {
    return (
      <div className='profile-section' aria-busy='true'>
        <Skeleton className='h-5 w-32' />
        <div className='mt-5 flex flex-col gap-4'>
          {['method', 'reminder', 'preference'].map((key) => (
            <Skeleton key={key} className='h-12 w-full' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <NotificationTab
      profile={props.profile}
      onUpdate={props.onProfileUpdate}
      quotaRemindEnabled={props.quotaRemindEnabled}
      quotaRemindThreshold={props.quotaRemindThreshold}
    />
  )
}
