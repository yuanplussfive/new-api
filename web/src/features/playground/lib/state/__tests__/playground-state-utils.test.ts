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
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { saveConfig } from '../../storage/storage'
import { getInitialPlaygroundConfig } from '../playground-state-utils'

describe('initial playground config', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().auth.reset()
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'playground-user', role: 1 })
  })

  it('records the restored model under its group', () => {
    saveConfig({
      group: 'vip',
      model: 'vip-model',
      modelByGroup: { default: 'default-model' },
    })

    expect(getInitialPlaygroundConfig().modelByGroup).toEqual({
      default: 'default-model',
      vip: 'vip-model',
    })
  })
})
