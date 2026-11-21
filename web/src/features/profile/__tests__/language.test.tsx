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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { LanguagePreferencesCard } from '../components/language-preferences-card'
import type { UserProfile } from '../types'

const profile: UserProfile = {
  id: 1,
  username: 'alice',
  display_name: 'Alice',
  role: 1,
  group: 'default',
  quota: 0,
  used_quota: 0,
  request_count: 0,
  status: 1,
  aff_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  created_time: 0,
  setting: JSON.stringify({ language: 'en' }),
}

beforeEach(async () => {
  await i18next.changeLanguage('en')
})

afterEach(async () => {
  await i18next.changeLanguage('en')
})

async function chooseFrench(user: ReturnType<typeof userEvent.setup>) {
  const combobox = screen.getByRole('combobox', {
    name: 'Interface Language',
  })
  await user.click(combobox)
  await user.click(await screen.findByRole('option', { name: 'Français' }))
  return combobox
}

describe('language preference editing', () => {
  it('changing the labelled combobox saves the selected language and refreshes the profile', async () => {
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } })
    const onProfileUpdate = vi.fn()
    const user = userEvent.setup()
    render(
      <LanguagePreferencesCard
        profile={profile}
        onProfileUpdate={onProfileUpdate}
      />
    )

    const combobox = await chooseFrench(user)

    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalledOnce())
    expect(put).toHaveBeenCalledWith('/api/user/self', { language: 'fr' })
    expect(i18next.language).toBe('fr')
    expect(combobox).toHaveValue('Français')
  })

  it('a failed language save restores both the visible selection and interface language', async () => {
    vi.spyOn(api, 'put').mockRejectedValue(new Error('offline'))
    const onProfileUpdate = vi.fn()
    const user = userEvent.setup()
    render(
      <LanguagePreferencesCard
        profile={profile}
        onProfileUpdate={onProfileUpdate}
      />
    )

    const combobox = await chooseFrench(user)

    await waitFor(() => expect(combobox).toHaveValue('English'))
    expect(i18next.language).toBe('en')
    expect(onProfileUpdate).not.toHaveBeenCalled()
  })
})
