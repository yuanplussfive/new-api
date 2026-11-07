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
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { AfdianCodeDelivery } from './afdian-code-delivery'

const afdianProductsSchema = z.array(
  z.object({
    plan_id: z.string(),
    name: z.string(),
    price: z.string(),
    quota: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
)

const afdianSchema = z.object({
  enabled: z.boolean(),
  user_id: z.string(),
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
    products: AfdianProduct[]
  }
}

// Creem's editor restricts currencies to USD/EUR. Reuse the shared JSON
// editor for CNY plans with redemption quotas.
export function AfdianSettingsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['afdian-settings'],
    refetchOnWindowFocus: false,
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
      products: '[]',
    },
  })
  useEffect(() => {
    if (query.data) {
      form.reset({
        ...query.data.config,
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
      form.reset({
        ...data.config,
        products: JSON.stringify(data.config.products, null, 2),
      })
      toast.success(t('Settings updated successfully'))
    },
  })
  const productsJSON = useWatch({ control: form.control, name: 'products' })
  let products: AfdianProduct[] = []
  try {
    const parsed = afdianProductsSchema.safeParse(JSON.parse(productsJSON))
    if (parsed.success) products = parsed.data
  } catch {
    // Invalid JSON stays in the editor so it can be corrected before saving.
  }
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
            'Configure Afdian plans and redemption code delivery. Prices are in CNY. No Open API token or payment webhook is required.'
          )}
        </p>
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
          name='products'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Afdian products')}</FormLabel>
              <FormControl>
                <JsonCodeEditor value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormDescription>
                {t(
                  'Set plan_id, name, price (CNY string), and quota (raw wallet units). Each code grants the configured quota when redeemed.'
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
        <AfdianCodeDelivery
          products={products}
          disabled={query.isPending || query.isError || save.isPending}
          unsaved={form.formState.isDirty}
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
          href='https://afdian.com/dashboard'
          target='_blank'
          rel='noopener noreferrer'
        >
          {t('Open Afdian dashboard')}
        </a>
      </div>
    </Form>
  )
}
