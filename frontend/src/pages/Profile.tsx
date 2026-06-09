import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, Package, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { StatusBadge } from '@/components/order/StatusBadge'
import { cities } from '@/data/mock'
import { useAuth } from '@/store/useAuth'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, formatPrice, maskPhone, cn } from '@/lib/utils'
import type { Order } from '@/lib/types'
import { LoginGate } from './LoginGate'

export function Profile() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const user = useAuth((s) => s.user)
  const orders = useAuth((s) => s.orders)
  const login = useAuth((s) => s.login)
  const [name, setName] = useState(user?.name ?? '')
  const [city, setCity] = useState(user?.city ?? 'c1')
  const [saved, setSaved] = useState(false)

  if (!user) return <LoginGate />

  const current = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
  const history = orders.filter((o) => o.status === 'completed' || o.status === 'cancelled')

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    login({ ...user, name, city })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="container py-8 lg:py-12">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('profile.title')}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
        {/* Personal info */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UserIcon className="h-7 w-7" />
              </span>
              <div>
                <p className="font-bold">{name || t('profile.title')}</p>
                <p className="text-sm text-muted-foreground tabular">{maskPhone(user.phone)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="pname">{t('profile.name')}</Label>
                <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="pphone">{t('profile.phone')}</Label>
                <Input id="pphone" value={user.phone} readOnly className="bg-muted/50 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="pcity">{t('profile.city')}</Label>
                <select
                  id="pcity"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  {cities.filter((c) => c.active).map((c) => (
                    <option key={c.id} value={c.id}>{lz(c.name)}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" className="mt-5 w-full">
              {saved ? <><Check className="h-4 w-4" /> {t('profile.saved')}</> : t('common.save')}
            </Button>
          </form>
        </aside>

        {/* Orders */}
        <div className="space-y-10" id="orders">
          <OrderGroup title={t('profile.currentOrders')} orders={current} empty={false} lz={lz} intlLocale={intlLocale} />

          {orders.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-semibold">{t('profile.noOrders')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('profile.noOrdersHint')}</p>
              <Button asChild className="mt-5"><Link to="/catalog">{t('cart.goToCatalog')}</Link></Button>
            </div>
          ) : (
            <OrderGroup title={t('profile.orderHistory')} orders={history} empty lz={lz} intlLocale={intlLocale} />
          )}
        </div>
      </div>
    </div>
  )
}

function OrderGroup({
  title, orders, empty, lz, intlLocale,
}: {
  title: string
  orders: Order[]
  empty: boolean
  lz: (v: Record<'kk' | 'ru' | 'en', string>) => string
  intlLocale: string
}) {
  const { t } = useTranslation()
  if (orders.length === 0 && empty) return null
  if (orders.length === 0) return null
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              to={`/order/${order.id}`}
              className={cn(
                'flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft',
              )}
            >
              <div className="flex -space-x-3">
                {order.items.slice(0, 2).map(({ product }) => (
                  <img key={product.id} src={product.image} alt={lz(product.name)} loading="lazy"
                    className="h-14 w-14 rounded-xl border-2 border-card object-cover"
                    onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E' }} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold tabular">{order.number}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {order.items.map((i) => lz(i.product.name)).join(', ')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('order.placedOn')}: {formatDate(order.createdAt, intlLocale)}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="font-bold tabular">{formatPrice(order.total, intlLocale)}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
