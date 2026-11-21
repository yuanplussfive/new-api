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
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { usePlaygroundState } from '../use-playground-state'

describe('playground config memory', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().auth.reset()
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'playground-user', role: 1 })
  })

  it('restores the last model selected in each group', () => {
    const { result } = renderHook(() => usePlaygroundState())

    act(() => result.current.updateConfig('model', 'model-a'))
    act(() => result.current.updateConfig('group', 'vip'))
    act(() => result.current.updateConfig('model', 'model-b'))
    act(() => result.current.updateConfig('group', 'default'))
    expect(result.current.config.model).toBe('model-a')

    act(() => result.current.updateConfig('group', 'vip'))
    expect(result.current.config.model).toBe('model-b')
  })

  it('restores the wire format chosen for each model', () => {
    const { result } = renderHook(() => usePlaygroundState())

    act(() => result.current.updateConfig('model', 'model-a'))
    act(() => result.current.updateConfig('apiFormat', 'responses'))
    act(() => result.current.updateConfig('model', 'model-b'))
    act(() => result.current.updateConfig('apiFormat', 'claude'))
    expect(result.current.config.apiFormat).toBe('claude')

    act(() => result.current.updateConfig('model', 'model-a'))
    expect(result.current.config.apiFormat).toBe('responses')
  })
})
