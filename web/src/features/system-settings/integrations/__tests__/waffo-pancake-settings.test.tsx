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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { PaymentSettingsSection } from '../payment-settings-section'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.put).mockResolvedValue({ data: { success: true } })
  vi.mocked(api.get).mockRejectedValue(
    new Error('Payment provider unavailable')
  )
})

test.each([
  { scenario: 'configured gateway', configured: true, enabled: true },
  { scenario: 'gateway without credentials', configured: false, enabled: true },
  { scenario: 'disabled gateway', configured: true, enabled: false },
])(
  'saves only the enable state for $scenario when the catalog is unavailable',
  async ({ configured, enabled }) => {
    const client = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const actions = document.createElement('div')
    document.body.append(actions)
    const view = render(
      <QueryClientProvider client={client}>
        <SettingsPageProvider actionsContainer={actions}>
          <PaymentSettingsSection
            defaultValues={{
              PayAddress: '',
              EpayId: '',
              EpayKey: '',
              Price: 1,
              MinTopUp: 1,
              CustomCallbackAddress: '',
              PayMethods: '[]',
              AmountOptions: '[]',
              AmountDiscount: '{}',
              StripeApiSecret: '',
              StripeWebhookSecret: '',
              StripePriceId: '',
              StripeUnitPrice: 1,
              StripeMinTopUp: 1,
              StripePromotionCodesEnabled: false,
              CreemApiKey: '',
              CreemWebhookSecret: '',
              CreemTestMode: false,
              CreemProducts: '[]',
            }}
            waffoDefaultValues={{
              WaffoEnabled: false,
              WaffoApiKey: '',
              WaffoPrivateKey: '',
              WaffoPublicCert: '',
              WaffoSandboxPublicCert: '',
              WaffoSandboxApiKey: '',
              WaffoSandboxPrivateKey: '',
              WaffoSandbox: false,
              WaffoMerchantId: '',
              WaffoCurrency: 'USD',
              WaffoUnitPrice: 1,
              WaffoMinTopUp: 1,
              WaffoNotifyUrl: '',
              WaffoReturnUrl: '',
              WaffoPayMethods: '[]',
            }}
            waffoPancakeDefaultValues={{
              WaffoPancakeEnabled: enabled,
              WaffoPancakeMerchantID: configured ? 'test-merchant' : '',
              WaffoPancakePrivateKey: '',
              WaffoPancakeReturnURL: '',
            }}
            waffoPancakeProvisionedStoreID={configured ? 'test-store' : ''}
            waffoPancakeProvisionedProductID={configured ? 'test-product' : ''}
            complianceDefaults={{
              confirmed: true,
              termsVersion: 'v1',
              confirmedAt: 1,
              confirmedBy: 1,
            }}
          />
        </SettingsPageProvider>
      </QueryClientProvider>
    )
    try {
      const user = userEvent.setup()
      await user.click(screen.getByRole('tab', { name: 'Waffo Pancake' }))
      const control = screen.getByRole('switch', {
        name: 'Enable Waffo Pancake',
      })
      expect(control).toHaveAttribute('aria-checked', String(enabled))
      control.focus()
      await user.keyboard(' ')
      expect(control).toHaveAttribute('aria-checked', String(!enabled))
      await user.click(
        screen.getByRole('button', { name: 'Save all settings' })
      )
      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith('/api/option/', {
          key: 'WaffoPancakeEnabled',
          value: !enabled,
        })
      )
      expect(api.put).toHaveBeenCalledTimes(1)
      expect(api.post).not.toHaveBeenCalled()
      expect(screen.getByPlaceholderText('MER_xxx')).toHaveValue(
        configured ? 'test-merchant' : ''
      )
    } finally {
      view.unmount()
      client.clear()
      actions.remove()
    }
  }
)
