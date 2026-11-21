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
import { ChevronRight, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  SettingsControlChildren,
  SettingsControlGroup,
  SettingsSwitchField,
} from '@/features/system-settings/components/settings-form-layout'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import {
  formatQuota,
  parseQuotaFromDollars,
  quotaUnitsToDollars,
} from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import { ROLE } from '@/lib/roles'

import { updateUserSettings } from '../../api'
import { NOTIFICATION_METHODS } from '../../constants'
import { normalizeUserSettings } from '../../lib/user-settings'
import type { UserProfile, NotifyType } from '../../types'

interface NotificationTabProps {
  profile: UserProfile | null
  onUpdate: () => void
  /** Whether the site sends low balance reminders at all */
  quotaRemindEnabled: boolean
  /** The site default reminder threshold, in quota units */
  quotaRemindThreshold: number
}

interface NotificationFieldProps {
  controlId: string
  label: string
  description?: ReactNode
  children: ReactNode
}

function NotificationField(props: NotificationFieldProps) {
  const descriptionId = `${props.controlId}-description`

  return (
    <Field className='profile-field'>
      <div className='profile-field-label'>
        <FieldLabel htmlFor={props.controlId}>{props.label}</FieldLabel>
      </div>
      <FieldContent className='profile-field-control'>
        {props.children}
        {props.description && (
          <FieldDescription id={descriptionId}>
            {props.description}
          </FieldDescription>
        )}
      </FieldContent>
    </Field>
  )
}

