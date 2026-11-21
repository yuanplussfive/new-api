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
import { useTranslation } from 'react-i18next'

import { PublicSection } from '@/components/public-section'
import { SectionHeading } from '@/components/section-heading'
import { Button } from '@/components/ui/button'

import { SENERA_REPOSITORY_URL } from '../constants'

export function AboutSenera() {
  const { t } = useTranslation()
  const rows = [
    {
      label: t('Model'),
      value: t('Generates intent only; it does not execute tools.'),
    },
    {
      label: t('Host runtime'),
      value: t(
        'Validates arguments, applies policy, runs tools and packages evidence.'
      ),
    },
    {
      label: t('Session loop'),
      value: t(
        'Pi Coding Agent provides the session tree, multi-step tool loop and context compaction.'
      ),
    },
    {
      label: t('Repository'),
      value: 'yuanplussfive/senera',
    },
  ]

  return (
    <PublicSection bordered>
      <div className='grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-24'>
        <SectionHeading title={t('What senera is')} />
        <div className='flex flex-col gap-5'>
          <p className='text-content-secondary text-[14px] leading-[1.8]'>
            {t(
              'The model proposes actions; every step that touches the machine runs in the host runtime.'
            )}
          </p>
          <dl className='divide-line-subtle divide-y'>
            {rows.map((row) => (
              <div
                key={row.label}
                className='grid gap-1.5 py-3 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6'
              >
                <dt className='text-content-strong text-[14px] font-medium'>
                  {row.label}
                </dt>
                <dd className='text-content-secondary text-[14px] leading-[1.75]'>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <Button
              variant='outline'
              render={
                <a
                  href={SENERA_REPOSITORY_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                />
              }
            >
              {t('View the senera repository')}
              <ArrowUpRight aria-hidden='true' />
            </Button>
          </div>
        </div>
      </div>
    </PublicSection>
  )
}
