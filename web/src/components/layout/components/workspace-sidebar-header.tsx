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
import { Search } from '@/components/search'
import { SidebarHeader, SidebarTrigger } from '@/components/ui/sidebar'

import { SystemBrand } from './system-brand'

export function WorkspaceSidebarHeader() {
  return (
    <SidebarHeader className='workspace-sidebar-header gap-3 px-2 pt-3 pb-2'>
      <div className='flex min-w-0 items-center justify-between gap-1 group-data-[collapsible=icon]:flex-col'>
        <div className='min-w-0 flex-1 group-data-[collapsible=icon]:flex-none'>
          <SystemBrand variant='sidebar' />
        </div>
        <SidebarTrigger className='text-muted-foreground size-7 shrink-0' />
      </div>
      <Search className='hover:bg-surface-subtle text-muted-foreground hover:text-content-strong h-8 w-full! flex-none border-0 bg-transparent text-xs shadow-none transition-colors group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:shrink-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:[&>kbd]:hidden group-data-[collapsible=icon]:[&>span]:hidden group-data-[collapsible=icon]:[&>svg]:static group-data-[collapsible=icon]:[&>svg]:size-[18px] group-data-[collapsible=icon]:[&>svg]:translate-y-0' />
    </SidebarHeader>
  )
}
