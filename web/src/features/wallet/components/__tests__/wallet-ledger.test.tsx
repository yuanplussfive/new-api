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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TopupRecord } from '../../types'
import { WalletLedger } from '../wallet-ledger'

const state = vi.hoisted(() => ({
  records: [] as TopupRecord[],
}))

vi.mock('../../hooks/use-billing-history', () => ({
  useBillingHistory: () => ({
    records: state.records,
    total: state.records.length,
    loading: false,
  }),
}))

function buildRecord(): TopupRecord {
  return {
    id: 1,
    user_id: 3,
    amount: 500000,
    money: 1,
    trade_no: 'trade-1',
    payment_method: 'stripe',
    create_time: 1760000000,
    status: 'success',
  }
}

beforeEach(() => {
  state.records = [buildRecord()]
})

describe('wallet ledger', () => {
  it('lists recent records with status and opens the full history', async () => {
    const user = userEvent.setup()
    const onViewAll = vi.fn()
    render(<WalletLedger onViewAll={onViewAll} />)

    expect(screen.getByText('Success')).toBeVisible()
    expect(screen.getAllByText(/Stripe/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'View all' }))
    expect(onViewAll).toHaveBeenCalledTimes(1)
  })

  it('shows an empty line when there are no records', () => {
    state.records = []
    render(<WalletLedger onViewAll={vi.fn()} />)

    expect(screen.getByText('No top-up records yet')).toBeVisible()
  })
})
