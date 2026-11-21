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
import { describe, expect, it, vi } from 'vitest'

import type { Message } from '../../../types'
import { PlaygroundMessageContent } from '../playground-message-content'

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key, language: 'en' },
}))

function buildMessage(status: Message['status']): Message {
  return {
    key: 'assistant-1',
    from: 'assistant',
    versions: [{ id: 'version-1', content: 'Streaming answer' }],
    versionIndex: 0,
    status,
    createdAt: Date.now(),
  }
}

describe('assistant streaming indicator', () => {
  it('shows a caret while the answer is streaming and removes it once complete', () => {
    const { rerender } = render(
      <PlaygroundMessageContent
        actions={null}
        alignment='left'
        message={buildMessage('streaming')}
        versionContent='Streaming answer'
      />
    )

    expect(screen.getByTestId('streaming-caret')).toBeInTheDocument()

    rerender(
      <PlaygroundMessageContent
        actions={null}
        alignment='left'
        message={buildMessage('complete')}
        versionContent='Streaming answer'
      />
    )

    expect(screen.queryByTestId('streaming-caret')).toBeNull()
  })
})
