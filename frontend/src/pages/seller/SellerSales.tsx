import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/order/StatusBadge'
import { seedOrders } from '@/data/mock'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, formatPrice } from '@/lib/utils'

// Completed sales for the demo florist (Studio Bloom).
const sales = seedOrders.filter((o) => o.sellerId === 's1' && o.status === 'completed')
  .concat(seedOrders.filter((o) => o.status === 'completed'))

export function SellerSales() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const total = sales.reduce((s, o) => s + o.total, 0)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">{t('admin.revenue')}</p>
        <p className="mt-1 font-display text-3xl font-bold tabular">{formatPrice(total, intlLocale)}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-semibold">{t('seller.order')}</th>
                <th className="px-5 py-3 font-semibold">{t('product.description')}</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">{t('seller.client')}</th>
                <th className="px-5 py-3 font-semibold">{t('admin.status')}</th>
                <th className="hidden px-5 py-3 text-right font-semibold md:table-cell">{t('seller.date')}</th>
                <th className="px-5 py-3 text-right font-semibold">{t('seller.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((o, idx) => (
                <tr key={o.id + idx} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-bold tabular">{o.number}</td>
                  <td className="px-5 py-3 text-muted-foreground">{o.items.map((i) => lz(i.product.name)).join(', ')}</td>
                  <td className="hidden px-5 py-3 sm:table-cell">{o.recipient.name}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="hidden px-5 py-3 text-right text-muted-foreground md:table-cell">{formatDate(o.createdAt, intlLocale)}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular">{formatPrice(o.total, intlLocale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
