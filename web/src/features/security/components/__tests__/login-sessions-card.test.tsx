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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLoginSessions } from '@/features/profile/api'
import type { LoginSession } from '@/stores/auth-store'

import { LoginSessionsCard } from '../login-sessions-card'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/profile/api', () => ({
  getLoginSessions: vi.fn(),
  revokeLoginSession: vi.fn(),
  revokeOtherLoginSessions: vi.fn(),
}))

function buildSessions(count: number): LoginSession[] {
  return Array.from({ length: count }, (_, index) => ({
    sid: `sid-${index}`,
    current: index === 0,
    login_method: 'password',
    ip: '127.0.0.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
    created_at: 1760000000,
    last_active_at: 1760000000,
    expires_at: 1760086400,
  }))
}

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <LoginSessionsCard />
    </QueryClientProvider>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('login session list', () => {
  it('shows five sessions and expands the rest on demand', async () => {
    vi.mocked(getLoginSessions).mockResolvedValue({
      success: true,
      data: buildSessions(8),
    } as never)
    const user = userEvent.setup()
    renderCard()

    expect(
      await screen.findAllByRole('button', { name: 'Revoke' })
    ).toHaveLength(4)
    await user.click(
      screen.getByRole('button', { name: 'Show all 8 sessions' })
    )
    expect(
      await screen.findAllByRole('button', { name: 'Revoke' })
    ).toHaveLength(7)
  })

  it('keeps short session lists fully visible without a toggle', async () => {
    vi.mocked(getLoginSessions).mockResolvedValue({
      success: true,
      data: buildSessions(3),
    } as never)
    renderCard()

    expect(
      await screen.findAllByRole('button', { name: 'Revoke' })
    ).toHaveLength(2)
    expect(
      screen.queryByRole('button', { name: /Show all/ })
    ).not.toBeInTheDocument()
  })
})
