import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Plus, Star } from 'lucide-react'
import type { Product } from '@/lib/types'
import { BouquetImage } from '@/components/ui/BouquetImage'
import { Badge } from '@/components/ui/Badge'
import { useCart } from '@/store/useCart'
import { useLocale } from '@/hooks/useLocale'
import { formatPrice, cn } from '@/lib/utils'

const tagTone = { new: 'primary', bestseller: 'accent', sale: 'destructive', premium: 'warning' } as const

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const add = useCart((s) => s.add)
  const inCart = useCart((s) => s.items.some((i) => i.product.id === product.id))

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link to={`/product/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden">
        <BouquetImage
          src={product.image}
          alt={lz(product.name)}
          id={product.id}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.tags.map((tag) => (
            <Badge key={tag} tone={tagTone[tag]} className="capitalize backdrop-blur-sm">
              {t(`product.${tag}`, { defaultValue: tag })}
            </Badge>
          ))}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
            <span className="rounded-full bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground">
              {t('common.outOfStock')}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
          <span>· {product.reviews} {t('common.reviews')}</span>
        </div>
        <Link to={`/product/${product.slug}`} className="line-clamp-2 font-semibold leading-snug text-foreground transition-colors hover:text-primary">
          {lz(product.name)}
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            {product.oldPrice && (
              <span className="block text-xs text-muted-foreground line-through tabular">
                {formatPrice(product.oldPrice, intlLocale)}
              </span>
            )}
            <span className="text-lg font-bold text-foreground tabular">
              {formatPrice(product.price, intlLocale)}
            </span>
          </div>
          <button
            disabled={!product.inStock}
            onClick={() => add(product)}
            aria-label={t('product.addToCart')}
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-90 cursor-pointer disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              inCart ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {inCart ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </article>
  )
}
