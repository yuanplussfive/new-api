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
import { Link } from '@tanstack/react-router'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { fetchTokenKey } from '@/features/keys/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { handleServerError } from '@/lib/handle-server-error'

import { buildCurlCommand } from './overview-request'
import type { RequestExample } from './overview-types'

export function RequestPreview(props: { example: RequestExample }) {
  const { t } = useTranslation()
  const [isCopying, setIsCopying] = useState(false)
  const { copyToClipboard } = useCopyToClipboard({ notify: false })
  const previewCurl = buildCurlCommand({
    endpoint: props.example.endpoint,
    apiKey: props.example.displayKey,
    model: props.example.model,
  })
  const previewLines = previewCurl.split('\n')
  const handleCopyRequest = async () => {
    if (!props.example.keyId || isCopying) return

    setIsCopying(true)
    try {
      const result = await fetchTokenKey(props.example.keyId)
      const key = result.success && result.data?.key ? result.data.key : ''
      if (!key) {
        handleServerError(result, t('Failed to copy to clipboard'))
        return
      }

      const realCurl = buildCurlCommand({
        endpoint: props.example.endpoint,
        apiKey: `sk-${key}`,
        model: props.example.model,
      })
      const copied = await copyToClipboard(realCurl)
      if (copied) {
        toast.success(t('Copied to clipboard'))
      } else {
        toast.error(t('Failed to copy to clipboard'))
      }
    } catch (error) {
      handleServerError(error, t('Failed to copy to clipboard'))
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <div
      data-dashboard-panel=''
      className='bg-card min-w-0 overflow-hidden rounded-xl border border-line'
    >
      <div className='flex items-start justify-between gap-3 px-4 py-3'>
        <div className='min-w-0'>
          <div className='text-content-strong truncate text-[12.5px] font-semibold'>
            {t('First API request')}
          </div>
          <div className='text-content-secondary mt-0.5 truncate text-[11.5px]'>
            {props.example.ready
              ? props.example.keyName
              : t('Create an API key to unlock the real request')}
          </div>
        </div>
        {props.example.ready ? (
          <Button
            variant='ghost'
            size='xs'
            disabled={isCopying}
            onClick={handleCopyRequest}
            aria-label={t('Copy ready-to-run curl')}
          >
            <Copy data-icon='inline-start' />
            {isCopying ? t('Loading') : t('Copy')}
          </Button>
        ) : (
          <Button size='sm' variant='outline' render={<Link to='/keys' />}>
            {t('Create API Key')}
          </Button>
        )}
      </div>

      <div className='px-3 pb-3'>
        <div className='bg-surface-subtle rounded-[8px] border border-line-subtle p-3 font-mono text-[11px] leading-[1.75]'>
          <div className='text-content-muted mb-2 font-sans text-[10px] font-semibold tracking-[0.08em] uppercase'>
            cURL
          </div>
          <div
            className='hover-scrollbar flex flex-col gap-0.5 overflow-x-auto pb-1'
            tabIndex={0}
            role='region'
            aria-label={t('First API request')}
          >
            {previewLines.map((line) => (
              <code
                key={line}
                className='text-content-primary break-all whitespace-pre-wrap'
                title={line}
              >
                {line}
              </code>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
