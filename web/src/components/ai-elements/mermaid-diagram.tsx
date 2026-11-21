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
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MermaidDiagramProps {
  code: string
}

type RenderState =
  | { kind: 'loading' }
  | { kind: 'ready'; svg: string }
  | { kind: 'error' }

/**
 * Mermaid block renderer. The library is imported on demand so the chat bundle
 * only pays for it when a reply actually contains a diagram.
 */
export function MermaidDiagram(props: MermaidDiagramProps) {
  const { t } = useTranslation()
  const reactId = useId()
  const [state, setState] = useState<RenderState>({ kind: 'loading' })
  const code = props.code

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })

    void (async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: document.documentElement.classList.contains('dark')
            ? 'dark'
            : 'default',
        })
        const id = `mermaid-${reactId.replaceAll(':', '')}`
        const rendered = await mermaid.render(id, code)
        if (!cancelled) {
          setState({ kind: 'ready', svg: rendered.svg })
        }
      } catch {
        if (!cancelled) {
          setState({ kind: 'error' })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [code, reactId])

  if (state.kind === 'error') {
    return (
      <div className='border-line-subtle bg-surface-subtle my-4 rounded-[12px] border p-3'>
        <p className='text-content-muted mb-2 text-[12px]'>
          {t('Diagram could not be rendered')}
        </p>
        <pre className='text-foreground overflow-x-auto font-mono text-xs'>
          {code}
        </pre>
      </div>
    )
  }

  if (state.kind === 'loading') {
    return (
      <div
        className='border-line-subtle bg-surface-subtle my-4 h-32 animate-pulse rounded-[12px] border'
        aria-label={t('Rendering diagram')}
        role='img'
      />
    )
  }

  return (
    <div
      className='bg-surface-panel border-line-subtle my-4 overflow-x-auto rounded-[12px] border p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full'
      data-testid='mermaid-diagram'
      // Mermaid runs with securityLevel 'strict', which sanitizes labels itself.
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  )
}
