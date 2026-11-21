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

export function Features() {
  const { t } = useTranslation()
  const features = [
    {
      title: t('API Keys'),
      description: t('Create a key for your app or service'),
    },
    {
      title: t('Channels'),
      description: t('Configure upstream providers and routing.'),
    },
    {
      title: t('Usage Logs'),
      description: t('Inspect requests, errors, and billing details'),
    },
    {
      title: t('Transparent Billing'),
      description: t('Pay-as-you-go with real-time usage monitoring'),
    },
  ]

  return (
    <PublicSection bordered>
      <div className='grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-24'>
        <SectionHeading
          title={t('Built around your workflow')}
          description={t(
            'Four surfaces that cover the whole request lifecycle.'
          )}
        />
        <dl className='divide-line-subtle divide-y'>
          {features.map((feature) => (
            <div
              key={feature.title}
              className='grid gap-1.5 py-4 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6'
            >
              <dt className='text-content-strong text-[14px] font-medium'>
                {feature.title}
              </dt>
              <dd className='text-content-secondary text-[14px] leading-[1.75]'>
                {feature.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </PublicSection>
  )
}
