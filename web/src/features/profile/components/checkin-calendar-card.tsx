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
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { ErrorState } from '@/components/error-state'
import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { formatQuotaWithCurrency } from '@/lib/currency'
import dayjs from '@/lib/dayjs'
import { handleServerError } from '@/lib/handle-server-error'
import { createServerError } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { getCheckinStatus, performCheckin } from '../api'
import type { CheckinRecord, CheckinResponse } from '../types'
import { CheckinSlotMachine } from './checkin-slot-machine'

interface CheckinCalendarCardProps {
  checkinEnabled: boolean
  turnstileEnabled: boolean
  turnstileSiteKey: string
  onCheckin?: () => void
}

export function CheckinCalendarCard({
  checkinEnabled,
  turnstileEnabled,
  turnstileSiteKey,
  onCheckin,
}: CheckinCalendarCardProps) {
  const { t } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [drawAnimating, setDrawAnimating] = useState(false)
  const checking = useRef(false)
  const [drawResult, setDrawResult] = useState<CheckinResponse | null>(null)
  const [turnstileModalVisible, setTurnstileModalVisible] = useState(false)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(false)

  const currentMonthStr = useMemo(() => {
    const y = currentMonth.getFullYear()
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }, [currentMonth])

  // Fetch checkin status
  /* eslint-disable @tanstack/query/exhaustive-deps */
  const {
    data: checkinData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['checkin-status', currentMonthStr],
    queryFn: async () => {
      const res = await getCheckinStatus(currentMonthStr)
      if (res.success && res.data) {
        return res.data
      }
      throw createServerError(res, t('Failed to fetch checkin status'))
    },
    enabled: checkinEnabled,
    staleTime: 30000,
    refetchInterval: 60000,
  })
  /* eslint-enable @tanstack/query/exhaustive-deps */

  const checkinRecordsMap = useMemo(() => {
    const map: Record<string, number> = {}
    const records = checkinData?.stats?.records || []
    records.forEach((record: CheckinRecord) => {
      map[record.checkin_date] = record.quota_awarded
    })
    return map
  }, [checkinData?.stats?.records])

  const monthlyQuota = useMemo(() => {
    const records = checkinData?.stats?.records || []
    return records.reduce(
      (sum: number, record: CheckinRecord) => sum + (record.quota_awarded || 0),
      0
    )
  }, [checkinData?.stats?.records])

  const todayString = checkinData?.today ?? dayjs().format('YYYY-MM-DD')
  const checkedToday =
    checkinData?.stats?.checked_in_today === true ||
    (drawResult !== null && drawResult.checkin_date === todayString)
  const todayAward =
    drawResult?.checkin_date === todayString
      ? drawResult.quota_awarded
      : checkinRecordsMap[todayString]
  const eligible = checkinData?.eligible === true

  useEffect(() => {
    if (initialLoaded) return
    if (isLoading) return
    if (!checkinData) return
    setCollapsed(checkedToday)
    setInitialLoaded(true)
  }, [checkinData, checkedToday, initialLoaded, isLoading])

  const shouldTriggerTurnstile = useCallback(
    (message?: string) => {
      if (!turnstileEnabled) return false
      if (typeof message !== 'string') return true
      return message.includes('Turnstile')
    },
    [turnstileEnabled]
  )

  const doCheckin = useCallback(
    async (token?: string) => {
      if (checking.current || !eligible || checkedToday) return
      checking.current = true
      setDrawResult(null)
      setCheckinLoading(true)
      try {
        const res = await performCheckin(token)
        if (res.success && res.data) {
          setDrawResult(res.data)
          setDrawAnimating(true)
          onCheckin?.()
          refetch()
          setTurnstileModalVisible(false)
        } else {
          if (!token && shouldTriggerTurnstile(res.message)) {
            if (!turnstileSiteKey) {
              toast.error(t('Turnstile is enabled but site key is empty.'))
              return
            }
            setTurnstileModalVisible(true)
            return
          }
          if (token && shouldTriggerTurnstile(res.message)) {
            setTurnstileWidgetKey((v) => v + 1)
          }
          handleServerError(res, t('Check-in failed'))
        }
      } catch (error) {
        handleServerError(error, t('Check-in failed'))
      } finally {
        checking.current = false
        setCheckinLoading(false)
      }
    },
    [
      refetch,
      shouldTriggerTurnstile,
      t,
      turnstileSiteKey,
      eligible,
      checkedToday,
      onCheckin,
    ]
  )

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  }

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

    // Fill leading empty days
    for (let i = 0; i < startDayOfWeek; i++) {
      const d = new Date(year, month, -startDayOfWeek + i + 1)
      days.push({ date: d, isCurrentMonth: false })
    }

    // Fill current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Fill trailing empty days to complete the grid
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
      }
    }

    return days
  }, [currentMonth])

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  if (!checkinEnabled) {
    return null
  }

  if (isLoading) {
    return (
      <section className='profile-aside-section' aria-busy='true'>
        <Skeleton className='h-5 w-32' />
        <Skeleton className='mt-2 h-4 w-full max-w-56' />
        <Skeleton className='mt-4 h-9 w-full' />
      </section>
    )
  }

  if (isError && !checkinData) {
    return (
      <section className='profile-aside-section'>
        <ErrorState
          title={t('Failed to fetch checkin status')}
          onRetry={() => void refetch()}
        />
      </section>
    )
  }

  let checkinButtonLabel = t('Spin and check in')
  if (checkinLoading || drawAnimating) {
    checkinButtonLabel = t('Loading...')
  } else if (checkedToday) {
    checkinButtonLabel = t('Checked in')
  } else if (!eligible) {
    checkinButtonLabel = t('Check-in unavailable')
  }

  return (
    <TooltipProvider delay={100}>
      <Dialog
        open={turnstileModalVisible}
        onOpenChange={(open) => {
          setTurnstileModalVisible(open)
          if (!open) {
            setTurnstileWidgetKey((v) => v + 1)
          }
        }}
        title={t('Security Check')}
        contentClassName='sm:max-w-md'
        contentHeight='auto'
        bodyClassName='space-y-4'
      >
        <div className='text-muted-foreground text-sm'>
          {t('Please complete the security check to continue.')}
        </div>
        <div className='flex justify-center py-4'>
          <Turnstile
            key={turnstileWidgetKey}
            siteKey={turnstileSiteKey}
            onVerify={(token) => {
              doCheckin(token)
            }}
            onExpire={() => {
              setTurnstileWidgetKey((v) => v + 1)
            }}
          />
        </div>
      </Dialog>

      <section
        className='profile-aside-section'
        aria-labelledby='profile-checkin-title'
      >
        <div className='profile-checkin-heading'>
          <Button
            type='button'
            variant='ghost'
            aria-expanded={!collapsed}
            aria-controls='profile-checkin-history'
            className='profile-checkin-toggle'
            onClick={() => setCollapsed((value) => !value)}
          >
            <span>
              <span id='profile-checkin-title' className='profile-aside-title'>
                {t('Daily Check-in')}
              </span>
              <span className='profile-checkin-summary block'>
                {checkedToday && todayAward !== undefined
                  ? `${t('Today')} +${formatQuotaWithCurrency(todayAward)}`
                  : t('Check in daily to receive random quota rewards')}
              </span>
            </span>
            {collapsed ? (
              <ChevronDown aria-hidden='true' />
            ) : (
              <ChevronUp aria-hidden='true' />
            )}
          </Button>
          <Button
            onClick={() => doCheckin()}
            disabled={
              checkinLoading ||
              drawAnimating ||
              checkedToday ||
              !eligible ||
              isLoading
            }
            size='sm'
            className='profile-checkin-button'
          >
            {checkinButtonLabel}
          </Button>
        </div>

        {!eligible && checkinData && (
          <p role='status' className='profile-checkin-unavailable'>
            {t('Check-in is not available for your user group')}
          </p>
        )}
        {eligible && (
          <CheckinSlotMachine
            rewards={checkinData?.reward_tiers ?? []}
            pending={checkinLoading}
            revealing={drawAnimating}
            checkedIn={checkedToday}
            result={
              drawResult?.checkin_date === todayString ? drawResult : null
            }
            onReveal={() => {
              setDrawAnimating(false)
              if (drawResult) {
                toast.success(
                  `${t('Check-in successful! Received')} ${formatQuotaWithCurrency(drawResult.quota_awarded)}`
                )
              }
            }}
          />
        )}
        <div
          id='profile-checkin-history'
          className='profile-checkin-history'
          hidden={collapsed}
        >
          <dl className='profile-checkin-stats'>
            <div className='profile-checkin-stat'>
              <dt>{t('Total check-ins')}</dt>
              <dd>{checkinData?.stats?.total_checkins || 0}</dd>
            </div>
            <div className='profile-checkin-stat'>
              <dt>{t('This month')}</dt>
              <dd>
                {formatQuotaWithCurrency(monthlyQuota, { digitsLarge: 0 })}
              </dd>
            </div>
            <div className='profile-checkin-stat'>
              <dt>{t('Total earned')}</dt>
              <dd>
                {formatQuotaWithCurrency(checkinData?.stats?.total_quota || 0, {
                  digitsLarge: 0,
                })}
              </dd>
            </div>
          </dl>

          <div className='profile-calendar'>
            <div className='profile-calendar-header'>
              <h3>{dayjs(currentMonth).format('YYYY-MM')}</h3>
              <div className='flex items-center'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  aria-label={`${t('Previous')} ${t('Month')}`}
                  onClick={handlePrevMonth}
                >
                  <ChevronLeft className='size-4' aria-hidden='true' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  aria-label={`${t('Next')} ${t('Month')}`}
                  onClick={handleNextMonth}
                >
                  <ChevronRight className='size-4' aria-hidden='true' />
                </Button>
              </div>
            </div>

            <div className='profile-calendar-grid'>
              {weekDays.map((day) => (
                <div key={day} className='profile-calendar-weekday'>
                  {day}
                </div>
              ))}

              {calendarDays.map((dayObj) => {
                const dateStr = `${dayObj.date.getFullYear()}-${String(
                  dayObj.date.getMonth() + 1
                ).padStart(
                  2,
                  '0'
                )}-${String(dayObj.date.getDate()).padStart(2, '0')}`
                const isToday = dateStr === todayString
                const quotaAwarded = checkinRecordsMap[dateStr]
                const isCheckedIn = quotaAwarded !== undefined
                const dayNum = dayObj.date.getDate()

                const dayButton = (
                  <Button
                    key={dateStr}
                    type='button'
                    variant='ghost'
                    disabled={!dayObj.isCurrentMonth}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${dateStr}${isCheckedIn ? `, ${t('Checked in')}` : ''}`}
                    className={cn(
                      'profile-checkin-day',
                      isCheckedIn && 'is-checked'
                    )}
                  >
                    {dayNum}
                  </Button>
                )

                if (isCheckedIn && dayObj.isCurrentMonth) {
                  return (
                    <Tooltip key={dateStr}>
                      <TooltipTrigger render={dayButton} />
                      <TooltipContent>
                        <div className='text-xs'>
                          <div className='font-medium'>{t('Checked in')}</div>
                          <div className='text-muted-foreground mt-0.5'>
                            +{formatQuotaWithCurrency(quotaAwarded)}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return dayButton
              })}
            </div>

            <p className='profile-checkin-note'>
              {t('Rewards will be added directly to your balance')}
            </p>
          </div>
        </div>
      </section>
    </TooltipProvider>
  )
}
