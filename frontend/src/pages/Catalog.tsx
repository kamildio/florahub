import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flower2, SlidersHorizontal, X } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/Button'
import { categories, products } from '@/data/mock'
import { useCity } from '@/store/useCity'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/utils'

type Sort = 'popular' | 'priceAsc' | 'priceDesc' | 'new'

export function Catalog() {
  const { t } = useTranslation()
  const { lz } = useLocale()
  const { cityId } = useCity()
  const [params, setParams] = useSearchParams()
  const [sort, setSort] = useState<Sort>('popular')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const query = params.get('q')?.toLowerCase() ?? ''
  const activeCategory = params.get('category') ?? ''

  const setCategory = (slug: string) => {
    const next = new URLSearchParams(params)
    if (slug) next.set('category', slug)
    else next.delete('category')
    setParams(next)
  }

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.cityIds.includes(cityId))
    if (activeCategory) {
      const cat = categories.find((c) => c.slug === activeCategory)
      if (cat) list = list.filter((p) => p.categoryId === cat.id)
    }
    if (query) {
      list = list.filter((p) =>
        Object.values(p.name).some((n) => n.toLowerCase().includes(query)) ||
        Object.values(p.description).some((d) => d.toLowerCase().includes(query)),
      )
    }
    const sorted = [...list]
    if (sort === 'priceAsc') sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'priceDesc') sorted.sort((a, b) => b.price - a.price)
    else if (sort === 'new') sorted.sort((a, b) => Number(b.tags.includes('new')) - Number(a.tags.includes('new')))
    else sorted.sort((a, b) => b.reviews - a.reviews)
    return sorted
  }, [cityId, activeCategory, query, sort])

  const Filters = (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold">{t('catalog.categories')}</h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setCategory('')}
            className={cn(
              'rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer',
              !activeCategory ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t('common.all')}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.slug)}
              className={cn(
                'rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer',
                activeCategory === c.slug ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {lz(c.name)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="container py-8 lg:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{t('catalog.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('catalog.results', { count: filtered.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="sr-only">{t('catalog.sortBy')}</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-11 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <option value="popular">{t('catalog.sortPopular')}</option>
            <option value="priceAsc">{t('catalog.sortPriceAsc')}</option>
            <option value="priceDesc">{t('catalog.sortPriceDesc')}</option>
            <option value="new">{t('catalog.sortNew')}</option>
          </select>
          <Button variant="outline" size="md" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" /> {t('catalog.filters')}
          </Button>
        </div>
      </div>

      {query && (
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground">
          «{params.get('q')}»
          <button onClick={() => { const n = new URLSearchParams(params); n.delete('q'); setParams(n) }} aria-label={t('catalog.clear')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block">{Filters}</aside>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
            <Flower2 className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">{t('catalog.empty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('catalog.emptyHint')}</p>
          </div>
        )}
      </div>

      {/* Mobile filters drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-background p-6 shadow-soft animate-fade-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t('catalog.filters')}</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label={t('common.close')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            {Filters}
            <Button className="mt-6 w-full" onClick={() => setFiltersOpen(false)}>
              {t('catalog.results', { count: filtered.length })}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
