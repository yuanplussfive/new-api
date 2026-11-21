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
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { OverviewPanels } from './overview-panels'
import { RequestPreview } from './overview-request-preview'
import { OverviewServiceStatus } from './overview-service-status'
import { OverviewSetupGuide } from './overview-setup-guide'
import { SummaryCards } from './summary-cards'
import { useOverviewSetup } from './use-overview-setup'

const SETUP_GUIDE_VISIBILITY_STORAGE_KEY =
  'dashboard_overview_setup_guide_expanded'

function getSavedSetupGuideExpanded(): boolean | null {
  if (typeof window === 'undefined') return null
  const saved = window.localStorage.getItem(SETUP_GUIDE_VISIBILITY_STORAGE_KEY)
  if (saved === 'expanded') return true
  if (saved === 'collapsed') return false
  return null
}

function saveSetupGuideExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    SETUP_GUIDE_VISIBILITY_STORAGE_KEY,
    expanded ? 'expanded' : 'collapsed'
  )
}

export function OverviewDashboard() {
  const { t } = useTranslation()
  const guideId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const data = useOverviewSetup()
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(() =>
    getSavedSetupGuideExpanded()
  )
  const setupComplete = data.startSteps.every((step) => step.completed)
  const setupStatusReady = data.apiKeysQuery.isFetched && Boolean(data.user)
  const expanded = manualExpanded ?? (setupStatusReady && !setupComplete)

  const toggleGuide = () => {
    const nextExpanded = !expanded
    setManualExpanded(nextExpanded)
    saveSetupGuideExpanded(nextExpanded)
    if (!nextExpanded && setupComplete) toggleRef.current?.focus()
  }

  return (
    <SectionPageLayout flushContent>
      <SectionPageLayout.Title>{t('Overview')}</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        {t('A focused home for keys, balance, routing, and service health.')}
      </SectionPageLayout.Description>
      <SectionPageLayout.Actions>
        {setupStatusReady && setupComplete && (
          <Button
            ref={toggleRef}
            variant='outline'
            size='sm'
            aria-expanded={expanded}
            aria-controls={guideId}
            onClick={toggleGuide}
          >
            {t('Setup guide')}
          </Button>
        )}
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='mx-auto w-full max-w-[1680px]'>
          <div
            data-dashboard-surface=''
            className='border-line bg-card overflow-hidden border-y'
          >
            <SummaryCards actions={data.visibleQuickActions} />
            {!expanded && (
              <div
                className={cn(!setupComplete && 'border-t border-line-subtle')}
              >
                <OverviewSetupGuide
                  id={guideId}
                  expanded={expanded}
                  complete={setupComplete}
                  steps={data.startSteps}
                  onToggle={toggleGuide}
                />
              </div>
            )}
            <div
              className={cn(
                '-mr-px grid border-t border-line-subtle',
                expanded ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
              )}
            >
              {expanded && (
                <div className='border-line-subtle bg-card min-w-0 border-r'>
                  <OverviewSetupGuide
                    id={guideId}
                    expanded={expanded}
                    complete={setupComplete}
                    steps={data.startSteps}
                    onToggle={toggleGuide}
                  />
                </div>
              )}
              <div className='border-line-subtle bg-card min-w-0 border-r'>
                <RequestPreview example={data.requestExample} />
              </div>
              <div className='border-line-subtle bg-card min-w-0 border-r'>
                <OverviewServiceStatus signals={data.heroSignals} />
              </div>
            </div>
            <OverviewPanels isAdmin={data.isAdmin} />
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
