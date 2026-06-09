import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { BouquetImage } from '@/components/ui/BouquetImage'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/store/useCart'
import { useLocale } from '@/hooks/useLocale'
import { formatPrice } from '@/lib/utils'

export function Cart() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const { items, setQuantity, remove } = useCart()
  const subtotal = useCart((s) => s.subtotal())
  const deliveryFee = useCart((s) => s.deliveryFee())
  const total = useCart((s) => s.total())
  const count = items.reduce((n, i) => n + i.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="container grid min-h-[60vh] place-items-center py-12">
        <div className="text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-muted">
            <ShoppingBag className="h-9 w-9 text-muted-foreground" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">{t('cart.empty')}</h1>
          <p className="mt-2 text-muted-foreground">{t('cart.emptyHint')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/catalog">{t('cart.goToCatalog')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 lg:py-12">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('cart.title')}</h1>
      <p className="mt-1 text-muted-foreground">{count} {t('cart.items')}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-3">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
              <Link to={`/product/${product.slug}`} className="shrink-0 overflow-hidden rounded-xl">
                <BouquetImage src={product.image} alt={lz(product.name)} id={product.id} className="h-24 w-24 sm:h-28 sm:w-28" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/product/${product.slug}`} className="font-semibold leading-snug hover:text-primary">
                    {lz(product.name)}
                  </Link>
                  <button onClick={() => remove(product.id)} aria-label={t('cart.remove')} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
                <span className="mt-1 text-sm text-muted-foreground tabular">{formatPrice(product.price, intlLocale)}</span>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1 rounded-full border border-border p-1">
                    <button onClick={() => setQuantity(product.id, quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted cursor-pointer" aria-label="−">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular">{quantity}</span>
                    <button onClick={() => setQuantity(product.id, quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted cursor-pointer" aria-label="+">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-bold tabular">{formatPrice(product.price * quantity, intlLocale)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold">{t('cart.title')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
                <dd className="font-semibold tabular">{formatPrice(subtotal, intlLocale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('cart.delivery')}</dt>
                <dd className="font-semibold tabular">
                  {deliveryFee === 0 ? <span className="text-success">{t('cart.deliveryFree')}</span> : formatPrice(deliveryFee, intlLocale)}
                </dd>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <dt className="text-base font-bold">{t('cart.total')}</dt>
                <dd className="font-display text-2xl font-bold tabular">{formatPrice(total, intlLocale)}</dd>
              </div>
            </dl>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/checkout">{t('cart.checkout')}</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
