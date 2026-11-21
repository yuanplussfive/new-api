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
/**
 * Get message content styles based on role
 * Encapsulates styling logic for user and assistant messages
 */
export function getMessageContentStyles() {
  return [
    // Assistant reads as one document column: no card, reference line height.
    'group-[.is-assistant]:w-full',
    'group-[.is-assistant]:bg-transparent',
    'group-[.is-assistant]:p-0',
    'group-[.is-assistant]:pb-1.5',
    'group-[.is-assistant]:text-foreground',
    'group-[.is-assistant]:[font-family:var(--font-body)]',

    // User bubble: 22px radius, 10/16 padding, blue-tinted fill, right aligned.
    'group-[.is-user]:w-fit',
    'group-[.is-user]:max-w-[calc(100%-88px)]',
    'group-[.is-user]:rounded-[22px]',
    'group-[.is-user]:bg-[var(--chat-user-bubble)]',
    'group-[.is-user]:px-4',
    'group-[.is-user]:py-2.5',
    'group-[.is-user]:text-foreground',
    'group-[.is-user]:shadow-none',

    // Shared reading rhythm
    'text-[16px]',
    'leading-6',
    'break-words',
    'whitespace-pre-wrap',
  ].join(' ')
}
