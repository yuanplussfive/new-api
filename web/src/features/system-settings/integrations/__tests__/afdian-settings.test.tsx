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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { AfdianSettingsSection } from '../afdian-settings-section'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

const config = {
  enabled: false,
  user_id: 'a'.repeat(32),
  products: [],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.get).mockResolvedValue({
    data: { success: true, data: { config } },
  })
})

test('loads and saves code delivery settings without credentials or webhook configuration', async () => {
  vi.mocked(api.put).mockResolvedValue({
    data: { success: true, data: { config } },
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AfdianSettingsSection />
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Afdian creator user ID')).toHaveValue(
      config.user_id
    )
  )
  expect(screen.queryByLabelText('API Token')).not.toBeInTheDocument()
  expect(screen.queryByText('Webhook URL')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Delivery mode')).not.toBeInTheDocument()
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Save Afdian settings' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/afdian', config)
  )
})

test.each([true, false])(
  'generates codes with the saved product quota and preserves returned inventory when success is %s',
  async (success) => {
    const codeConfig = {
      ...config,
      enabled: true,
      products: [
        {
          plan_id: 'e'.repeat(32),
          name: '16 CNY',
          price: '16.00',
          quota: 10000000,
        },
      ],
    }
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { config: codeConfig },
      },
    })
    vi.mocked(api.post).mockResolvedValue({
      data: {
        success,
        message: success ? '' : 'Partial batch failure',
        data: ['codeA', 'codeB'],
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <AfdianSettingsSection />
      </QueryClientProvider>
    )
    const generate = await screen.findByRole('button', {
      name: 'Generate delivery codes',
    })
    expect(generate).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Codes per batch'), {
      target: { value: '2' },
    })
    await userEvent.setup().click(generate)
    expect(
      await screen.findByRole('dialog', { name: 'Redemption codes created' })
    ).toBeVisible()
    expect(
      screen.getByRole('radio', { name: 'One code per line' })
    ).toBeChecked()
    expect(api.post).toHaveBeenCalledWith('/api/redemption/', {
      name: 'Afdian 16 CNY',
      quota: 10000000,
      count: 2,
      expired_time: 0,
    })
  }
)

test('unsaved delivery changes and invalid batch sizes cannot generate codes', async () => {
  const codeConfig = {
    ...config,
    products: [
      {
        plan_id: 'e'.repeat(32),
        name: '16 CNY',
        price: '16.00',
        quota: 10000000,
      },
    ],
  }
  vi.mocked(api.get).mockResolvedValue({
    data: {
      success: true,
      data: { config: codeConfig },
    },
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AfdianSettingsSection />
    </QueryClientProvider>
  )
  const generate = await screen.findByRole('button', {
    name: 'Generate delivery codes',
  })
  const count = screen.getByLabelText('Codes per batch')
  for (const value of ['0', '101', '1.5']) {
    fireEvent.change(count, { target: { value } })
    expect(count).toHaveAttribute('aria-invalid', 'true')
    expect(generate).toBeDisabled()
  }
  fireEvent.change(count, { target: { value: '2' } })
  expect(generate).toBeEnabled()
  fireEvent.change(screen.getByLabelText('Afdian creator user ID'), {
    target: { value: 'f'.repeat(32) },
  })
  expect(
    screen.getByRole('button', { name: 'Generate delivery codes' })
  ).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent(
    'Save product settings before generating codes.'
  )
  expect(api.post).not.toHaveBeenCalled()
})
