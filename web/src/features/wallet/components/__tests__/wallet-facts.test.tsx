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
import { describe, expect, it, vi } from 'vitest'

import type { UserWalletData } from '../../types'
import { WalletFacts } from '../wallet-facts'

const user: UserWalletData = {
  id: 16,
  username: 'qa9',
  quota: 0,
  used_quota: 0,
  request_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  aff_count: 0,
  group: 'default',
}

function renderFacts(
  overrides: Partial<Parameters<typeof WalletFacts>[0]> = {}
) {
  const props = {
    user,
    onRefresh: vi.fn(),
    onOpenHistory: vi.fn(),
    onOpenTransfer: vi.fn(),
    ...overrides,
  }
  render(<WalletFacts {...props} />)
  return props
}

describe('wallet facts rail', () => {
  it('shows account identity as label/value rows', () => {
    renderFacts()

    expect(screen.getByText('User ID')).toBeVisible()
    expect(screen.getByText('16')).toBeVisible()
    expect(screen.getByText('qa9')).toBeVisible()
    expect(screen.getByText('default')).toBeVisible()
  })

  it('routes quick actions to their handlers', async () => {
    const userEventSetup = userEvent.setup()
    const props = renderFacts()

    await userEventSetup.click(
      screen.getByRole('button', { name: 'Billing History' })
    )
    await userEventSetup.click(
      screen.getByRole('button', { name: 'Refresh balance' })
    )

    expect(props.onOpenHistory).toHaveBeenCalledTimes(1)
    expect(props.onRefresh).toHaveBeenCalledTimes(1)
  })

  it('disables the transfer action while no reward is pending', () => {
    renderFacts()

    expect(
      screen.getByRole('button', { name: 'Transfer to Balance' })
    ).toBeDisabled()
  })
})
