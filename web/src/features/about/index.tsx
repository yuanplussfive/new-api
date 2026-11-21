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
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { ScientificBackdrop } from '@/components/scientific-backdrop'

import { AboutCta } from './components/about-cta'
import { AboutHero } from './components/about-hero'
import { AboutNotes } from './components/about-notes'
import { AboutPillars } from './components/about-pillars'
import { AboutSenera } from './components/about-senera'

/**
 * Fixed about page for the senera runtime. Copy lives in code so every
 * deployment documents the same runtime behaviour without an editable
 * HTML/iframe setting.
 */
export function About() {
  return (
    <PublicLayout showMainContainer={false} headerOverlay>
      <div className='relative isolate'>
        <ScientificBackdrop variant='page' />
        <AboutHero />
        <AboutSenera />
        <AboutPillars />
        <AboutNotes />
        <AboutCta />
      </div>
      <Footer />
    </PublicLayout>
  )
}
