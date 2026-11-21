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
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { SystemUpdateAction } from '@/features/system-update/system-update-action'
import { useNotifications } from '@/hooks/use-notifications'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { Header } from './header'
import { TopNav } from './top-nav'
import { WorkspaceLocation } from './workspace-location'

export function AppHeader() {
  const notifications = useNotifications()
  const links = useTopNavLinks()
  return (
    <Header>
      <WorkspaceLocation />
      <div className='flex shrink-0 items-center gap-1 sm:gap-2'>
        {links.length > 0 && <TopNav links={links} compact />}
        <SystemUpdateAction presentation='version' />
        <NotificationPopover open={notifications.popoverOpen} onOpenChange={notifications.setPopoverOpen} unreadCount={notifications.unreadCount} activeTab={notifications.activeTab} onTabChange={notifications.setActiveTab} notice={notifications.notice} announcements={notifications.announcements} loading={notifications.loading} />
        <LanguageSwitcher />
        <ConfigDrawer />
      </div>
    </Header>
  )
}
