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
import type { ElementType } from 'react'

import type { IconBadgeTone } from '@/components/ui/icon-badge'

export type DashboardActionPath =
  | '/keys'
  | '/wallet'
  | '/playground'
  | '/channels'
  | '/usage-logs'
  | '/pricing'

export interface StartStep {
  title: string
  description: string
  to: DashboardActionPath
  icon: ElementType
  completed: boolean
}

export interface QuickAction {
  title: string
  description: string
  to: DashboardActionPath
  icon: ElementType
  adminOnly?: boolean
}

export interface RequestExample {
  endpoint: string
  model: string
  keyName: string
  keyId?: number
  displayKey: string
  ready: boolean
}

export interface HeroSignal {
  label: string
  value: string
  icon: ElementType
  tone: IconBadgeTone
}
