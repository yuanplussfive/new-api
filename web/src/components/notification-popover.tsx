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
import type { TFunction } from 'i18next'
import { Bell, Megaphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { RichContent } from '@/components/rich-content'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAnnouncementColorClass } from '@/lib/colors'
import { formatDateTimeObject } from '@/lib/time'
import { cn } from '@/lib/utils'

interface AnnouncementItem {
  id?: number | string
  type?: string
  content?: string
  extra?: string
  publishDate?: string | Date
}

interface NotificationPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unreadCount: number
  activeTab: 'notice' | 'announcements'
  onTabChange: (tab: 'notice' | 'announcements') => void
  notice: string
  announcements: AnnouncementItem[]
  loading: boolean
  className?: string
}

function getRelativeTime(publishDate: string | Date, t: TFunction): string {
  if (!publishDate) return ''

  const pubDate = new Date(publishDate)
  if (Number.isNaN(pubDate.getTime())) {
    return typeof publishDate === 'string' ? publishDate : ''
  }

  const diffMs = Date.now() - pubDate.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffMs < 0) return formatDateTimeObject(pubDate)
  if (diffMinutes < 1) return t('Just now')
  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t('1 minute ago')
      : t('{{count}} minutes ago', { count: diffMinutes })
  }
  if (diffHours < 24) {
    return diffHours === 1
      ? t('1 hour ago')
      : t('{{count}} hours ago', { count: diffHours })
  }
  if (diffDays < 7) {
    return diffDays === 1
      ? t('1 day ago')
      : t('{{count}} days ago', { count: diffDays })
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1
      ? t('1 week ago')
      : t('{{count}} weeks ago', { count: diffWeeks })
  }
  if (diffMonths < 12) {
    return diffMonths === 1
      ? t('1 month ago')
      : t('{{count}} months ago', { count: diffMonths })
  }
  return formatDateTimeObject(pubDate)
}

function EmptyState(props: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <Empty className='min-h-48 border-0 p-4'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{props.icon}</EmptyMedia>
        <EmptyTitle>{props.title}</EmptyTitle>
        {props.description ? (
          <EmptyDescription>{props.description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  )
}

function NoticeContent(props: {
  notice: string
  loading: boolean
  t: TFunction
}) {
  if (props.loading) {
    return (
      <EmptyState
        icon={<Bell />}
        title={props.t('Loading...')}
        description={props.t('Latest platform updates and notices')}
      />
    )
  }

  if (!props.notice) {
    return (
      <EmptyState
        icon={<Bell />}
        title={props.t('No announcements at this time')}
      />
    )
  }

  return (
    <ScrollArea className='h-[min(46vh,22rem)]'>
      <div className='border-line text-content-secondary border-l-2 pl-4 text-[13px] leading-[1.8]'>
        <RichContent breaks content={props.notice} />
      </div>
    </ScrollArea>
  )
}

function AnnouncementsContent(props: {
  announcements: AnnouncementItem[]
  loading: boolean
  t: TFunction
}) {
  if (props.loading) {
    return (
      <EmptyState
        icon={<Megaphone />}
        title={props.t('Loading...')}
        description={props.t('Latest platform updates and notices')}
      />
    )
  }

  if (props.announcements.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone />}
        title={props.t('No system announcements')}
      />
    )
  }

  return (
    <ScrollArea className='h-[min(46vh,22rem)]'>
      <ul className='divide-line-subtle divide-y'>
        {props.announcements.map((item, index) => {
          const publishDate = item.publishDate
            ? new Date(item.publishDate)
            : null
          const relativeTime = publishDate
            ? getRelativeTime(publishDate, props.t)
            : ''

          return (
            <li
              key={item.id ?? `${index}-${item.content?.slice(0, 12) ?? ''}`}
              className='flex items-start gap-3 py-3 first:pt-0'
            >
              <span
                aria-hidden='true'
                className={cn(
                  'mt-1.5 inline-block size-2 shrink-0 rounded-full',
                  getAnnouncementColorClass(item.type)
                )}
              />
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <div className='text-content-primary text-[13px] leading-[1.7]'>
                  <RichContent breaks content={item.content || ''} />
                </div>
                {item.extra ? (
                  <div className='text-content-secondary text-[12px]'>
                    <RichContent breaks content={item.extra} />
                  </div>
                ) : null}
                {relativeTime ? (
                  <span className='text-content-muted text-[11.5px]'>
                    {relativeTime}
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </ScrollArea>
  )
}

/**
 * Notification centre: a centred dialog opened from the header bell. The
 * trigger keeps the unread badge; the dialog holds the notice banner and the
 * announcement timeline in one place.
 */
export function NotificationPopover(props: NotificationPopoverProps) {
  const { t } = useTranslation()

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        className={cn('relative size-9', props.className)}
        aria-label={t('Notifications')}
        onClick={() => props.onOpenChange(true)}
      >
        <Bell className='size-[1.2rem]' />
        {props.unreadCount > 0 ? (
          <Badge
            variant='destructive'
            className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-semibold tabular-nums'
          >
            {props.unreadCount > 99 ? '99+' : props.unreadCount}
          </Badge>
        ) : null}
      </Button>

      <Dialog
        open={props.open}
        onOpenChange={props.onOpenChange}
        title={t('Notification center')}
        description={t('Latest platform updates and notices')}
        contentClassName='sm:max-w-xl'
        bodyClassName='px-0'
        showCloseButton
      >
        <Tabs
          value={props.activeTab}
          onValueChange={props.onTabChange as (value: string) => void}
        >
          <TabsList variant='line' className='w-auto justify-start gap-8'>
            <TabsTrigger value='notice' className='flex-none gap-1.5 px-0'>
              <Bell className='size-3.5' />
              {t('Notice')}
            </TabsTrigger>
            <TabsTrigger
              value='announcements'
              className='flex-none gap-1.5 px-0'
            >
              <Megaphone className='size-3.5' />
              {t('Timeline')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='notice' className='mt-4'>
            <NoticeContent
              notice={props.notice}
              loading={props.loading}
              t={t}
            />
          </TabsContent>

          <TabsContent value='announcements' className='mt-4'>
            <AnnouncementsContent
              announcements={props.announcements}
              loading={props.loading}
              t={t}
            />
          </TabsContent>
        </Tabs>
      </Dialog>
    </>
  )
}
