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
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SidebarInset } from '@/components/ui/sidebar'

import { PageFooterPortal } from '../components/page-footer'
import { SectionPageLayout } from '../components/section-page-layout'

describe('workspace page layout', () => {
  it('exposes one focusable main landmark as the skip-navigation target', () => {
    render(
      <SidebarInset>
        <SectionPageLayout>
          <SectionPageLayout.Title>Overview</SectionPageLayout.Title>
          <SectionPageLayout.Content>Workspace</SectionPageLayout.Content>
        </SectionPageLayout>
      </SidebarInset>
    )
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'content')
    expect(main).toHaveAttribute('tabindex', '-1')
    main.focus()
    expect(main).toHaveFocus()
  })
  it('keeps long titles, descriptions and actions available above the scrollable content', () => {
    const title =
      'A project name that is intentionally much longer than the available mobile header width'
    render(
      <SectionPageLayout stackActionsOnMobile>
        <SectionPageLayout.Title>{title}</SectionPageLayout.Title>
        <SectionPageLayout.Description>
          Manage keys and access
        </SectionPageLayout.Description>
        <SectionPageLayout.Actions>
          <button type='button'>Create key</button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <div>Page content</div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )

    const heading = screen.getByRole('heading', { name: title })
    expect(heading).toHaveClass('break-words')
    expect(heading).not.toHaveClass('truncate')
    expect(screen.getByText('Manage keys and access')).toBeVisible()
    const content = screen.getByText('Page content').parentElement
    expect(content).toHaveClass('overflow-auto')
    expect(content).not.toContainElement(
      screen.getByRole('button', { name: 'Create key' })
    )
  })

  it('lets a fixed table own scrolling while keeping pagination outside that region', () => {
    render(
      <SectionPageLayout fixedContent>
        <SectionPageLayout.Title>API Keys</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div>Table rows</div>
          <PageFooterPortal>
            <nav aria-label='Pagination'>Page 1 of 3</nav>
          </PageFooterPortal>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )

    const content = screen.getByText('Table rows').parentElement
    expect(content).toHaveClass('overflow-hidden')
    const pagination = screen.getByRole('navigation', { name: 'Pagination' })
    expect(pagination).toBeVisible()
    expect(content).not.toContainElement(pagination)
  })
})
