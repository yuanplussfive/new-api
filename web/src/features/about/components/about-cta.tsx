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
import { Button } from '@/components/ui/button'

import { SENERA_REPOSITORY_URL } from '../constants'

export function AboutCta() {
  const { t } = useTranslation()

  return (
    <PublicSection bordered>
      <div className='flex flex-col items-start gap-5'>
        <h2 className='text-foreground max-w-xl text-[clamp(1.6rem,2.6vw,2.15rem)] leading-[1.2] font-semibold tracking-[-0.03em] text-balance'>
          {t('Run it on your own machine.')}
        </h2>
        <p className='text-muted-foreground max-w-lg text-[14px] leading-[1.75]'>
          {t(
            'The desktop installer, the Docker image and the source tree share one runtime kernel.'
          )}
        </p>
        <Button
          size='lg'
          className='bg-success text-success-foreground hover:bg-success/90 h-10 rounded-lg px-4 shadow-none'
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
    </PublicSection>
  )
}
