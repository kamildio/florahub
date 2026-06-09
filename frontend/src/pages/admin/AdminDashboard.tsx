import { useTranslation } from 'react-i18next'
import { Building2, DollarSign, ShoppingCart, Store } from 'lucide-react'
import { StatCard } from '@/components/console/ConsoleLayout'
import { StatusBadge } from '@/components/order/StatusBadge'
import { cities, products, seedOrders, sellerIncoming, sellers } from '@/data/mock'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, formatPrice } from '@/lib/utils'

const revenueByMonth = [
  { m: 'Янв', v: 4.2 }, { m: 'Фев', v: 5.1 }, { m: 'Мар', v: 8.9 },
  { m: 'Апр', v: 6.4 }, { m: 'Май', v: 7.8 }, { m: 'Июн', v: 9.6 },
]

export function AdminDashboard() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const max = Math.max(...revenueByMonth.map((r) => r.v))
  const recent = [...sellerIncoming, ...seedOrders].slice(0, 6)
  const activeCities = cities.filter((c) => c.active).length
  const activeSellers = sellers.filter((s) => s.verified).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('admin.revenue')} value="9.6M ₸" hint="+18% " icon={DollarSign} tone="success" />
        <StatCard label={t('admin.totalOrders')} value="1 284" hint="+12%" icon={ShoppingCart} tone="primary" />
        <StatCard label={t('admin.activeSellers')} value={String(activeSellers)} icon={Store} tone="accent" />
        <StatCard label={t('admin.activeCities')} value={String(activeCities)} icon={Building2} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Revenue chart */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold">{t('admin.revenue')}</h2>
          <div className="mt-6 flex items-end justify-between gap-3">
            {revenueByMonth.map((r) => (
              <div key={r.m} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary to-secondary transition-all duration-500 hover:opacity-80"
                    style={{ height: `${Math.max(6, (r.v / max) * 100)}%` }}
                    title={`${r.v}M ₸`}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{r.m}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top products */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold">{t('home.featuredTitle')}</h2>
          <ul className="mt-4 space-y-3">
            {products.slice(0, 4).map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold tabular">{i + 1}</span>
                <img src={p.image} alt={lz(p.name)} className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{lz(p.name)}</span>
                <span className="text-sm font-bold tabular">{formatPrice(p.price, intlLocale)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent orders */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="font-bold">{t('admin.recentOrders')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-semibold">{t('seller.order')}</th>
                <th className="px-5 py-3 font-semibold">{t('seller.client')}</th>
                <th className="px-5 py-3 font-semibold">{t('admin.status')}</th>
                <th className="px-5 py-3 text-right font-semibold">{t('seller.amount')}</th>
                <th className="hidden px-5 py-3 text-right font-semibold sm:table-cell">{t('seller.date')}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-bold tabular">{o.number}</td>
                  <td className="px-5 py-3">{o.recipient.name}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right font-semibold tabular">{formatPrice(o.total, intlLocale)}</td>
                  <td className="hidden px-5 py-3 text-right text-muted-foreground sm:table-cell">{formatDate(o.createdAt, intlLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
