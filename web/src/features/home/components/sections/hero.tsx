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
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Trans, useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

import { ProtocolWorkbench } from '../protocol-workbench'
import { ProviderMarquee } from '../provider-marquee'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const reduceMotion = useReducedMotion()
  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://docs.newapi.pro'
  const endpoint = `${window.location.origin}/v1`
  const version = status?.version

  return (
    <section className='text-foreground relative isolate flex min-h-[100svh] flex-col overflow-hidden'>
      <div className='mx-auto flex w-full max-w-[1120px] flex-1 items-center px-5 pt-24 pb-12 sm:px-8'>
        <div className='grid w-full items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-20'>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className='relative'
          >
            <a
              href={docsUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='group text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors'
            >
              {t('Read the docs')}
              {version && (
                <span className='text-muted-foreground/60'>v{version}</span>
              )}
              <ArrowUpRight
                aria-hidden='true'
                className='size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
              />
            </a>
            <h1 className='mt-6 text-[clamp(2.25rem,3.6vw,3.25rem)] leading-[1.12] font-semibold tracking-[-0.04em] whitespace-nowrap'>
              <Trans
                i18nKey='Your models. One workspace.'
                components={{ br: <br /> }}
              />
            </h1>
            <p className='text-muted-foreground mt-5 max-w-md text-[14.5px] leading-[1.8]'>
              {t(
                'Connect providers, manage keys, and keep track of every request.'
              )}
            </p>
            <div className='mt-7 flex flex-wrap items-center gap-3'>
              <Button
                size='lg'
                className='bg-success text-success-foreground hover:bg-success/90 h-10 rounded-lg px-4 text-[13px] shadow-none'
                render={
                  <Link
                    to={props.isAuthenticated ? '/dashboard' : '/sign-up'}
                  />
                }
              >
                {props.isAuthenticated
                  ? t('Go to Dashboard')
                  : t('Get Started')}
                <ArrowRight aria-hidden='true' />
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='border-line text-foreground hover:bg-surface-hover h-10 rounded-lg border bg-transparent px-4 text-[13px] shadow-none'
                render={<Link to='/pricing' />}
              >
                {t('View Pricing')}
              </Button>
            </div>
            <div className='border-line-subtle mt-9 flex items-center gap-3 border-t pt-4'>
              <span className='text-muted-foreground font-mono text-[10px] tracking-[0.12em] uppercase'>
                {t('Base URL')}
              </span>
              <code className='text-foreground min-w-0 flex-1 truncate font-mono text-[12px]'>
                {endpoint}
              </code>
              <CopyButton
                value={endpoint}
                tooltip={t('Copy to clipboard')}
                className='text-muted-foreground hover:bg-surface-hover hover:text-foreground size-7'
              />
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className='lg:pt-2'
          >
            <ProtocolWorkbench />
          </motion.div>
        </div>
      </div>
      <ProviderMarquee />
    </section>
  )
}
