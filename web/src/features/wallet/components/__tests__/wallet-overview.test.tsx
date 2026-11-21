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
import { describe, expect, it } from 'vitest'

import type { UserWalletData } from '../../types'
import { PhysicalWalletCard } from '../physical-wallet-card'

const user: UserWalletData = {
  id: 16,
  username: 'qa9',
  quota: 5000000,
  used_quota: 0,
  request_count: 18,
  aff_quota: 500000,
  aff_history_quota: 2400000,
  aff_count: 7,
  group: 'default',
}

describe('wallet balance card', () => {
  it('flips without adding an action label to the card face', async () => {
    const userEventSetup = userEvent.setup()
    render(<PhysicalWalletCard user={user} />)

    const card = screen.getByRole('button', {
      name: 'Flip the card to see the account overview',
    })
    expect(card).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Flip')).not.toBeInTheDocument()
    expect(screen.getAllByText('16').length).toBeGreaterThan(0)
    expect(screen.getAllByText('qa9').length).toBeGreaterThan(0)

    await userEventSetup.click(card)
    expect(card).toHaveAttribute('aria-pressed', 'true')
  })

  it('flips with the keyboard from the card hit area', async () => {
    const userEventSetup = userEvent.setup()
    render(<PhysicalWalletCard user={user} />)

    const card = screen.getByRole('button', {
      name: 'Flip the card to see the account overview',
    })
    card.focus()
    await userEventSetup.keyboard('{Enter}')
    expect(card).toHaveAttribute('aria-pressed', 'true')
  })
})
