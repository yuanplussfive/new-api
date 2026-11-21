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
import { useTranslation } from 'react-i18next'

import { PublicSection } from '@/components/public-section'
import { Button } from '@/components/ui/button'

const SENERA_REPOSITORY_URL = 'https://github.com/yuanplussfive/senera'

export function CTA(props: { isAuthenticated?: boolean }) {
  const { t } = useTranslation()

  return (
    <PublicSection bordered>
      <div className='flex flex-col items-start gap-5'>
        <h2 className='text-foreground max-w-xl text-[clamp(1.6rem,2.6vw,2.15rem)] leading-[1.2] font-semibold tracking-[-0.03em] text-balance'>
          {t('Run senera on your own machine.')}
        </h2>
        <p className='text-muted-foreground max-w-lg text-[14px] leading-[1.75]'>
          {t(
            'A locally deployed agent runtime. The model produces intent; the host runtime handles authorization, execution and evidence.'
          )}
        </p>
        <div className='flex flex-wrap items-center gap-5'>
          {!props.isAuthenticated && (
            <Button
              size='lg'
              className='bg-success text-success-foreground hover:bg-success/90 h-10 rounded-lg px-4 shadow-none'
              render={<Link to='/sign-up' />}
            >
              {t('Get Started')}
              <ArrowRight aria-hidden='true' />
            </Button>
          )}
          <a
            href={SENERA_REPOSITORY_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[12.5px] transition-colors'
          >
            {t('View the senera repository')}
            <ArrowUpRight aria-hidden='true' className='size-3' />
          </a>
        </div>
      </div>
    </PublicSection>
  )
}
