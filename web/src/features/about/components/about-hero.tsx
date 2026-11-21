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
import { ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { SENERA_REPOSITORY_URL } from '../constants'

export function AboutHero() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()

  const facts = [
    { label: t('Project'), value: 'senera' },
    { label: t('License'), value: 'Apache-2.0' },
    { label: t('Maintainer'), value: 'yuanplussfive' },
  ]

  return (
    <section className='text-foreground relative isolate overflow-hidden'>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.55 }}
        className='relative mx-auto max-w-[1120px] px-5 pt-20 pb-12 sm:px-8 lg:pt-28 lg:pb-16'
      >
        <span className='text-muted-foreground inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase'>
          <span aria-hidden='true' className='bg-success size-1.5' />
          {t('About')}
        </span>

        <h1 className='mt-8 text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.98] font-semibold tracking-[-0.035em] lowercase'>
          senera
        </h1>

        <p className='text-muted-foreground mt-6 max-w-xl text-[15px] leading-[1.7] text-pretty'>
          {t(
            'A locally deployed agent runtime. The model produces intent; the host runtime handles authorization, execution and evidence.'
          )}
        </p>

        <a
          href={SENERA_REPOSITORY_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='group border-success/60 text-success hover:border-success hover:text-success/80 mt-8 inline-flex items-center gap-2 border-b pb-0.5 text-[13px] transition-colors'
        >
          github.com/yuanplussfive/senera
          <ArrowUpRight
            aria-hidden='true'
            className='size-3.5 transition-transform group-hover:-translate-y-0.5'
          />
        </a>

        <dl className='mt-12 grid gap-x-10 sm:grid-cols-3'>
          {facts.map((fact) => (
            <div
              key={fact.label}
              className='border-line-subtle flex items-baseline justify-between gap-4 border-t py-3'
            >
              <dt className='text-muted-foreground font-mono text-[10.5px] tracking-[0.12em] uppercase'>
                {fact.label}
              </dt>
              <dd className='text-foreground text-[13px]'>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  )
}
