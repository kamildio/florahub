import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Phone, RotateCcw, Store, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/order/StatusBadge'
import { OrderTimeline } from '@/components/order/OrderTimeline'
import { sellers } from '@/data/mock'
import { useAuth } from '@/store/useAuth'
import { useCart } from '@/store/useCart'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, formatPrice } from '@/lib/utils'
import { NotFound } from './NotFound'
import { LoginGate } from './LoginGate'

export function OrderDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const orders = useAuth((s) => s.orders)
  const addToCart = useCart((s) => s.add)

  if (!user) return <LoginGate />
  const order = orders.find((o) => o.id === id)
  if (!order) return <NotFound />

  const seller = sellers.find((s) => s.id === order.sellerId)

  const repeat = () => {
    order.items.forEach((i) => addToCart(i.product, i.quantity))
    navigate('/cart')
  }

  return (
    <div className="container py-8 lg:py-12">
      <Link to="/profile#orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t('nav.orders')}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{t('order.number')} {order.number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <Button variant="outline" onClick={repeat}>
          <RotateCcw className="h-4 w-4" /> {t('order.repeat')}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('order.placedOn')}: {formatDate(order.createdAt, intlLocale)}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {/* Tracking */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-5 text-lg font-bold">{t('order.trackTitle')}</h2>
            <OrderTimeline order={order} />
          </section>

          {/* Items */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-bold">{t('order.details')}</h2>
            <ul className="divide-y divide-border">
              {order.items.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <Link to={`/product/${product.slug}`} className="shrink-0">
                    <img src={product.image} alt={lz(product.name)} loading="lazy" className="h-16 w-16 rounded-xl object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${product.slug}`} className="font-semibold hover:text-primary">{lz(product.name)}</Link>
                    <p className="text-sm text-muted-foreground">× {quantity}</p>
                  </div>
                  <span className="font-semibold tabular">{formatPrice(product.price * quantity, intlLocale)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Side info */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-3 font-bold">{t('checkout.recipient')}</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5"><UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" /> {order.recipient.name}</li>
              <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 shrink-0 text-muted-foreground" /> <span className="tabular">{order.recipient.phone}</span></li>
              <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {order.recipient.address}</li>
            </ul>
          </div>

          {seller && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-3 font-bold">{t('product.by')}</h3>
              <div className="flex items-center gap-2.5 text-sm">
                <Store className="h-4 w-4 text-primary" /> <span className="font-semibold">{seller.name}</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold">{t('cart.total')}</span>
              <span className="font-display text-2xl font-bold tabular">{formatPrice(order.total, intlLocale)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
