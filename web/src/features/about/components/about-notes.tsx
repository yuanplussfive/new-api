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

import { SENERA_DOCS_URL, SENERA_ISSUES_URL } from '../constants'

export function AboutNotes() {
  const { t } = useTranslation()
  const notes = [
    t(
      'Native tool calling is not required. Models without it plan through BAML; the native path is used when the model and endpoint support it.'
    ),
    t(
      'No external embedding or rerank endpoint. Retrieval and memory run on the local CPU.'
    ),
    t(
      'No cloud sync. Configuration, sessions and Artifacts stay in .senera/ inside the chosen workspace.'
    ),
    t(
      'No mid-run switch between planning paths. Validation, approval and result write-back are shared.'
    ),
  ]

  return (
    <PublicSection bordered>
      <div className='grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-24'>
        <SectionHeading title={t('What it does not require')} />
        <div className='grid gap-8 sm:grid-cols-2 sm:gap-12'>
          <ul className='divide-line-subtle divide-y'>
            {notes.map((note) => (
              <li
                key={note}
                className='text-content-secondary py-3 text-[14px] leading-[1.75] first:pt-0 last:pb-0'
              >
                {note}
              </li>
            ))}
          </ul>
          <div className='flex flex-col gap-3'>
            <p className='text-content-secondary text-[14px] leading-[1.75]'>
              {t('Setup paths and architecture notes live in the repository.')}
            </p>
            <div className='divide-line-subtle flex flex-col divide-y'>
              {[
                { label: t('Documentation'), href: SENERA_DOCS_URL },
                { label: t('Issues and requests'), href: SENERA_ISSUES_URL },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-content-primary hover:text-content-secondary flex items-center justify-between gap-3 py-3 text-[14px] transition-colors'
                >
                  {link.label}
                  <ArrowUpRight
                    aria-hidden='true'
                    className='text-content-muted size-3.5'
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicSection>
  )
}
