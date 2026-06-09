import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, LayoutDashboard, ListOrdered, Tag } from 'lucide-react'
import { ConsoleLayout, type ConsoleNavItem } from '@/components/console/ConsoleLayout'
import { AdminDashboard } from './AdminDashboard'
import { AdminCatalog } from './AdminCatalog'
import { AdminCities } from './AdminCities'
import { AdminOrders } from './AdminOrders'

const titles: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/catalog': 'catalog',
  '/admin/cities': 'cities',
  '/admin/orders': 'orders',
}

export function AdminApp() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const nav: ConsoleNavItem[] = [
    { to: '/admin', label: t('admin.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/admin/catalog', label: t('admin.catalog'), icon: Tag },
    { to: '/admin/cities', label: t('admin.cities'), icon: Building2 },
    { to: '/admin/orders', label: t('admin.orders'), icon: ListOrdered },
  ]

  const key = titles[pathname] ?? 'dashboard'

  return (
    <ConsoleLayout title={t(`admin.${key}`)} subtitle={t('admin.title')} nav={nav}>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="catalog" element={<AdminCatalog />} />
        <Route path="cities" element={<AdminCities />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </ConsoleLayout>
  )
}
