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

type PlaygroundEmptyStateProps = {
  onSelectPrompt: (prompt: string) => void
}

/**
 * New-chat welcome screen, matching the reference demo: one greeting line,
 * with the composer sitting directly underneath it.
 */
export function PlaygroundEmptyState(_props: PlaygroundEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className='flex w-full flex-col items-center justify-center'>
      <h2 className='text-foreground mb-[21px] text-center text-[24px] leading-8 font-semibold text-balance max-[439px]:text-[20px] max-[439px]:leading-7 max-[439px]:font-medium'>
        {t('How can I help you?')}
      </h2>
    </div>
  )
}
