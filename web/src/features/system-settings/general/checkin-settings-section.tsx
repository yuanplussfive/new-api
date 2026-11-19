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
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { getGroups } from '@/features/users/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { CheckinPoolEditor } from './checkin-pool-editor'

const validationMessage = 'Invalid check-in reward configuration'
const rewardSchema = z.object({
  name: z.string().trim().min(1, validationMessage).max(50, validationMessage),
  quota: z
    .number({ error: validationMessage })
    .int(validationMessage)
    .min(0, validationMessage)
    .max(Number.MAX_SAFE_INTEGER, validationMessage),
  weight: z
    .number({ error: validationMessage })
    .int(validationMessage)
    .min(1, validationMessage)
    .max(1000000, validationMessage),
})
const poolSchema = z.object({
  group: z.string().trim().min(1, validationMessage).max(64, validationMessage),
  rewards: z
    .array(rewardSchema)
    .min(1, validationMessage)
    .max(12, validationMessage),
})
const schema = z
  .object({ enabled: z.boolean(), pools: z.array(poolSchema).max(100) })
  .refine(
    (value) =>
      new Set(value.pools.map((pool) => pool.group)).size ===
        value.pools.length &&
      value.pools.every(
        (pool) =>
          pool.rewards.reduce((sum, reward) => sum + reward.weight, 0) <=
          1000000
      ),
    { message: 'Invalid check-in reward configuration', path: ['pools'] }
  )
export type CheckinSettingsValues = z.infer<typeof schema>

export function CheckinSettingsSection(props: {
  defaultValues: { enabled: boolean; groupRewards: string }
}) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => requireServerSuccess(await getGroups()),
    staleTime: 300000,
  })
  let pools: CheckinSettingsValues['pools'] = []
  try {
    const stored = z
      .record(z.string(), z.array(rewardSchema))
      .parse(JSON.parse(props.defaultValues.groupRewards))
    pools = Object.entries(stored).map(([group, rewards]) => ({
      group,
      rewards,
    }))
  } catch {
    // Empty legacy settings require explicit group configuration.
  }
  const form = useForm<CheckinSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: { enabled: props.defaultValues.enabled, pools },
  })
  const busy = updateOption.isPending || form.formState.isSubmitting
  async function onSubmit(values: CheckinSettingsValues) {
    const groupRewards = Object.fromEntries(
      values.pools.map((pool) => [pool.group, pool.rewards])
    )
    // Disable first when requested; enable only after replacing every group's pool.
    try {
      if (!values.enabled) {
        await updateOption.mutateAsync({
          key: 'checkin_setting.enabled',
          value: 'false',
        })
      }
      await updateOption.mutateAsync({
        key: 'checkin_setting.group_rewards',
        value: JSON.stringify(groupRewards),
      })
      if (values.enabled) {
        await updateOption.mutateAsync({
          key: 'checkin_setting.enabled',
          value: 'true',
        })
      }
      form.reset(values)
    } catch {
      // useUpdateOption displays the error; keep the draft for a retry.
    }
  }
  return (
    <SettingsSection title={t('Check-in Settings')}>
      <Form {...form}>
        <SettingsForm
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete='off'
          noValidate
        >
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={busy}
            isSaveDisabled={!form.formState.isDirty}
            saveLabel='Save check-in settings'
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Enable check-in feature')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Only configured user groups can check in. Each group has its own reward pool.'
                    )}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={busy}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />
          <FormField
            control={form.control}
            name='pools'
            render={() => (
              <FormItem data-settings-form-span='full'>
                <p className='text-sm font-medium'>{t('Group reward pools')}</p>
                <CheckinPoolEditor
                  groups={groupsData?.data ?? []}
                  disabled={busy}
                />
                <FormDescription>
                  {t(
                    'Probability equals tier weight divided by total weight. Removing a group disables its check-in access.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' disabled={busy || !form.formState.isDirty}>
            {t('Save check-in settings')}
          </Button>
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
