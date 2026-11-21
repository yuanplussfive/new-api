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
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BundledLanguage, ThemedToken } from 'shiki'

import { CopyButton } from '@/components/copy-button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/context/theme-provider'
import { getLobeIcon } from '@/lib/lobe-icon'

type AuthKind = 'bearer' | 'anthropic' | 'google'

const PROTOCOLS = [
  {
    id: 'openai-chat',
    label: 'OpenAI Chat',
    shortLabel: 'Chat',
    icon: 'OpenAI',
    path: '/v1/chat/completions',
    auth: 'bearer' as AuthKind,
    json: `{
  "model": "gpt-4.1",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "stream": true
}`,
    object: `{
  model: 'gpt-4.1',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
}`,
  },
  {
    id: 'claude',
    label: 'Claude',
    shortLabel: 'Claude',
    icon: 'Claude.Color',
    path: '/v1/messages',
    auth: 'anthropic' as AuthKind,
    json: `{
  "model": "claude-sonnet-4",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}`,
    object: `{
  model: 'claude-sonnet-4',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
}`,
  },
  {
    id: 'openai-responses',
    label: 'OpenAI Responses',
    shortLabel: 'Responses',
    icon: 'OpenAI',
    path: '/v1/responses',
    auth: 'bearer' as AuthKind,
    json: `{
  "model": "gpt-4.1",
  "input": "Hello",
  "stream": true
}`,
    object: `{
  model: 'gpt-4.1',
  input: 'Hello',
  stream: true,
}`,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    shortLabel: 'Gemini',
    icon: 'Gemini.Color',
    path: '/v1beta/models/gemini-2.5-flash:generateContent',
    auth: 'google' as AuthKind,
    json: `{
  "contents": [
    { "role": "user", "parts": [{ "text": "Hello" }] }
  ]
}`,
    object: `{
  contents: [
    { role: 'user', parts: [{ text: 'Hello' }] },
  ],
}`,
  },
] as const

const LANGUAGES = [
  { id: 'go', label: 'Go' },
  { id: 'node', label: 'Node.js' },
  { id: 'python', label: 'Python' },
  { id: 'rust', label: 'Rust' },
] as const

type ProtocolId = (typeof PROTOCOLS)[number]['id']
type LanguageId = (typeof LANGUAGES)[number]['id']

const SHIKI_LANG: Record<LanguageId, BundledLanguage> = {
  go: 'go',
  node: 'javascript',
  python: 'python',
  rust: 'rust',
}

type Header = { name: string; prefix: string }

function authHeaders(auth: AuthKind): Header[] {
  if (auth === 'anthropic') {
    return [
      { name: 'x-api-key', prefix: '' },
      { name: 'anthropic-version', prefix: '2023-06-01' },
    ]
  }
  if (auth === 'google') {
    return [{ name: 'x-goog-api-key', prefix: '' }]
  }
  return [{ name: 'Authorization', prefix: 'Bearer ' }]
}

const indent = (text: string, pad: string) =>
  text
    .split('\n')
    .map((line, index) => (index === 0 ? line : pad + line))
    .join('\n')

function buildSnippet(
  language: LanguageId,
  protocol: (typeof PROTOCOLS)[number],
  base: string
): string {
  const url = `${base}${protocol.path}`
  const headers = authHeaders(protocol.auth)

  if (language === 'go') {
    const headerLines = headers.map(({ name, prefix }) => {
      if (prefix === '') {
        return `req.Header.Set("${name}", key)`
      }
      return `req.Header.Set("${name}", "${prefix}"+key)`
    })
    return [
      `body := \`${protocol.json}\``,
      '',
      'req, _ := http.NewRequest("POST",',
      `  "${url}",`,
      '  strings.NewReader(body))',
      ...headerLines,
      'req.Header.Set("Content-Type", "application/json")',
      'resp, err := http.DefaultClient.Do(req)',
    ].join('\n')
  }

  if (language === 'node') {
    const headerLines = headers.map(({ name, prefix }) => {
      if (prefix === '') {
        return `    "${name}": key,`
      }
      return '    Authorization: `Bearer ${key}`,'
    })
    return [
      `const res = await fetch("${url}", {`,
      "  method: 'POST',",
      '  headers: {',
      ...headerLines,
      '    "Content-Type": "application/json",',
      '  },',
      `  body: JSON.stringify(${indent(protocol.object, '  ')}),`,
      '})',
    ].join('\n')
  }

  if (language === 'python') {
    const headerLines = headers.map(({ name, prefix }) => {
      if (prefix === '') {
        return `    "${name}": key,`
      }
      return `    "${name}": f"${prefix}{key}",`
    })
    return [
      `resp = httpx.post("${url}",`,
      '  headers={',
      ...headerLines,
      '    "Content-Type": "application/json",',
      '  },',
      `  json=${indent(protocol.object.replaceAll("'", '"'), '  ')},`,
      ')',
    ].join('\n')
  }

  const rustHeaders = headers.map(({ name, prefix }) => {
    if (name === 'Authorization') {
      return '    .bearer_auth(key)'
    }
    if (prefix === '') {
      return `    .header("${name}", key)`
    }
    return `    .header("${name}", "${prefix}")`
  })
  return [
    'let res = client',
    `    .post("${url}")`,
    ...rustHeaders,
    '    .header("Content-Type", "application/json")',
    `    .body(r#"${protocol.json}"#)`,
    '    .send()',
    '    .await?;',
  ].join('\n')
}

