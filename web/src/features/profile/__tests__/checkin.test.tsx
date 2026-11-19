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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18next from 'i18next'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { toIntlLocale } from '@/i18n/languages'
import { handleServerError } from '@/lib/handle-server-error'

import { getCheckinStatus, performCheckin } from '../api'
import { CheckinCalendarCard } from '../components/checkin-calendar-card'
import { formatCheckinProbability } from '../lib/checkin-rewards'
import type { CheckinResponse, CheckinStatusResponse } from '../types'

vi.mock('../api', () => ({
  getCheckinStatus: vi.fn(),
  performCheckin: vi.fn(),
}))
vi.mock('@/lib/handle-server-error', () => ({ handleServerError: vi.fn() }))

const reward = { name: 'Group bonus', quota: 5000, weight: 1 }
const status: CheckinStatusResponse = {
  today: '2026-11-19',
  enabled: true,
  eligible: true,
  group: 'vip',
  reward_tiers: [reward],
  stats: {
    checked_in_today: false,
    total_checkins: 0,
    total_quota: 0,
    checkin_count: 0,
    records: [],
  },
}
const result: CheckinResponse = {
  checkin_date: status.today,
  quota_awarded: 5000,
  reward_tier_index: 0,
  reward_tiers: [reward],
}
const clients: QueryClient[] = []

function renderCheckin(onCheckin = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <CheckinCalendarCard
        checkinEnabled
        turnstileEnabled={false}
        turnstileSiteKey=''
        onCheckin={onCheckin}
      />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(getCheckinStatus).mockResolvedValue({ success: true, data: status })
  vi.mocked(performCheckin).mockResolvedValue({ success: true, data: result })
})
afterEach(async () => {
  for (const client of clients.splice(0)) client.clear()
  await i18next.changeLanguage('en')
})

test('an unconfigured group sees its history but cannot start a draw', async () => {
  vi.mocked(getCheckinStatus).mockResolvedValue({
    success: true,
    data: { ...status, eligible: false, reward_tiers: [] },
  })
  renderCheckin()
  expect(
    await screen.findByRole('button', { name: 'Check-in unavailable' })
  ).toBeDisabled()
  expect(
    screen.getByText('Check-in is not available for your user group')
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('region', { name: 'Daily reward draw' })
  ).not.toBeInTheDocument()
  expect(performCheckin).not.toHaveBeenCalled()
})

test('a pending draw blocks repeated clicks and announces the result with reduced motion', async () => {
  let finish!: (value: { success: boolean; data: CheckinResponse }) => void
  vi.mocked(performCheckin).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const onCheckin = vi.fn()
  renderCheckin(onCheckin)
  const button = await screen.findByRole('button', {
    name: 'Spin and check in',
  })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(button).toBeDisabled()
  expect(
    screen.getByRole('region', { name: 'Daily reward draw' })
  ).toHaveAttribute('aria-busy', 'true')
  expect(performCheckin).toHaveBeenCalledTimes(1)
  await act(async () => finish({ success: true, data: result }))
  expect(
    await screen.findByRole('button', { name: 'Checked in' })
  ).toBeDisabled()
  expect(screen.getByText(/You received Group bonus/)).toBeInTheDocument()
  expect(
    screen.getByRole('region', { name: 'Daily reward draw' })
  ).toHaveAttribute('aria-busy', 'false')
  expect(onCheckin).toHaveBeenCalledOnce()
})

test('a zero reward uses the server result pool and still consumes the daily draw', async () => {
  vi.mocked(performCheckin).mockResolvedValue({
    success: true,
    data: {
      ...result,
      quota_awarded: 0,
      reward_tier_index: 1,
      reward_tiers: [reward, { name: 'Participation', quota: 0, weight: 99 }],
    },
  })
  renderCheckin()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Spin and check in' })
  )
  expect(
    await screen.findByText(/You received Participation/)
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Checked in' })).toBeDisabled()
  expect(screen.getByText('99%')).toBeInTheDocument()
})

test('reloading an already checked-in account does not invite another draw', async () => {
  vi.mocked(getCheckinStatus).mockResolvedValue({
    success: true,
    data: { ...status, stats: { ...status.stats, checked_in_today: true } },
  })
  renderCheckin()
  expect(
    await screen.findByRole('button', { name: 'Checked in' })
  ).toBeDisabled()
  expect(
    screen.queryByText('Spin to reveal your daily reward')
  ).not.toBeInTheDocument()
})

test('a failed draw reports the error and enables a retry without crediting', async () => {
  vi.mocked(performCheckin).mockResolvedValue({
    success: false,
    message: 'Draw failed',
  })
  const onCheckin = vi.fn()
  renderCheckin(onCheckin)
  fireEvent.click(
    await screen.findByRole('button', { name: 'Spin and check in' })
  )
  await waitFor(() => expect(handleServerError).toHaveBeenCalled())
  expect(
    screen.getByRole('button', { name: 'Spin and check in' })
  ).toBeEnabled()
  expect(onCheckin).not.toHaveBeenCalled()
})

test('failed status loading offers a retry and recovers the draw', async () => {
  vi.mocked(getCheckinStatus).mockRejectedValueOnce(new Error('Offline'))
  renderCheckin()
  fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
  expect(
    await screen.findByRole('button', { name: 'Spin and check in' })
  ).toBeEnabled()
})

test('normal motion announces the reward only after the reels stop', async () => {
  const normalMotion = { ...window.matchMedia(''), matches: false }
  vi.spyOn(window, 'matchMedia').mockReturnValue(normalMotion)
  renderCheckin()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Spin and check in' })
  )
  expect(screen.queryByText(/You received Group bonus/)).not.toBeInTheDocument()
  expect(
    await screen.findByText(/You received Group bonus/)
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Checked in' })).toBeDisabled()
})

test('switching the interface language updates probability formatting', async () => {
  i18next.addResourceBundle('fr', 'translation', {
    'Daily reward draw': 'Tirage quotidien',
  })
  vi.mocked(getCheckinStatus).mockResolvedValue({
    success: true,
    data: {
      ...status,
      reward_tiers: [reward, { name: 'Other', quota: 0, weight: 199 }],
    },
  })
  renderCheckin()
  expect(await screen.findByText('0.5%')).toBeInTheDocument()
  await act(async () => {
    await i18next.changeLanguage('fr')
  })
  expect(screen.getByText('0,5%')).toBeInTheDocument()
  expect(
    screen.getByRole('region', { name: 'Tirage quotidien' })
  ).toBeInTheDocument()
})

test.each([
  ['en', '0.0001'],
  ['zhCN', '0.0001'],
  ['zhTW', '0.0001'],
  ['fr', '0,0001'],
  ['ru', '0,0001'],
  ['ja', '0.0001'],
  ['vi', '0,0001'],
  ['invalid', '0.0001'],
])(
  'small positive probabilities stay visible with locale %s',
  (language, expected) => {
    expect(formatCheckinProbability(1, 1000000, toIntlLocale(language))).toBe(
      expected
    )
  }
)
