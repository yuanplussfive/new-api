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
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { NavGroup as NavigationGroup } from '../types'
import { NavGroup } from './nav-group'

export function WorkspaceNavigation(props: { groups: NavigationGroup[]; contextual: boolean }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const search = props.contextual ? query.trim().toLocaleLowerCase() : ''
  const groups = props.groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !search || `${group.title} ${item.title}`.toLocaleLowerCase().includes(search)),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      {props.contextual && (
        <div className='relative mx-3 mb-3 group-data-[collapsible=icon]:hidden'>
          <Search className='text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-3.5' aria-hidden='true' />
          <Input aria-label={t('Search settings')} placeholder={t('Search settings')} value={query} onChange={(event) => setQuery(event.target.value)} className='h-8 bg-background/60 pr-8 pl-8 text-xs' />
          {query && <Button variant='ghost' size='icon-xs' className='absolute top-1 right-1' aria-label={t('Clear search')} onClick={() => setQuery('')}><X /></Button>}
        </div>
      )}
      {groups.map((group) => <NavGroup key={group.id || group.title} {...group} />)}
      {groups.length === 0 && <EmptyState title={t('No results found')} className='px-3 py-6' />}
    </>
  )
}