/**
 * Native protocol samples: the same request in four languages over plain HTTPS,
 * with no provider SDK in between.
 */
export function ProtocolWorkbench() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [protocolId, setProtocolId] = useState<ProtocolId>('openai-chat')
  const [language, setLanguage] = useState<LanguageId>('node')
  const [lines, setLines] = useState<ThemedToken[][]>([])
  const { resolvedTheme } = useTheme()
  const themeName = resolvedTheme === 'dark' ? 'github-dark' : 'github-light'
  const protocol =
    PROTOCOLS.find((item) => item.id === protocolId) ?? PROTOCOLS[0]
  const base = typeof window === 'undefined' ? '' : window.location.origin
  const code = buildSnippet(language, protocol, base)

  useEffect(() => {
    let cancelled = false

    const highlight = async () => {
      try {
        const { codeToTokens } = await import('shiki')
        const result = await codeToTokens(code, {
          lang: SHIKI_LANG[language],
          theme: themeName,
        })
        if (!cancelled) setLines(result.tokens)
      } catch {
        if (!cancelled) setLines([])
      }
    }

    void highlight()
    return () => {
      cancelled = true
    }
  }, [code, language, themeName])

  return (
    <div className='relative' data-testid='protocol-workbench'>
      <Tabs
        value={protocolId}
        onValueChange={(value) => setProtocolId(value as ProtocolId)}
      >
        <TabsList className='grid h-auto w-full grid-cols-2 gap-x-6 rounded-none border-0 bg-transparent p-0 sm:flex sm:w-auto'>
          {PROTOCOLS.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              aria-label={item.label}
              className='text-content-secondary hover:text-content-strong data-active:border-b-content-strong data-active:text-content-strong dark:data-active:text-content-strong flex h-9 items-center justify-start gap-2 rounded-none border-0 border-b border-transparent px-0 text-[12px] transition-colors data-active:bg-transparent data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent'
            >
              <span className='flex size-4 items-center'>
                {getLobeIcon(item.icon, 16)}
              </span>
              <span className='sm:hidden'>{item.shortLabel}</span>
              <span className='hidden sm:inline'>{item.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className='mt-5 flex flex-wrap items-center gap-x-3 gap-y-2'>
          <div className='flex items-center gap-3'>
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                type='button'
                aria-pressed={language === item.id}
                onClick={() => setLanguage(item.id)}
                className={
                  language === item.id
                    ? 'text-foreground font-mono text-[11px]'
                    : 'text-content-primary hover:text-content-strong font-mono text-[11px] transition-colors'
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          <span aria-hidden='true' className='bg-line h-3 w-px' />
          <code className='text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px]'>
            POST {protocol.path}
          </code>
          <CopyButton
            value={code}
            aria-label={t('Copy request example')}
            className='text-muted-foreground hover:bg-surface-hover hover:text-foreground size-7'
          />
        </div>

        <div className='relative mt-4 min-h-[230px] overflow-hidden'>
          <AnimatePresence mode='wait' initial={false}>
            <motion.pre
              key={`${protocol.id}-${language}`}
              initial={reduceMotion ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              className='text-foreground overflow-x-auto font-mono text-[11.5px] leading-[1.9]'
            >
              <code data-testid='protocol-code'>
                {lines.length > 0
                  ? lines.map((line) => (
                      <span key={line[0]?.offset ?? 0} className='block'>
                        {line.map((token) => (
                          <span
                            key={token.offset}
                            style={{
                              color: token.color,
                              fontStyle:
                                (token.fontStyle ?? 0) & 1
                                  ? 'italic'
                                  : undefined,
                              fontWeight:
                                (token.fontStyle ?? 0) & 2 ? 600 : undefined,
                            }}
                          >
                            {token.content}
                          </span>
                        ))}
                      </span>
                    ))
                  : code}
              </code>
            </motion.pre>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  )
}
