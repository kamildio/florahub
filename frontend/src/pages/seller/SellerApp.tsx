import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, LayoutDashboard, Receipt } from 'lucide-react'
import { ConsoleLayout, type ConsoleNavItem } from '@/components/console/ConsoleLayout'
import { sellerIncoming } from '@/data/mock'
import { SellerDashboard } from './SellerDashboard'
import { SellerOrders } from './SellerOrders'
import { SellerSales } from './SellerSales'

const keyByPath: Record<string, string> = {
  '/seller': 'dashboard',
  '/seller/orders': 'incomingOrders',
  '/seller/sales': 'salesHistory',
}

export function SellerApp() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const pending = sellerIncoming.filter((o) => o.status === 'pending').length

  const nav: ConsoleNavItem[] = [
    { to: '/seller', label: t('seller.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/seller/orders', label: t('seller.incomingOrders'), icon: Inbox, badge: pending },
    { to: '/seller/sales', label: t('seller.salesHistory'), icon: Receipt },
  ]

  const key = keyByPath[pathname] ?? 'dashboard'

  return (
    <ConsoleLayout title={t(`seller.${key}`)} subtitle={t('seller.title')} nav={nav} accent="accent">
      <Routes>
        <Route index element={<SellerDashboard />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="sales" element={<SellerSales />} />
        <Route path="*" element={<Navigate to="/seller" replace />} />
      </Routes>
    </ConsoleLayout>
  )
}
