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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyToClipboard } from '@/lib/copy-to-clipboard'

const profileStyles = readFileSync(
  resolve(process.cwd(), 'src/styles/profile-settings.css'),
  'utf8'
)

import { ProfileHeader } from '../components/profile-header'
import type { UserProfile } from '../types'

vi.mock('@/lib/copy-to-clipboard', () => ({ copyToClipboard: vi.fn() }))

const longName =
  'Alexandra-Avery-International-Engineering-Operations-Administrator'

const profile: UserProfile = {
  id: 42,
  username: 'alexandra-with-a-very-long-account-name',
  display_name: longName,
  email: 'alexandra.operations@international-engineering.example',
  role: 10,
  group: 'default',
  quota: 1000000,
  used_quota: 500000,
  request_count: 1200,
  status: 1,
  aff_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  created_time: 0,
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('profile identity and responsive layout', () => {
  it('keeps a long unbroken identity readable and copies the real user ID', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true)
    const user = userEvent.setup()
    render(<ProfileHeader profile={profile} loading={false} />)

    const heading = screen.getByRole('heading', { level: 1, name: longName })
    expect(heading).toHaveClass('profile-identity-name')
    expect(heading).toHaveAttribute('title', longName)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('User ID 42')).toBeInTheDocument()
    expect(
      screen.getByText('@alexandra-with-a-very-long-account-name')
    ).toHaveClass('profile-identity-contact')

    const copy = screen.getByRole('button', {
      name: 'Copy to clipboard: User ID',
    })
    await user.click(copy)
    expect(copyToClipboard).toHaveBeenCalledWith('42')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeEnabled()
  })

  it('scopes wrapping and narrow-screen fallbacks to the profile surface', () => {
    expect(profileStyles).toMatch(
      /\.profile-settings \.profile-identity-name\s*\{[^}]*overflow-wrap:\s*anywhere/s
    )
    expect(profileStyles).toMatch(
      /\.profile-settings \.profile-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s
    )
    expect(profileStyles).toMatch(
      /@media \(max-width: 39\.99rem\)[\s\S]*\.profile-settings \.profile-checkin-heading\s*\{[^}]*flex-wrap:\s*wrap/
    )
  })

  it('keeps desktop fields aligned while the base layout stacks on mobile', () => {
    expect(profileStyles).toMatch(
      /\.profile-settings \.profile-field\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s
    )
    expect(profileStyles).toMatch(
      /@media \(min-width: 40rem\)[\s\S]*grid-template-columns:\s*var\(--profile-label-width\) minmax\(0, 1fr\)/
    )
    expect(profileStyles).toMatch(
      /\.profile-settings \.profile-field-control\s*\{[^}]*max-width:\s*var\(--profile-control-width\)/s
    )
  })
})
