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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useSystemConfigStore } from '@/stores/system-config-store'

import { About } from '..'

const SENERA_REPOSITORY_URL = 'https://github.com/yuanplussfive/senera'
const SENERA_DOCS_URL = `${SENERA_REPOSITORY_URL}/tree/main/docs`

let client: QueryClient

beforeEach(() => {
  window.localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(
    ['status'],
    { system_name: 'senera' },
    {
      updatedAt: Date.now() + 60_000,
    }
  )
})

afterEach(() => {
  client.clear()
  window.localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
})

async function renderAbout() {
  const router = createRouter({
    routeTree: createRootRoute({ component: About }),
    history: createMemoryHistory({ initialEntries: ['/about'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('fixed about page', () => {
  it('renders the senera runtime sections instead of custom HTML or an empty state', async () => {
    await renderAbout()
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'senera'
    )
    expect(screen.queryByText('No About Content Set')).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByText('What senera is')).toBeVisible()
    expect(screen.getByText('How execution is controlled')).toBeVisible()
    expect(screen.getByText('What it does not require')).toBeVisible()
  })

  it('lists the senera project facts and links the repository', async () => {
    await renderAbout()
    const facts = screen.getByText('Project').closest('dl')
    expect(facts).not.toBeNull()
    expect(within(facts as HTMLElement).getByText('senera')).toBeVisible()
    expect(within(facts as HTMLElement).getByText('Apache-2.0')).toBeVisible()
    expect(
      within(facts as HTMLElement).getByText('yuanplussfive')
    ).toBeVisible()

    expect(
      screen.getByRole('link', { name: /github\.com\/yuanplussfive\/senera/ })
    ).toHaveAttribute('href', SENERA_REPOSITORY_URL)
    const repositoryActions = screen.getAllByRole('button', {
      name: 'View the senera repository',
    })
    expect(repositoryActions.length).toBeGreaterThan(0)
    for (const action of repositoryActions) {
      expect(action).toHaveAttribute('href', SENERA_REPOSITORY_URL)
    }
  })

  it('links the senera documentation and issue tracker', async () => {
    await renderAbout()
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
      'href',
      SENERA_DOCS_URL
    )
    expect(
      screen.getByRole('link', { name: 'Issues and requests' })
    ).toHaveAttribute('href', `${SENERA_REPOSITORY_URL}/issues`)
  })

  it('keeps the policy, approval, sandbox and evidence rows in fixed copy', async () => {
    await renderAbout()
    expect(await screen.findByText('Policy')).toBeVisible()
    expect(screen.getByText('Approval')).toBeVisible()
    expect(screen.getByText('Sandbox')).toBeVisible()
    expect(screen.getByText('Evidence')).toBeVisible()
    expect(
      screen.getByText(
        'An ask decision offers four options: once, this session, deny, deny and stop.'
      )
    ).toBeVisible()
  })

  it('keeps the about page focused on senera and leaves upstream notices in the footer', async () => {
    await renderAbout()

    expect(screen.queryByText('Open-source notice')).toBeNull()
    expect(
      screen.queryByText(
        'This project is built on new-api and released under the GNU AGPL v3.'
      )
    ).toBeNull()

    const footerLink = screen.getByRole('link', { name: 'New API' })
    expect(footerLink).toHaveAttribute(
      'href',
      'https://github.com/QuantumNous/new-api'
    )
  })
})