export function NotificationTab(props: NotificationTabProps) {
  const { t } = useTranslation()
  const role = props.profile?.role ?? 0
  const isAdmin = role >= ROLE.ADMIN
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState(() => normalizeUserSettings())
  const [thresholdInput, setThresholdInput] = useState('')

  const updateField = useCallback(
    <K extends keyof typeof settings>(
      field: K,
      value: (typeof settings)[K]
    ) => {
      setSettings((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  useEffect(() => {
    if (props.profile?.setting) {
      const next = normalizeUserSettings(props.profile.setting)
      setSettings(next)
      // 0 means the site default and shows as an empty input.
      setThresholdInput(
        next.quota_warning_threshold
          ? String(quotaUnitsToDollars(next.quota_warning_threshold))
          : ''
      )
    }
  }, [props.profile])

  const handleSave = async () => {
    try {
      setLoading(true)
      const { record_ip_log: _recordIpLog, ...notificationSettings } = settings
      const response = await updateUserSettings(notificationSettings)

      if (response.success) {
        toast.success(t('Settings updated successfully'))
        props.onUpdate()
      } else {
        handleServerError(response, t('Failed to update settings'))
      }
    } catch (error) {
      handleServerError(error, t('Failed to update settings'))
    } finally {
      setLoading(false)
    }
  }

  const notifyType = settings.notify_type
  // Switches the user never chose: reminders stay on, and root alone gets
  // channel notifications.
  const quotaWarningEnabled = settings.quota_warning_enabled ?? true
  const channelNotifyEnabled =
    settings.channel_notify_enabled ?? role >= ROLE.SUPER_ADMIN
  const tokensOnly = getCurrencyDisplay().meta.kind === 'tokens'

  return (
    <>
      <section
        className='profile-section'
        aria-labelledby='profile-notifications-title'
      >
        <h2 id='profile-notifications-title' className='profile-section-title'>
          {t('Notifications')}
        </h2>

        {!props.quotaRemindEnabled && !isAdmin ? (
          <p className='text-muted-foreground mt-3 text-sm'>
            {t('No notifications are available to you right now')}
          </p>
        ) : (
          <FieldGroup className='profile-section-fields'>
            <Field className='profile-field'>
              <div className='profile-field-label'>
                <FieldLabel id='notification-method-label'>
                  {t('Notification Method')}
                </FieldLabel>
              </div>
              <FieldContent className='profile-field-control'>
                <ToggleGroup
                  value={[notifyType]}
                  onValueChange={(value) => {
                    const nextValue = value.find((item) => item !== notifyType)
                    if (nextValue) {
                      updateField('notify_type', nextValue as NotifyType)
                    }
                  }}
                  aria-labelledby='notification-method-label'
                  size='sm'
                  spacing={0}
                  className='profile-notification-methods'
                >
                  {NOTIFICATION_METHODS.map((method) => (
                    <ToggleGroupItem
                      key={method.value}
                      value={method.value}
                      className='profile-notification-method'
                    >
                      {t(method.label)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldContent>
            </Field>

            <FieldGroup className='profile-method-fields'>
              {notifyType === 'email' && (
                <NotificationField
                  controlId='notifyEmail'
                  label={t('Notification Email')}
                >
                  <Input
                    id='notifyEmail'
                    type='email'
                    value={settings.notification_email}
                    onChange={(event) =>
                      updateField('notification_email', event.target.value)
                    }
                    placeholder={t('Leave empty to use account email')}
                  />
                </NotificationField>
              )}

              {notifyType === 'webhook' && (
                <>
                  <NotificationField
                    controlId='webhookUrl'
                    label={t('Webhook URL')}
                  >
                    <Input
                      id='webhookUrl'
                      type='url'
                      value={settings.webhook_url}
                      onChange={(event) =>
                        updateField('webhook_url', event.target.value)
                      }
                      placeholder={t('https://example.com/webhook')}
                    />
                  </NotificationField>
                  <NotificationField
                    controlId='webhookSecret'
                    label={t('Webhook Secret')}
                  >
                    <PasswordInput
                      id='webhookSecret'
                      value={settings.webhook_secret}
                      onChange={(event) =>
                        updateField('webhook_secret', event.target.value)
                      }
                      placeholder={t('Enter secret key')}
                    />
                  </NotificationField>
                </>
              )}

              {notifyType === 'bark' && (
                <NotificationField
                  controlId='barkUrl'
                  label={t('Bark Push URL')}
                  description={
                    <>
                      {t('Template variables:')} {'{{title}}'}, {'{{content}}'}
                    </>
                  }
                >
                  <Input
                    id='barkUrl'
                    type='url'
                    value={settings.bark_url}
                    onChange={(event) =>
                      updateField('bark_url', event.target.value)
                    }
                    placeholder={t(
                      'https://api.day.app/yourkey/{{title}}/{{content}}'
                    )}
                  />
                </NotificationField>
              )}

              {notifyType === 'gotify' && (
                <>
                  <NotificationField
                    controlId='gotifyUrl'
                    label={t('Gotify Server URL')}
                    description={t('Enter the full URL of your Gotify server')}
                  >
                    <Input
                      id='gotifyUrl'
                      type='url'
                      value={settings.gotify_url}
                      onChange={(event) =>
                        updateField('gotify_url', event.target.value)
                      }
                      placeholder={t('https://gotify.example.com')}
                    />
                  </NotificationField>
                  <NotificationField
                    controlId='gotifyToken'
                    label={t('Gotify Application Token')}
                    description={t(
                      'Token obtained from your Gotify application'
                    )}
                  >
                    <PasswordInput
                      id='gotifyToken'
                      value={settings.gotify_token}
                      onChange={(event) =>
                        updateField('gotify_token', event.target.value)
                      }
                      placeholder={t('Enter application token')}
                    />
                  </NotificationField>
                  <NotificationField
                    controlId='gotifyPriority'
                    label={t('Message Priority')}
                    description={t(
                      'Priority level from 0 (lowest) to 10 (highest), default is 5'
                    )}
                  >
                    <Input
                      id='gotifyPriority'
                      type='number'
                      min='0'
                      max='10'
                      value={settings.gotify_priority}
                      onChange={(event) =>
                        updateField(
                          'gotify_priority',
                          Number(event.target.value)
                        )
                      }
                      placeholder='5'
                    />
                  </NotificationField>
                  <details className='profile-setup-details'>
                    <summary>
                      <ChevronRight aria-hidden='true' />
                      {t('Setup Instructions')}
                    </summary>
                    <ol>
                      <li>
                        {t('1. Create an application in your Gotify server')}
                      </li>
                      <li>{t('2. Copy the application token')}</li>
                      <li>
                        {t('3. Enter your Gotify server URL and token above')}
                      </li>
                    </ol>
                    <a
                      href='https://gotify.net/'
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      {t('Gotify Documentation')}
                    </a>
                  </details>
                </>
              )}
            </FieldGroup>

            <div className='profile-notification-options'>
              <h3>{t('Notifications to receive')}</h3>
              <SettingsControlGroup className='profile-switch-group'>
                {props.quotaRemindEnabled && (
                  <>
                    <SettingsSwitchField
                      controlId='quotaWarningEnabled'
                      label={t('Low balance reminder')}
                      description={t(
                        'Remind me once when my balance drops below the threshold'
                      )}
                      checked={quotaWarningEnabled}
                      onCheckedChange={(checked) =>
                        updateField('quota_warning_enabled', checked)
                      }
                    />
                    {quotaWarningEnabled && (
                      <SettingsControlChildren className='profile-threshold-wrap'>
                        <NotificationField
                          controlId='threshold'
                          label={`${t('Reminder threshold')} (${getCurrencyLabel()})`}
                          description={t(
                            'Leave empty to use the site default ({{amount}})',
                            { amount: formatQuota(props.quotaRemindThreshold) }
                          )}
                        >
                          <Input
                            id='threshold'
                            type='number'
                            min={0}
                            step={tokensOnly ? 1 : 0.000001}
                            value={thresholdInput}
                            onChange={(event) => {
                              const value = event.target.value
                              setThresholdInput(value)
                              updateField(
                                'quota_warning_threshold',
                                value.trim() === ''
                                  ? 0
                                  : parseQuotaFromDollars(Number(value))
                              )
                            }}
                            placeholder={String(
                              quotaUnitsToDollars(props.quotaRemindThreshold)
                            )}
                          />
                        </NotificationField>
                      </SettingsControlChildren>
                    )}
                  </>
                )}
                {isAdmin && (
                  <>
                    <SettingsSwitchField
                      controlId='channelNotify'
                      label={t('Channel notifications')}
                      description={t(
                        'When a channel is disabled or re-enabled automatically, or a test of all channels finishes'
                      )}
                      checked={channelNotifyEnabled}
                      onCheckedChange={(checked) =>
                        updateField('channel_notify_enabled', checked)
                      }
                    />
                    <SettingsSwitchField
                      controlId='upstreamModelUpdateNotify'
                      label={t('Upstream Model Updates')}
                      description={t(
                        'Only available for admins. When enabled, you will receive a summary notification via your selected method when the scheduled model check detects upstream model changes or check failures.'
                      )}
                      checked={settings.upstream_model_update_notify_enabled}
                      onCheckedChange={(checked) =>
                        updateField(
                          'upstream_model_update_notify_enabled',
                          checked
                        )
                      }
                    />
                  </>
                )}
              </SettingsControlGroup>
            </div>
          </FieldGroup>
        )}
      </section>

      <section
        className='profile-section'
        aria-labelledby='profile-preferences-title'
      >
        <h2 id='profile-preferences-title' className='profile-section-title'>
          {t('Preferences')}
        </h2>
        <SettingsControlGroup className='profile-section-fields'>
          <SettingsSwitchField
            controlId='acceptUnsetPrice'
            label={t('Accept Unpriced Models')}
            description={t('Allow using models without price configuration')}
            checked={settings.accept_unset_model_ratio_model}
            onCheckedChange={(checked) =>
              updateField('accept_unset_model_ratio_model', checked)
            }
          />
        </SettingsControlGroup>
        <div className='profile-save-row'>
          <Button onClick={handleSave} disabled={loading}>
            {loading && (
              <Loader2 className='size-4 animate-spin' aria-hidden='true' />
            )}
            {loading ? t('Saving...') : t('Save Settings')}
          </Button>
        </div>
      </section>
    </>
  )
}
