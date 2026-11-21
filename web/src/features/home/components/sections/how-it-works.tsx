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
import { useTranslation } from 'react-i18next'

import { PublicSection } from '@/components/public-section'
import { SectionHeading } from '@/components/section-heading'

export function HowItWorks() {
  const { t } = useTranslation()
  const steps = [
    {
      title: t('Configure'),
      description: t('Add upstream API keys and configure routing rules'),
    },
    {
      title: t('Connect'),
      description: t(
        'Connect through OpenAI, Claude, Gemini, and other compatible API routes'
      ),
    },
    {
      title: t('Monitor'),
      description: t(
        'Track usage, costs and performance with real-time analytics'
      ),
    },
  ]

  return (
    <PublicSection bordered>
      <div className='grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-24'>
        <SectionHeading title={t('Three steps to get started')} />
        <ol className='divide-line-subtle divide-y'>
          {steps.map((step) => (
            <li
              key={step.title}
              className='grid gap-1.5 py-4 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6'
            >
              <h3 className='text-content-strong text-[14px] font-medium'>
                {step.title}
              </h3>
              <p className='text-content-secondary text-[14px] leading-[1.75]'>
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </PublicSection>
  )
}
