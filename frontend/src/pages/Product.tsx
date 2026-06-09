import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Check, ChevronRight, Minus, Plus, ShieldCheck, Star, Truck } from 'lucide-react'
import { BouquetImage } from '@/components/ui/BouquetImage'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { RatingStars } from '@/components/product/RatingStars'
import { ProductCard } from '@/components/product/ProductCard'
import { NotFound } from './NotFound'
import { categories, products, sellers } from '@/data/mock'
import { useCart } from '@/store/useCart'
import { useLocale } from '@/hooks/useLocale'
import { formatPrice } from '@/lib/utils'

export function Product() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const navigate = useNavigate()
  const add = useCart((s) => s.add)
  const cartItem = useCart((s) => s.items.find((i) => i.product.slug === slug))
  const setQuantity = useCart((s) => s.setQuantity)

  const product = products.find((p) => p.slug === slug)
  if (!product) return <NotFound />

  const seller = sellers.find((s) => s.id === product.sellerId)
  const category = categories.find((c) => c.id === product.categoryId)
  const similar = products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4)
  const qty = cartItem?.quantity ?? 0

  return (
    <div className="container py-6 lg:py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="breadcrumb">
        <Link to="/" className="hover:text-primary">FloraHub</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/catalog" className="hover:text-primary">{t('nav.catalog')}</Link>
        {category && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/catalog?category=${category.slug}`} className="hover:text-primary">{lz(category.name)}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <BouquetImage src={product.image} alt={lz(product.name)} id={product.id} className="aspect-square w-full" />
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag} tone={tag === 'sale' ? 'destructive' : tag === 'premium' ? 'warning' : 'primary'} className="capitalize">
                {t(`product.${tag}`, { defaultValue: tag })}
              </Badge>
            ))}
          </div>

          <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{lz(product.name)}</h1>

          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <RatingStars value={product.rating} />
              <span className="text-sm font-semibold">{product.rating.toFixed(1)}</span>
            </span>
            <span className="text-sm text-muted-foreground">· {product.reviews} {t('common.reviews')}</span>
          </div>

          {seller && (
            <Link to="/catalog" className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {seller.name.slice(0, 2)}
              </span>
              <span className="font-semibold">{seller.name}</span>
              {seller.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
              <span className="text-muted-foreground">· <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {seller.rating}</span>
            </Link>
          )}

          <div className="mt-6 flex items-end gap-3">
            <span className="font-display text-4xl font-bold tabular">{formatPrice(product.price, intlLocale)}</span>
            {product.oldPrice && (
              <span className="pb-1 text-lg text-muted-foreground line-through tabular">{formatPrice(product.oldPrice, intlLocale)}</span>
            )}
          </div>

          {/* Add to cart / quantity */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {qty === 0 ? (
              <Button size="lg" className="flex-1" disabled={!product.inStock} onClick={() => add(product)}>
                <Plus className="h-5 w-5" /> {product.inStock ? t('product.addToCart') : t('common.outOfStock')}
              </Button>
            ) : (
              <div className="flex flex-1 items-center justify-between rounded-full border border-primary bg-primary/5 px-2 py-1.5">
                <button onClick={() => setQuantity(product.id, qty - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-card text-foreground hover:bg-muted cursor-pointer" aria-label="−">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-bold tabular">{qty} {t('common.perItem')}</span>
                <button onClick={() => setQuantity(product.id, qty + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer" aria-label="+">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
            <Button
              size="lg"
              variant="accent"
              className="flex-1"
              disabled={!product.inStock}
              onClick={() => { if (qty === 0) add(product); navigate('/checkout') }}
            >
              {t('product.buyNow')}
            </Button>
          </div>

          {qty > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <Check className="h-4 w-4" /> {t('product.inCart')}
            </p>
          )}

          {/* Description */}
          <div className="mt-8 space-y-4">
            <div>
              <h2 className="mb-2 font-bold">{t('product.description')}</h2>
              <p className="leading-relaxed text-muted-foreground">{lz(product.description)}</p>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-semibold">{t('product.delivery')}</p>
                <p className="text-muted-foreground">{t('product.deliveryText')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-semibold">{t('home.trust2Title')}</p>
                <p className="text-muted-foreground">{t('home.trust2Text')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold">{t('product.similar')}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
