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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'

import { AffiliateRewardsCard } from './components/affiliate-rewards-card'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { PhysicalWalletCard } from './components/physical-wallet-card'
import { RechargeFormCard } from './components/recharge-form-card'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletFacts } from './components/wallet-facts'
import { WalletLedger } from './components/wallet-ledger'
import { WalletNavigation } from './components/wallet-navigation'
import { WalletMetrics, WalletQuickActions } from './components/wallet-overview'
import { useAffiliate, useRedemption, useTopupInfo } from './hooks'
import { useWalletAccount } from './hooks/use-wallet-account'
import { useWalletCheckout } from './hooks/use-wallet-checkout'

export function Wallet(props: { initialShowHistory?: boolean }) {
  const { t } = useTranslation()
  const account = useWalletAccount()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()
  const checkout = useWalletCheckout(topupInfo, account.refresh)
  const affiliate = useAffiliate()
  const redemption = useRedemption()
  const [code, setCode] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  useEffect(() => {
    if (!props.initialShowHistory) return
    setHistoryOpen(true)
    window.history.replaceState({}, '', window.location.pathname)
  }, [props.initialShowHistory])

  const redeem = async () => {
    if (!code) return
    if (await redemption.redeemCode(code)) {
      setCode('')
      await account.refresh()
    }
  }
  const scrollToAddFunds = () => {
    document
      .querySelector('#wallet-add-funds')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const focusRedemption = () => {
    scrollToAddFunds()
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('#redemption-code')?.focus()
    }, 350)
  }
  const transfer = async (amount: number) => {
    const success = await affiliate.transferQuota(amount)
    if (success) await account.refresh()
    return success
  }

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Wallet')}</SectionPageLayout.Title>
        <SectionPageLayout.Description>
          {t('Monitor balance, usage, and request volume')}
        </SectionPageLayout.Description>
        <SectionPageLayout.Actions>
          <WalletNavigation onOpenHistory={() => setHistoryOpen(true)} />
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <div className='wallet-surface mx-auto w-full max-w-[1440px]'>
            <div className='grid items-end gap-x-10 gap-y-7 pb-8 lg:grid-cols-[25.5rem_minmax(0,1fr)]'>
              <PhysicalWalletCard
                loading={account.loading}
                user={account.user}
              />
              <WalletQuickActions
                canTransfer={(account.user?.aff_quota ?? 0) > 0}
                onAddFunds={scrollToAddFunds}
                onHistory={() => setHistoryOpen(true)}
                onRedeem={focusRedemption}
                onTransfer={() => setTransferOpen(true)}
              />
            </div>

            <WalletMetrics loading={account.loading} user={account.user} />

            <div className='mt-8 grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_19rem]'>
              <div className='wallet-section min-w-0 max-xl:contents'>
                <div id='wallet-add-funds' className='order-1 scroll-mt-4'>
                  <RechargeFormCard
                    {...checkout.formProps}
                    topupInfo={topupInfo}
                    presetAmounts={presetAmounts}
                    redemptionCode={code}
                    onRedemptionCodeChange={setCode}
                    onRedeem={redeem}
                    redeeming={redemption.redeeming}
                    topupLink={topupInfo?.topup_link}
                    loading={topupLoading}
                    onOpenBilling={() => setHistoryOpen(true)}
                  />
                </div>
                <div className='wallet-section order-2'>
                  <SubscriptionPlansCard
                    topupInfo={topupInfo}
                    userQuota={account.user?.quota}
                    onPurchaseSuccess={account.refresh}
                  />
                </div>
                <div className='wallet-section order-4'>
                  <WalletLedger onViewAll={() => setHistoryOpen(true)} />
                </div>
              </div>

              <aside className='min-w-0 max-xl:order-3 max-xl:contents'>
                <div className='wallet-section xl:border-t-0'>
                  <WalletFacts
                    onOpenHistory={() => setHistoryOpen(true)}
                    onOpenTransfer={() => setTransferOpen(true)}
                    onRefresh={account.refresh}
                    refreshing={account.loading}
                    user={account.user}
                  />
                </div>
                <div className='wallet-section'>
                  <AffiliateRewardsCard
                    affiliateLink={affiliate.affiliateLink}
                    complianceConfirmed={
                      topupInfo?.payment_compliance_confirmed !== false
                    }
                    loading={affiliate.loading}
                    onTransfer={() => setTransferOpen(true)}
                    user={account.user}
                  />
                </div>
              </aside>
            </div>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
      <PaymentConfirmDialog {...checkout.confirmProps} />
      <CreemConfirmDialog {...checkout.creemProps} />
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onConfirm={transfer}
        availableQuota={account.user?.aff_quota ?? 0}
        transferring={affiliate.transferring}
      />
      <BillingHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  )
}
