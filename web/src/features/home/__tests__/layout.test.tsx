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
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Hero } from '../components/sections/hero'

let client: QueryClient

beforeEach(() => {
  window.localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { docs_link: 'https://docs.newapi.pro' } },
  })
})

afterEach(() => {
  client.clear()
  window.localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
})

async function renderPage(component: () => React.ReactNode) {
  const router = createRouter({
    routeTree: createRootRoute({ component }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('product homepage', () => {
  it('routes signed-in users to the console instead of registration', async () => {
    await renderPage(() => <Hero isAuthenticated />)
    expect(
      await screen.findByRole('button', { name: 'Go to Dashboard' })
    ).toHaveAttribute('href', '/dashboard')
    expect(
      screen.queryByRole('button', { name: 'Get Started' })
    ).not.toBeInTheDocument()
  })

  it('routes visitors to registration and keeps documentation safe to open externally', async () => {
    await renderPage(() => <Hero />)
    expect(
      await screen.findByRole('button', { name: 'Get Started' })
    ).toHaveAttribute('href', '/sign-up')
    expect(
      screen.getByRole('button', { name: 'View Pricing' })
    ).toHaveAttribute('href', '/pricing')
    const docs = screen.getByRole('link', { name: /Read the docs/ })
    expect(docs).toHaveAttribute('href', 'https://docs.newapi.pro')
    expect(docs).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('copies the current site endpoint instead of an example host or credential', async () => {
    const user = userEvent.setup()
    await renderPage(() => <Hero />)
    await user.click(
      await screen.findByRole('button', { name: 'Copy to clipboard' })
    )
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/v1`
    )
  })

  it('opens with the product headline and the live gateway endpoint', async () => {
    await renderPage(() => <Hero />)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Senera API'
    )
    expect(screen.getByText(`${window.location.origin}/v1`)).toBeVisible()
    expect(document.querySelector('h1')?.innerHTML).not.toContain('&lt;br')
  })

  it('offers the four native protocols with their own icons and real paths', async () => {
    const user = userEvent.setup()
    await renderPage(() => <Hero />)
    const workbench = within(await screen.findByTestId('protocol-workbench'))
    expect(workbench.getByRole('tab', { name: 'OpenAI Chat' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(
      workbench.getByText('POST /v1/chat/completions', { exact: true })
    ).toBeVisible()

    await user.click(workbench.getByRole('tab', { name: 'Claude' }))
    expect(
      workbench.getByText('POST /v1/messages', { exact: true })
    ).toBeVisible()
    await user.click(workbench.getByRole('tab', { name: 'OpenAI Responses' }))
    expect(
      workbench.getByText('POST /v1/responses', { exact: true })
    ).toBeVisible()
    await user.click(workbench.getByRole('tab', { name: 'Gemini' }))
    expect(
      workbench.getByText(
        'POST /v1beta/models/gemini-2.5-flash:generateContent',
        { exact: true }
      )
    ).toBeVisible()
  })

  it('shows the same request in plain HTTPS calls for four languages', async () => {
    const user = userEvent.setup()
    await renderPage(() => <Hero />)

    const workbench = within(await screen.findByTestId('protocol-workbench'))
    expect(workbench.getByRole('button', { name: 'Node.js' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(workbench.getByTestId('protocol-code')).toHaveTextContent(
      /await fetch\(/
    )

    await user.click(workbench.getByRole('button', { name: 'Go' }))
    expect(workbench.getByTestId('protocol-code')).toHaveTextContent(
      /http\.NewRequest/
    )

    await user.click(workbench.getByRole('button', { name: 'Python' }))
    expect(workbench.getByTestId('protocol-code')).toHaveTextContent(
      /httpx\.post/
    )

    await user.click(workbench.getByRole('button', { name: 'Rust' }))
    expect(workbench.getByTestId('protocol-code')).toHaveTextContent(
      /\.body\(r#/
    )
  })
})
