import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, CreditCard, Loader2, Lock, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { useCart } from '@/store/useCart'
import { useAuth } from '@/store/useAuth'
import { useCity } from '@/store/useCity'
import { useLocale } from '@/hooks/useLocale'
import { formatPrice, cn } from '@/lib/utils'
import type { Order } from '@/lib/types'

export function Checkout() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const navigate = useNavigate()
  const { items, clear } = useCart()
  const subtotal = useCart((s) => s.subtotal())
  const deliveryFee = useCart((s) => s.deliveryFee())
  const total = useCart((s) => s.total())
  const user = useAuth((s) => s.user)
  const addOrder = useAuth((s) => s.addOrder)
  const { cityId } = useCity()

  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', address: '', time: '', comment: '' })
  const [payment, setPayment] = useState<'online' | 'delivery'>('online')
  const [loading, setLoading] = useState(false)
  const [placed, setPlaced] = useState<Order | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // Gate: require auth so the order is tied to a trackable account.
  if (!user) {
    return (
      <div className="container grid min-h-[60vh] place-items-center py-12 text-center">
        <div>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Lock className="h-8 w-8" /></span>
          <h1 className="mt-5 font-display text-2xl font-bold">{t('nav.login')}</h1>
          <p className="mt-2 max-w-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
          <Button asChild size="lg" className="mt-6"><Link to="/login">{t('nav.login')}</Link></Button>
        </div>
      </div>
    )
  }

  if (items.length === 0 && !placed) {
    navigate('/cart')
    return null
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const id = 'o' + Math.abs(hashStr(form.address + Date.now())).toString(36)
    const now = new Date().toISOString()
    const order: Order = {
      id,
      number: 'FH-' + String(100600 + items.length + form.name.length).padStart(6, '0'),
      createdAt: now,
      status: 'pending',
      total,
      items: [...items],
      cityId,
      sellerId: items[0]?.product.sellerId ?? 's1',
      recipient: { name: form.name, phone: form.phone, address: form.address },
      deliveryAt: form.time || now,
      timeline: [{ status: 'pending', at: now }],
    }
    try {
      const saved = await api.createOrder(order)
      addOrder(saved)
      clear()
      setPlaced(saved)
    } finally {
      setLoading(false)
    }
  }

  if (placed) {
    return (
      <div className="container grid min-h-[60vh] place-items-center py-12 text-center animate-fade-in">
        <div className="max-w-md">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-11 w-11" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold">{t('checkout.success')}</h1>
          <p className="mt-3 text-muted-foreground">{t('checkout.successText')}</p>
          <p className="mt-4 inline-block rounded-full bg-secondary px-4 py-1.5 font-bold text-secondary-foreground">{placed.number}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg"><Link to={`/order/${placed.id}`}>{t('checkout.viewOrder')}</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/catalog">{t('cart.goToCatalog')}</Link></Button>
          </div>
        </div>
      </div>
    )
  }

  const paymentOptions = [
    { id: 'online' as const, icon: CreditCard, label: t('checkout.payOnline') },
    { id: 'delivery' as const, icon: Wallet, label: t('checkout.payOnDelivery') },
  ]

  return (
    <div className="container py-8 lg:py-12">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('checkout.title')}</h1>

      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {/* Recipient */}
          <fieldset className="rounded-2xl border border-border bg-card p-6">
            <legend className="px-2 font-bold">{t('checkout.recipient')}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">{t('checkout.recipientName')} *</Label>
                <Input id="name" required value={form.name} onChange={set('name')} autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="rphone">{t('checkout.recipientPhone')} *</Label>
                <Input id="rphone" required type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+7 700 000 00 00" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">{t('checkout.address')} *</Label>
                <Input id="address" required value={form.address} onChange={set('address')} placeholder="ул., дом, кв." />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="time">{t('checkout.deliveryTime')}</Label>
                <Input id="time" type="datetime-local" value={form.time} onChange={set('time')} />
              </div>
            </div>
          </fieldset>

          {/* Payment */}
          <fieldset className="rounded-2xl border border-border bg-card p-6">
            <legend className="px-2 font-bold">{t('checkout.payment')}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPayment(opt.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors cursor-pointer',
                    payment === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  <opt.icon className={cn('h-5 w-5', payment === opt.id ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="comment">{t('checkout.comment')}</Label>
              <Textarea id="comment" rows={3} value={form.comment} onChange={set('comment')} />
            </div>
          </fieldset>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <ul className="space-y-3">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1">{lz(product.name)} × {quantity}</span>
                  <span className="shrink-0 font-semibold tabular">{formatPrice(product.price * quantity, intlLocale)}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 h-px bg-border" />
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('cart.subtotal')}</dt><dd className="font-semibold tabular">{formatPrice(subtotal, intlLocale)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('cart.delivery')}</dt><dd className="font-semibold tabular">{deliveryFee === 0 ? <span className="text-success">{t('cart.deliveryFree')}</span> : formatPrice(deliveryFee, intlLocale)}</dd></div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between"><dt className="text-base font-bold">{t('cart.total')}</dt><dd className="font-display text-2xl font-bold tabular">{formatPrice(total, intlLocale)}</dd></div>
            </dl>
            <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('checkout.place')}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  )
}

function hashStr(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
