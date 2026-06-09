import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DollarSign, Inbox, ShoppingCart, Star } from 'lucide-react'
import { StatCard } from '@/components/console/ConsoleLayout'
import { StatusBadge } from '@/components/order/StatusBadge'
import { Button } from '@/components/ui/Button'
import { sellerIncoming, sellers } from '@/data/mock'
import { useLocale } from '@/hooks/useLocale'
import { formatPrice } from '@/lib/utils'

const weekly = [3, 5, 4, 7, 6, 9, 8]
const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function SellerDashboard() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const seller = sellers[0]
  const max = Math.max(...weekly)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('seller.todayOrders')} value="6" hint="+2" icon={ShoppingCart} tone="primary" />
        <StatCard label={t('seller.todayRevenue')} value="142K ₸" hint="+18%" icon={DollarSign} tone="success" />
        <StatCard label={t('seller.incomingOrders')} value={String(sellerIncoming.length)} icon={Inbox} tone="accent" />
        <StatCard label={t('seller.rating')} value={seller.rating.toFixed(1)} icon={Star} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold">{t('seller.salesHistory')}</h2>
          <div className="mt-6 flex items-end justify-between gap-3">
            {weekly.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-accent to-accent/40 transition-all duration-500" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{t('seller.incomingOrders')}</h2>
            <Button asChild variant="ghost" size="sm"><Link to="/seller/orders">{t('common.viewAll')}</Link></Button>
          </div>
          <ul className="mt-4 space-y-3">
            {sellerIncoming.map((o) => (
              <li key={o.id} className="flex items-center gap-3">
                <img src={o.items[0].product.image} alt={lz(o.items[0].product.name)} className="h-11 w-11 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{o.number}</p>
                  <StatusBadge status={o.status} />
                </div>
                <span className="text-sm font-bold tabular">{formatPrice(o.total, intlLocale)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
