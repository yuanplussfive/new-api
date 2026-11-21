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
import { ERROR_MESSAGES } from '../../constants'

export interface PlaygroundErrorDetails {
  message: string
  code?: string
}

function parseErrorBody(
  body: string | undefined
): PlaygroundErrorDetails | null {
  if (!body) return null
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; code?: string }
      message?: string
      code?: string
    }
    const message = parsed.error?.message || parsed.message
    if (!message) return null
    return { message, code: parsed.error?.code || parsed.code }
  } catch {
    return null
  }
}

/**
 * Normalize AI SDK and plain errors without importing the SDK into callers.
 * AI SDK's APICallError exposes its response body, which is where the gateway
 * puts the human-readable message.
 */
export function getPlaygroundErrorDetails(
  error: unknown
): PlaygroundErrorDetails {
  const candidate = error as {
    responseBody?: string
    message?: string
  }
  const parsed = parseErrorBody(candidate?.responseBody)
  if (parsed) return parsed

  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: ERROR_MESSAGES.API_REQUEST_ERROR }
}
