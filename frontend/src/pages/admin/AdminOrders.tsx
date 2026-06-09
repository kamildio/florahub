import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/order/StatusBadge'
import { cities, seedOrders, sellerIncoming, sellers } from '@/data/mock'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, formatPrice, cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/types'

const ALL = [...sellerIncoming, ...seedOrders]
const statuses: (OrderStatus | 'all')[] = ['all', 'pending', 'accepted', 'assembling', 'delivering', 'completed']

export function AdminOrders() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const rows = useMemo(() => (filter === 'all' ? ALL : ALL.filter((o) => o.status === filter)), [filter])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer',
              filter === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {s === 'all' ? t('common.all') : t(`order.status.${s}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-semibold">{t('seller.order')}</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">{t('seller.client')}</th>
                <th className="hidden px-5 py-3 font-semibold lg:table-cell">{t('admin.seller')}</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">{t('profile.city')}</th>
                <th className="px-5 py-3 font-semibold">{t('admin.status')}</th>
                <th className="px-5 py-3 text-right font-semibold">{t('seller.amount')}</th>
                <th className="hidden px-5 py-3 text-right font-semibold xl:table-cell">{t('seller.date')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const seller = sellers.find((s) => s.id === o.sellerId)
                const city = cities.find((c) => c.id === o.cityId)
                return (
                  <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-bold tabular">{o.number}</td>
                    <td className="hidden px-5 py-3 sm:table-cell">{o.recipient.name}</td>
                    <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">{seller?.name}</td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">{city ? lz(city.name) : '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-right font-semibold tabular">{formatPrice(o.total, intlLocale)}</td>
                    <td className="hidden px-5 py-3 text-right text-muted-foreground xl:table-cell">{formatDate(o.createdAt, intlLocale)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
