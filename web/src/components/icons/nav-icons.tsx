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
import {
  Activity01Icon,
  ClipboardIcon,
  CreditCardIcon,
  CubeIcon,
  DashboardSquare01Icon,
  File01Icon,
  FlaskConicalIcon,
  InformationCircleIcon,
  Key01Icon,
  MessageMultiple01Icon,
  Plug01Icon,
  ServerStack01Icon,
  Settings01Icon,
  Shield01Icon,
  Tag01Icon,
  Task01Icon,
  TerminalIcon,
  Ticket01Icon,
  Timer01Icon,
  UserGroupIcon,
  UserIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon']

interface NavIconProps {
  className?: string
}

/**
 * Navigation icons share one optical weight so the sidebar reads as a single
 * set: 1.6px strokes on the 24px grid, sized by CSS on the host element.
 */
function NavIcon(props: NavIconProps & { icon: HugeIconData }) {
  return (
    <HugeiconsIcon
      icon={props.icon}
      strokeWidth={1.6}
      className={props.className}
      aria-hidden='true'
    />
  )
}

export function NavPlaygroundIcon(props: NavIconProps) {
  return <NavIcon icon={FlaskConicalIcon} className={props.className} />
}

export function NavChatIcon(props: NavIconProps) {
  return <NavIcon icon={MessageMultiple01Icon} className={props.className} />
}

export function NavOverviewIcon(props: NavIconProps) {
  return <NavIcon icon={Activity01Icon} className={props.className} />
}

export function NavDashboardIcon(props: NavIconProps) {
  return <NavIcon icon={DashboardSquare01Icon} className={props.className} />
}

export function NavApiKeysIcon(props: NavIconProps) {
  return <NavIcon icon={Key01Icon} className={props.className} />
}

export function NavUsageLogsIcon(props: NavIconProps) {
  return <NavIcon icon={File01Icon} className={props.className} />
}

export function NavAuditLogsIcon(props: NavIconProps) {
  return <NavIcon icon={ClipboardIcon} className={props.className} />
}

export function NavTaskLogsIcon(props: NavIconProps) {
  return <NavIcon icon={Task01Icon} className={props.className} />
}

export function NavWalletIcon(props: NavIconProps) {
  return <NavIcon icon={Wallet01Icon} className={props.className} />
}

export function NavProfileIcon(props: NavIconProps) {
  return <NavIcon icon={UserIcon} className={props.className} />
}

export function NavSecurityIcon(props: NavIconProps) {
  return <NavIcon icon={Shield01Icon} className={props.className} />
}

export function NavChannelsIcon(props: NavIconProps) {
  return <NavIcon icon={ServerStack01Icon} className={props.className} />
}

export function NavModelsIcon(props: NavIconProps) {
  return <NavIcon icon={CubeIcon} className={props.className} />
}

export function NavUsersIcon(props: NavIconProps) {
  return <NavIcon icon={UserGroupIcon} className={props.className} />
}

export function NavRedemptionIcon(props: NavIconProps) {
  return <NavIcon icon={Ticket01Icon} className={props.className} />
}

export function NavSubscriptionsIcon(props: NavIconProps) {
  return <NavIcon icon={CreditCardIcon} className={props.className} />
}

export function NavSystemInfoIcon(props: NavIconProps) {
  return <NavIcon icon={InformationCircleIcon} className={props.className} />
}

export function NavTaskPluginsIcon(props: NavIconProps) {
  return <NavIcon icon={Plug01Icon} className={props.className} />
}

export function NavSystemSettingsIcon(props: NavIconProps) {
  return <NavIcon icon={Settings01Icon} className={props.className} />
}

export function ActionPricingIcon(props: NavIconProps) {
  return <NavIcon icon={Tag01Icon} className={props.className} />
}

export function ActionTerminalIcon(props: NavIconProps) {
  return <NavIcon icon={TerminalIcon} className={props.className} />
}

export function ActionTimerIcon(props: NavIconProps) {
  return <NavIcon icon={Timer01Icon} className={props.className} />
}
