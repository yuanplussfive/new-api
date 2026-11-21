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
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { SidebarModulesCard } from '../components/sidebar-modules-card'

const sidebarAdminConfig = JSON.stringify({
  chat: { enabled: true, playground: true, chat: true },
  console: {
    enabled: true,
    detail: true,
    token: true,
    log: true,
    audit: true,
    midjourney: true,
    task: true,
  },
  personal: {
    enabled: true,
    topup: true,
    personal: true,
    security: true,
  },
})

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { SidebarModulesAdmin: sidebarAdminConfig },
  }),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
})

function mockSelfWithoutModules() {
  vi.mocked(api.get).mockResolvedValue({
    data: { success: true, data: { sidebar_modules: null } },
  } as never)
}

describe('sidebar module sections', () => {
  it('starts collapsed so only section rows are listed', () => {
    mockSelfWithoutModules()
    render(<SidebarModulesCard />)

    expect(screen.getByRole('button', { name: /Chat Area/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.queryByText('Chat plaza')).not.toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(3)
  })

  it('reveals module switches when the section row is expanded', async () => {
    mockSelfWithoutModules()
    const user = userEvent.setup()
    render(<SidebarModulesCard />)

    const section = screen.getByRole('button', { name: /Chat Area/ })
    await user.click(section)

    expect(section).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Chat plaza')).toBeVisible()
    expect(screen.getAllByRole('switch')).toHaveLength(5)
  })
})
