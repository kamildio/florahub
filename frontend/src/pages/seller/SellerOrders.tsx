import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Inbox, MapPin, Phone, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/order/StatusBadge'
import { sellerIncoming } from '@/data/mock'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Order, OrderStatus } from '@/lib/types'

// Which status an action advances to, and the i18n key for its button.
const nextAction: Partial<Record<OrderStatus, { to: OrderStatus; key: string }>> = {
  accepted: { to: 'assembling', key: 'seller.markAssembling' },
  assembling: { to: 'delivering', key: 'seller.markDelivering' },
  delivering: { to: 'completed', key: 'seller.markCompleted' },
}

export function SellerOrders() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const [orders, setOrders] = useState<Order[]>(sellerIncoming.map((o) => ({ ...o, timeline: [...o.timeline] })))

  const advance = (id: string, to: OrderStatus) =>
    setOrders((os) =>
      os.map((o) =>
        o.id === id
          ? { ...o, status: to, timeline: [...o.timeline, { status: to, at: new Date().toISOString() }] }
          : o,
      ),
    )

  const active = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'completed')

  if (active.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-semibold">{t('seller.noIncoming')}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {active.map((o) => {
        const action = nextAction[o.status]
        return (
          <div key={o.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold tabular">{o.number}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {formatDate(o.deliveryAt, intlLocale)}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>

            <div className="mt-4 flex gap-3">
              <img src={o.items[0].product.image} alt="" className="h-16 w-16 rounded-xl object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                {o.items.map((i) => (
                  <p key={i.product.id} className="truncate text-sm font-medium">{lz(i.product.name)} × {i.quantity}</p>
                ))}
                <p className="mt-1 font-bold tabular">{formatPrice(o.total, intlLocale)}</p>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5 rounded-xl bg-muted/40 p-3 text-sm">
              <li className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /> {o.recipient.name}</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> <span className="tabular">{o.recipient.phone}</span></li>
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {o.recipient.address}</li>
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {o.status === 'pending' ? (
                <>
                  <Button className="flex-1" onClick={() => advance(o.id, 'accepted')}>{t('seller.accept')}</Button>
                  <Button variant="outline" onClick={() => advance(o.id, 'cancelled')}>{t('seller.decline')}</Button>
                </>
              ) : action ? (
                <Button variant="accent" className="flex-1" onClick={() => advance(o.id, action.to)}>{t(action.key)}</Button>
              ) : null}
              <Button asChild variant="outline">
                <a href={`tel:${o.recipient.phone}`}>{t('seller.callClient')}</a>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
