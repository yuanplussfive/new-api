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
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { CheckinSettingsSection } from '../checkin-settings-section'

const pools = {
  vip: [{ name: 'VIP bonus', quota: 5000, weight: 1 }],
  standard: [{ name: 'Standard bonus', quota: 1000, weight: 1 }],
}

function renderSettings(groupRewards = JSON.stringify(pools)) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <CheckinSettingsSection defaultValues={{ enabled: true, groupRewards }} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: ['vip', 'standard', 'new-group'] },
  })
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
})

test('editing a decimal reward preserves typing and saves only the selected group amount', async () => {
  const user = userEvent.setup()
  renderSettings()
  const input = screen.getAllByRole('spinbutton', { name: /Reward amount/ })[0]
  await user.clear(input)
  await user.type(input, '0.04')
  expect(input).toHaveValue(0.04)
  await user.tab()
  await user.click(
    screen.getByRole('button', { name: 'Save check-in settings' })
  )
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'checkin_setting.group_rewards',
      value: JSON.stringify({
        ...pools,
        vip: [{ name: 'VIP bonus', quota: 20000, weight: 1 }],
      }),
    })
  )
})

test('removing a group saves its removal and leaves the other pool unchanged', async () => {
  renderSettings()
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Reward pool 1' })).getByRole(
      'button',
      { name: 'Remove group' }
    )
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Save check-in settings' })
  )
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'checkin_setting.group_rewards',
      value: JSON.stringify({ standard: pools.standard }),
    })
  )
})

test('an empty policy requires adding a group and previews its tier probabilities', async () => {
  renderSettings('{}')
  expect(
    screen.getByText('No groups are eligible until you add a reward pool.')
  ).toBeInTheDocument()
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Add group reward pool' })
    ).toBeEnabled()
  )
  fireEvent.click(screen.getByRole('button', { name: 'Add group reward pool' }))
  expect(screen.getByRole('combobox', { name: 'User group' })).toHaveValue(
    'vip'
  )
  expect(screen.getByText('80%')).toBeInTheDocument()
  expect(screen.getByText('18%')).toBeInTheDocument()
  expect(screen.getByText('2%')).toBeInTheDocument()
})

test('an invalid weight shows an accessible error and prevents saving', async () => {
  renderSettings()
  const input = screen.getAllByRole('spinbutton', { name: 'Weight' })[0]
  fireEvent.change(input, { target: { value: '0' } })
  fireEvent.click(
    screen.getByRole('button', { name: 'Save check-in settings' })
  )
  await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
  expect(api.put).not.toHaveBeenCalled()
})

test('after removing the first group, adding a tier changes only the remaining pool', async () => {
  renderSettings()
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Reward pool 1' })).getByRole(
      'button',
      { name: 'Remove group' }
    )
  )
  fireEvent.click(screen.getByRole('button', { name: 'Add reward tier' }))
  fireEvent.click(
    screen.getByRole('button', { name: 'Save check-in settings' })
  )
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'checkin_setting.group_rewards',
      value: JSON.stringify({
        standard: [
          ...pools.standard,
          { name: 'Reward tier', quota: 1000, weight: 1 },
        ],
      }),
    })
  )
})

test('failed settings saves keep the edits available for retry', async () => {
  vi.mocked(api.put).mockResolvedValue({
    data: { success: false, message: 'Save failed' },
  })
  renderSettings()
  fireEvent.change(screen.getAllByRole('textbox', { name: 'Reward name' })[0], {
    target: { value: 'Updated bonus' },
  })
  fireEvent.click(
    screen.getByRole('button', { name: 'Save check-in settings' })
  )
  await waitFor(() => expect(api.put).toHaveBeenCalled())
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Save check-in settings' })
    ).toBeEnabled()
  )
  expect(screen.getByDisplayValue('Updated bonus')).toBeInTheDocument()
})

test('disabling check-in turns it off before replacing reward pools', async () => {
  renderSettings()
  fireEvent.click(
    screen.getByRole('switch', { name: 'Enable check-in feature' })
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Save check-in settings' })
  )
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2))
  expect(vi.mocked(api.put).mock.calls[0]).toEqual([
    '/api/option/',
    { key: 'checkin_setting.enabled', value: 'false' },
  ])
})
