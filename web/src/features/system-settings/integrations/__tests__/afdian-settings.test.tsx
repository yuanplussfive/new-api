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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { AfdianSettingsSection } from '../afdian-settings-section'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), put: vi.fn() } }))

const config = {
  enabled: false,
  user_id: 'a'.repeat(32),
  api_token: '',
  products: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.get).mockResolvedValue({
    data: { success: true, data: { config, api_token_configured: true } },
  })
})

test('loads safe settings and sends a blank token when retaining the existing credential', async () => {
  vi.mocked(api.put).mockResolvedValue({
    data: { success: true, data: { config, api_token_configured: true } },
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AfdianSettingsSection />
    </QueryClientProvider>
  )
  await screen.findByText('Configured. Leave blank to keep the current token.')
  const input = screen.getByLabelText('API Token')
  expect(input).toHaveAttribute('type', 'password')
  expect(input).toHaveValue('')
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Save Afdian settings' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/afdian', config)
  )
})

test('clears a newly entered API token after a successful save even when the safe response is unchanged', async () => {
  vi.mocked(api.put).mockResolvedValue({
    data: { success: true, data: { config, api_token_configured: true } },
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AfdianSettingsSection />
    </QueryClientProvider>
  )
  await screen.findByText('Configured. Leave blank to keep the current token.')
  const user = userEvent.setup()
  const input = screen.getByLabelText('API Token')
  await user.type(input, 'replacement-test-token')
  await user.click(screen.getByRole('button', { name: 'Save Afdian settings' }))
  await waitFor(() => expect(input).toHaveValue(''))
  expect(api.put).toHaveBeenCalledWith('/api/option/afdian', {
    ...config,
    api_token: 'replacement-test-token',
  })
})
