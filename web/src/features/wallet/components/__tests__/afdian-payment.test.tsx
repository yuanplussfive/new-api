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
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { createAfdianCheckout, type AfdianProduct } from '../../afdian-api'
import { AfdianPayButton, AfdianProductsSection } from '../afdian-payment'

vi.mock('@/lib/api', () => ({ api: { post: vi.fn(), get: vi.fn() } }))

const product: AfdianProduct = {
  plan_id: 'b'.repeat(32),
  name: 'Credit plan',
  price: '10.00',
  quota: 500000,
  subscription_plan_id: 0,
}
const checkout = {
  order_id: 'afd_checkout',
  checkout_url: 'https://afdian.com/order/create?custom_order_id=afd_checkout',
}
const nextCheckout = {
  order_id: 'afd_next_checkout',
  checkout_url:
    'https://afdian.com/order/create?custom_order_id=afd_next_checkout',
}

function renderPayment(
  props: { disabled?: boolean; onPaid?: () => void } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AfdianPayButton product={product} {...props} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.get).mockResolvedValue({
    data: { success: true, data: { status: 'pending' } },
  })
})

describe('Afdian payment', () => {
  test('requires confirmation and creates a checkout from the selected plan only', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, data: checkout },
    })
    const user = userEvent.setup()
    renderPayment()
    await user.click(screen.getByRole('button', { name: /Afdian/ }))
    expect(api.post).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole('button', { name: 'Continue to payment' })
    )
    const link = await screen.findByRole('link', {
      name: 'Open Afdian checkout',
    })
    expect(link).toHaveAttribute('href', checkout.checkout_url)
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(api.post).toHaveBeenCalledWith('/api/user/afdian/pay', {
      plan_id: product.plan_id,
    })
    expect(
      screen.getByRole('button', { name: 'Verify payment' })
    ).toBeDisabled()
  })

  test.each(['pending', 'success'])(
    'creates a fresh checkout after closing and reopening a %s order',
    async (status) => {
      vi.mocked(api.post)
        .mockResolvedValueOnce({ data: { success: true, data: checkout } })
        .mockResolvedValueOnce({ data: { success: true, data: nextCheckout } })
      vi.mocked(api.get).mockResolvedValue({
        data: { success: true, data: { status } },
      })
      const user = userEvent.setup()
      renderPayment()
      await user.click(screen.getByRole('button', { name: /Afdian/ }))
      await user.click(
        screen.getByRole('button', { name: 'Continue to payment' })
      )
      expect(
        await screen.findByRole('link', { name: 'Open Afdian checkout' })
      ).toHaveAttribute('href', checkout.checkout_url)
      if (status === 'success') {
        expect(await screen.findByRole('status')).toHaveTextContent(
          'Payment verified'
        )
      }

      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      await user.click(screen.getByRole('button', { name: /Afdian/ }))
      expect(
        screen.queryByRole('link', { name: 'Open Afdian checkout' })
      ).not.toBeInTheDocument()
      expect(api.post).toHaveBeenCalledOnce()
      await user.click(
        screen.getByRole('button', { name: 'Continue to payment' })
      )
      expect(
        await screen.findByRole('link', { name: 'Open Afdian checkout' })
      ).toHaveAttribute('href', nextCheckout.checkout_url)
      expect(api.post).toHaveBeenCalledTimes(2)
    }
  )

  test('keeps the new checkout when the previous request completes after reopening', async () => {
    const previousResponse = { data: { success: true, data: checkout } }
    let resolvePrevious!: (value: typeof previousResponse) => void
    const previousRequest = new Promise<typeof previousResponse>((resolve) => {
      resolvePrevious = resolve
    })
    vi.mocked(api.post)
      .mockReturnValueOnce(previousRequest)
      .mockResolvedValueOnce({ data: { success: true, data: nextCheckout } })
    const user = userEvent.setup()
    renderPayment()
    await user.click(screen.getByRole('button', { name: /Afdian/ }))
    await user.click(
      screen.getByRole('button', { name: 'Continue to payment' })
    )
    await waitFor(() => expect(api.post).toHaveBeenCalledOnce())
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /Afdian/ }))
    expect(
      screen.getByRole('button', { name: 'Continue to payment' })
    ).toBeEnabled()
    await user.click(
      screen.getByRole('button', { name: 'Continue to payment' })
    )
    expect(
      await screen.findByRole('link', { name: 'Open Afdian checkout' })
    ).toHaveAttribute('href', nextCheckout.checkout_url)
    await act(async () => {
      resolvePrevious(previousResponse)
      await previousRequest
    })
    expect(
      screen.getByRole('link', { name: 'Open Afdian checkout' })
    ).toHaveAttribute('href', nextCheckout.checkout_url)
  })

  test('uses both local and provider order numbers for manual recovery and permits another purchase after success', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { success: true, data: checkout } })
      .mockResolvedValueOnce({ data: { success: true } })
    const onPaid = vi.fn()
    const user = userEvent.setup()
    renderPayment({ onPaid })
    await user.click(screen.getByRole('button', { name: /Afdian/ }))
    await user.click(
      screen.getByRole('button', { name: 'Continue to payment' })
    )
    await user.type(
      await screen.findByLabelText('Afdian order number'),
      'paid-order'
    )
    await user.click(screen.getByRole('button', { name: 'Verify payment' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Payment verified'
    )
    expect(api.post).toHaveBeenLastCalledWith('/api/user/afdian/check', {
      order_id: 'afd_checkout',
      out_trade_no: 'paid-order',
    })
    await waitFor(() => expect(onPaid).toHaveBeenCalledOnce())
    await user.click(
      screen.getByRole('button', { name: 'Create another order' })
    )
    expect(
      screen.getByRole('button', { name: 'Continue to payment' })
    ).toBeEnabled()
  })

  test('does not expose a checkout link after a business failure or a foreign redirect URL', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: false, message: 'Afdian payment is not enabled' },
    })
    await expect(createAfdianCheckout(product.plan_id)).rejects.toThrow(
      'Afdian payment is not enabled'
    )
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...checkout, checkout_url: 'https://untrusted.example/pay' },
      },
    })
    await expect(createAfdianCheckout(product.plan_id)).rejects.toThrow(
      'Failed to start payment'
    )
  })

  test('keeps purchase-limit-disabled buttons inaccessible to payment creation', async () => {
    renderPayment({ disabled: true })
    const button = screen.getByRole('button', { name: /Afdian/ })
    expect(button).toBeDisabled()
    await userEvent.setup().click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  test('code delivery explains private messages without starting verification or claiming automatic credit', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          delivery_mode: 'redemption',
          checkout_url: `https://afdian.com/order/create?plan_id=${product.plan_id}&month=1&product_type=0`,
        },
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <AfdianPayButton
          product={{ ...product, delivery_mode: 'redemption' }}
        />
      </QueryClientProvider>
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Afdian/ }))
    expect(
      screen.getByText(
        'After payment, Afdian sends a redemption code by private message. Paste it into the redemption field in your wallet to add credit.'
      )
    ).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'Continue to payment' })
    )
    expect(
      await screen.findByRole('link', { name: 'Open Afdian checkout' })
    ).toHaveAttribute(
      'href',
      `https://afdian.com/order/create?plan_id=${product.plan_id}&month=1&product_type=0`
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Check your Afdian private messages after payment, then redeem the code in your wallet.'
    )
    expect(
      screen.queryByRole('button', { name: 'Verify payment' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Afdian order number')
    ).not.toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  test('keeps subscription mappings out of wallet recharge product cards', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <AfdianProductsSection
          products={[
            product,
            {
              ...product,
              plan_id: 'c'.repeat(32),
              name: 'Subscription',
              quota: 0,
              subscription_plan_id: 1,
            },
          ]}
        />
      </QueryClientProvider>
    )
    expect(screen.getByText('Credit plan')).toBeVisible()
    expect(screen.queryByText('Subscription')).not.toBeInTheDocument()
  })
})
