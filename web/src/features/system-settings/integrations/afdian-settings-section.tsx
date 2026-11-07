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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { CopyButton } from '@/components/copy-button'
import { JsonCodeEditor } from '@/components/json-code-editor'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { AfdianProduct } from '@/features/wallet/afdian-api'
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { SettingsPageFormActions } from '../components/settings-page-context'

const afdianSchema = z.object({
  enabled: z.boolean(),
  user_id: z.string(),
  api_token: z.string(),
  products: z.string().refine((value) => {
    try {
      return Array.isArray(JSON.parse(value))
    } catch {
      return false
    }
  }, 'Products must be a JSON array'),
})
type AfdianForm = z.infer<typeof afdianSchema>
interface AfdianConfigResponse {
  config: {
    enabled: boolean
    user_id: string
    api_token: string
    products: AfdianProduct[]
  }
  api_token_configured: boolean
}

// Creem's editor restricts currencies to USD/EUR and cannot express a site
// subscription mapping. Reuse the shared JSON editor for this provider schema.
export function AfdianSettingsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['afdian-settings'],
    queryFn: async (): Promise<AfdianConfigResponse> => {
      const response = await api.get('/api/option/afdian')
      return requireServerSuccess(response.data).data
    },
  })
  const form = useForm<AfdianForm>({
    resolver: zodResolver(afdianSchema),
    defaultValues: {
      enabled: false,
      user_id: '',
      api_token: '',
      products: '[]',
    },
  })
  useEffect(() => {
    if (query.data) {
      form.reset({
        ...query.data.config,
        api_token: '',
        products: JSON.stringify(query.data.config.products, null, 2),
      })
    }
  }, [query.data, form])
  const save = useMutation({
    mutationFn: async (values: AfdianForm): Promise<AfdianConfigResponse> => {
      const response = await api.put('/api/option/afdian', {
        ...values,
        products: JSON.parse(values.products),
      })
      return requireServerSuccess(response.data).data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['afdian-settings'], data)
      toast.success(t('Settings updated successfully'))
    },
  })
  const webhook = `${window.location.origin}/api/afdian/webhook`
  return (
    <Form {...form}>
      <div className='space-y-6'>
        <SettingsPageFormActions
          onSave={() =>
            void form.handleSubmit((values) => save.mutate(values))()
          }
          isSaving={save.isPending}
          isSaveDisabled={query.isPending || query.isError}
          saveLabel='Save Afdian settings'
        />
        <h3 className='text-lg font-medium'>{t('Afdian')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Configure your Afdian creator Open API credentials and one-month plans. Prices are always in CNY.'
          )}
        </p>
        <div className='flex flex-wrap items-center gap-2 text-sm'>
          <span>
            {t('Webhook URL')}: {webhook}
          </span>
          <CopyButton value={webhook} />
        </div>
        <FormField
          control={form.control}
          name='enabled'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Enable Afdian')}</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='user_id'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Afdian creator user ID')}</FormLabel>
              <FormControl>
                <Input {...field} maxLength={32} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='api_token'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('API Token')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type='password'
                  autoComplete='new-password'
                  maxLength={512}
                />
              </FormControl>
              <FormDescription>
                {query.data?.api_token_configured
                  ? t('Configured. Leave blank to keep the current token.')
                  : t('Enter the token from your Afdian Open API settings.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='products'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Afdian products')}</FormLabel>
              <FormControl>
                <JsonCodeEditor value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormDescription>
                {t(
                  'Set plan_id, name, price (CNY string), quota (raw wallet units), and subscription_plan_id (0 for wallet recharge). For a subscription, set quota to 0 and use its site plan ID.'
                )}
              </FormDescription>
              <pre className='overflow-x-auto rounded border p-3 text-xs'>
                {JSON.stringify(
                  [
                    {
                      plan_id: 'your_32_character_plan_id',
                      name: 'Wallet credit',
                      price: '10.00',
                      quota: 500000,
                      subscription_plan_id: 0,
                    },
                  ],
                  null,
                  2
                )}
              </pre>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type='button'
          disabled={query.isPending || query.isError || save.isPending}
          onClick={() =>
            void form.handleSubmit((values) => save.mutate(values))()
          }
        >
          {t('Save Afdian settings')}
        </Button>
        <a
          className='block text-sm underline'
          href='https://afdian.com/dashboard/dev'
          target='_blank'
          rel='noopener noreferrer'
        >
          {t('Open Afdian developer settings')}
        </a>
      </div>
    </Form>
  )
}
