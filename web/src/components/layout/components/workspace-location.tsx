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
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSidebarData } from '@/hooks/use-sidebar-data'
import { resolveSidebarView } from '../lib/sidebar-view-registry'
import type { NavItem } from '../types'

export function WorkspaceLocation() {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const root = useSidebarData()
  const view = resolveSidebarView(pathname)
  const groups = view ? view.getNavGroups(t, {}) : root.navGroups
  const candidates = groups.flatMap((group) =>
    group.items.flatMap<Pick<NavItem, 'title' | 'url'>>(
      (item) => item.items ?? [item]
    )
  )
  const active = candidates
    .filter(
      (item) =>
        item.url && (pathname === item.url || pathname.startsWith(`${item.url}/`))
    )
    .sort((a, b) => (b.url?.length ?? 0) - (a.url?.length ?? 0))[0]
  const label = active?.title ?? t('Dashboard')
  return (
    <nav aria-label={t('Breadcrumb')} className='flex min-w-0 flex-1 items-center gap-2 text-xs'>
      <Link to='/' aria-label={t('Go to home')} className='text-muted-foreground hover:text-foreground shrink-0 rounded-sm p-1 focus-visible:outline-2 focus-visible:outline-ring'><Home className='size-3.5' aria-hidden='true' /></Link>
      <ChevronRight className='text-muted-foreground/50 size-3 shrink-0' aria-hidden='true' />
      {view && <><span className='text-muted-foreground hidden truncate sm:inline'>{t('System Settings')}</span><ChevronRight className='text-muted-foreground/50 hidden size-3 shrink-0 sm:block' aria-hidden='true' /></>}
      <span className='truncate font-medium' aria-current='page'>{label}</span>
    </nav>
  )
}
