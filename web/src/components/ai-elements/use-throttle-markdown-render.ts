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
import { useEffect, useRef, useState } from 'react'

/**
 * Same pacing strategy as DeepSeek chat-demo: after each committed markdown
 * render, wait for roughly the render cost before accepting another stream
 * update, capped at two seconds. This prevents long reasoning streams from
 * repeatedly reparsing and rerendering the whole document on every token.
 */
const MAX_WAIT_MS = 2000
const RENDER_COST_FACTOR = 2

export function useThrottleMarkdownRender(
  content: string,
  enabled: boolean
): string {
  const startRef = useRef(performance.now())
  const updatableAtRef = useRef(0)
  const [output, setOutput] = useState(content)

  useEffect(() => {
    const now = performance.now()
    updatableAtRef.current =
      now + Math.min(MAX_WAIT_MS, (now - startRef.current) * RENDER_COST_FACTOR)
  }, [output])

  useEffect(() => {
    if (!enabled) return
    const update = () => {
      startRef.current = performance.now()
      setOutput(content)
    }
    const delay = updatableAtRef.current - performance.now()
    if (delay <= 0) {
      update()
      return
    }
    const timer = setTimeout(update, delay)
    return () => clearTimeout(timer)
  }, [content, enabled])

  return enabled ? output : content
}
