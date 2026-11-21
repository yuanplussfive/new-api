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

import { useDashboardContentVisibility } from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { ApiInfoPanel } from './api-info-panel'
import { FAQPanel } from './faq-panel'
import { PerformanceHealthPanel } from './performance-health-panel'
import { UptimePanel } from './uptime-panel'

export function OverviewPanels(props: { isAdmin: boolean }) {
  const {
    apiInfo: showApiInfoPanel,
    announcements: showAnnouncementsPanel,
    faq: showFAQPanel,
    uptimeKuma: showUptimePanel,
  } = useDashboardContentVisibility()

  const panels: { key: string; node: ReactNode }[] = []
  if (showApiInfoPanel) panels.push({ key: 'api-info', node: <ApiInfoPanel /> })
  if (showAnnouncementsPanel) {
    panels.push({ key: 'announcements', node: <AnnouncementsPanel /> })
  }
  if (showFAQPanel) panels.push({ key: 'faq', node: <FAQPanel /> })
  if (showUptimePanel) panels.push({ key: 'uptime', node: <UptimePanel /> })

  if (!props.isAdmin && panels.length === 0) return null

  return (
    <>
      {props.isAdmin && (
        <div className='border-t border-line-subtle'>
          <PerformanceHealthPanel />
        </div>
      )}
      {panels.length > 0 && (
        <div className='-mr-px -mb-px grid grid-cols-1 border-t border-line-subtle md:grid-cols-2 xl:grid-cols-3'>
          {panels.map((panel) => (
            <div
              key={panel.key}
              className='min-w-0 border-r border-b border-line-subtle bg-card'
            >
              {panel.node}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
