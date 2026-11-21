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
import { expect, it, vi } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import { PlaygroundInput } from '../playground-input'

it('submits an image without prompt text when Enter is pressed', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  const url = 'data:image/png;base64,AAAA'
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: () => url,
      revokeObjectURL: () => undefined,
    })
  )

  try {
    render(
      <PlaygroundInput
        config={DEFAULT_CONFIG}
        groups={[{ label: 'Default', value: 'default', ratio: 1 }]}
        groupValue='default'
        models={[{ label: 'Test model', value: 'test-model' }]}
        modelValue='test-model'
        onConfigChange={() => undefined}
        onGroupChange={() => undefined}
        onModelChange={() => undefined}
        onParameterEnabledChange={() => undefined}
        onThinkingOverrideChange={() => undefined}
        thinkingOverrides={{}}
        onSubmit={onSubmit}
        parameterEnabled={DEFAULT_PARAMETER_ENABLED}
      />
    )
    await user.upload(
      screen.getByLabelText('Upload files'),
      new File(['image'], 'diagram.png', { type: 'image/png' })
    )
    await user.click(screen.getByRole('textbox'))
    await user.keyboard('{Enter}')

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith('', [
      { id: url, mediaType: 'image/png', name: 'diagram.png', url },
    ])
  } finally {
    vi.unstubAllGlobals()
  }
})
