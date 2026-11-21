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

import {
  NavApiKeysIcon,
  NavAuditLogsIcon,
  NavChannelsIcon,
  NavDashboardIcon,
  NavModelsIcon,
  NavOverviewIcon,
  NavPlaygroundIcon,
  NavProfileIcon,
  NavRedemptionIcon,
  NavSecurityIcon,
  NavSubscriptionsIcon,
  NavSystemInfoIcon,
  NavSystemSettingsIcon,
  NavTaskLogsIcon,
  NavTaskPluginsIcon,
  NavUsageLogsIcon,
  NavUsersIcon,
  NavWalletIcon,
} from '@/components/icons/nav-icons'
import type { SidebarBadges, SidebarData } from '@/components/layout/types'
import { ROLE } from '@/lib/roles'

/**
 * Root navigation groups for the application sidebar.
 *
 * These are shown when the URL does not match any nested sidebar view
 * registered in `layout/lib/sidebar-view-registry.ts`.
 */
export function useSidebarData(badges: SidebarBadges = {}): SidebarData {
  const { t } = useTranslation()

  return {
    navGroups: [
      {
        id: 'general',
        title: t('General'),
        items: [
          {
            title: t('Chat plaza'),
            url: '/playground',
            icon: NavPlaygroundIcon,
          },
          {
            title: t('Overview'),
            url: '/dashboard/overview',
            icon: NavOverviewIcon,
          },
          {
            title: t('Dashboard'),
            url: '/dashboard/models',
            icon: NavDashboardIcon,
          },
          {
            title: t('API Keys'),
            url: '/keys',
            icon: NavApiKeysIcon,
          },
          {
            title: t('Usage Logs'),
            url: '/usage-logs/common',
            icon: NavUsageLogsIcon,
          },
          {
            title: t('Audit Logs'),
            url: '/usage-logs/audit',
            icon: NavAuditLogsIcon,
          },
          {
            title: t('Task Logs'),
            url: '/usage-logs/task',
            activeUrls: ['/usage-logs/drawing'],
            configUrls: ['/usage-logs/drawing', '/usage-logs/task'],
            icon: NavTaskLogsIcon,
          },
        ],
      },
      {
        id: 'personal',
        title: t('Personal'),
        items: [
          {
            title: t('Wallet'),
            url: '/wallet',
            icon: NavWalletIcon,
          },
          {
            title: t('Profile'),
            url: '/profile',
            icon: NavProfileIcon,
          },
          {
            title: t('Security & Access'),
            url: '/security',
            icon: NavSecurityIcon,
          },
        ],
      },
      {
        id: 'admin',
        title: t('Admin'),
        items: [
          {
            title: t('Channels'),
            url: '/channels',
            icon: NavChannelsIcon,
          },
          {
            title: t('Models'),
            url: '/models/metadata',
            icon: NavModelsIcon,
          },
          {
            title: t('Users'),
            url: '/users',
            icon: NavUsersIcon,
          },
          {
            title: t('Redemption Codes'),
            url: '/redemption-codes',
            icon: NavRedemptionIcon,
          },
          {
            title: t('Subscriptions'),
            url: '/subscriptions',
            icon: NavSubscriptionsIcon,
          },
          {
            title: t('System Info'),
            url: '/system-info',
            icon: NavSystemInfoIcon,
            requiredRole: ROLE.SUPER_ADMIN,
          },
          {
            title: t('Task Plugins'),
            url: '/task-plugins',
            icon: NavTaskPluginsIcon,
            requiredRole: ROLE.SUPER_ADMIN,
          },
          {
            title: t('System Settings'),
            url: '/system-settings/site',
            activeUrls: ['/system-settings'],
            icon: NavSystemSettingsIcon,
            requiredRole: ROLE.SUPER_ADMIN,
            // Model pricing lives in System Settings.
            badge: badges.modelPricing,
          },
        ],
      },
    ],
  }
}
