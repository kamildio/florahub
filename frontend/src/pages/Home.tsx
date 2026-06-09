import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight, Camera, Flower, Flower2, Gift, Heart, Package, Search,
  ShieldCheck, Sparkles, Sprout, Store, Truck, type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BouquetImage } from '@/components/ui/BouquetImage'
import { ProductCard } from '@/components/product/ProductCard'
import { categories, products } from '@/data/mock'
import { useCity } from '@/store/useCity'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = { Flower, Flower2, Package, Heart, Gift, Sprout }

export function Home() {
  const { t } = useTranslation()
  const { lz } = useLocale()
  const { cityId } = useCity()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const cityProducts = products.filter((p) => p.cityIds.includes(cityId))
  const featured = cityProducts.slice(0, 8)

  const popularChips = ['25 роз', 'Пионы', 'День рождения', 'Букет невесты']

  const trust = [
    { icon: Sparkles, title: t('home.trust1Title'), text: t('home.trust1Text') },
    { icon: Camera, title: t('home.trust2Title'), text: t('home.trust2Text') },
    { icon: Store, title: t('home.trust3Title'), text: t('home.trust3Text') },
    { icon: ShieldCheck, title: t('home.trust4Title'), text: t('home.trust4Text') },
  ]

  return (
    <div>
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden floral-mesh">
        <div className="container relative grid gap-12 py-14 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-soft">
              <Truck className="h-4 w-4" /> {t('home.heroBadge')}
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              {t('home.heroSubtitle')}
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); navigate(`/catalog?q=${encodeURIComponent(query)}`) }}
              className="mt-7 flex max-w-lg items-center gap-2 rounded-full border border-border bg-card p-2 shadow-soft"
            >
              <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('common.search')}
                aria-label={t('common.search')}
                className="h-10 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <Button type="submit" size="md" className="shrink-0">
                {t('common.searchShort')}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {popularChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => navigate(`/catalog?q=${encodeURIComponent(chip)}`)}
                  className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="mt-9 flex gap-8">
              {[
                { value: '120+', label: t('home.statsFlorists') },
                { value: '8 500+', label: t('home.statsBouquets') },
                { value: '3', label: t('home.statsCities') },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display text-2xl font-bold text-foreground tabular">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual collage */}
          <div className="relative hidden lg:block">
            <HeroCollage />
          </div>
        </div>
      </section>

      {/* ───── Categories ───── */}
      <section className="container py-14">
        <SectionHeading title={t('home.categoriesTitle')} subtitle={t('home.categoriesSubtitle')} to="/catalog" />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => {
            const Icon = iconMap[c.icon] ?? Flower2
            return (
              <Link
                key={c.id}
                to={`/catalog?category=${c.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold leading-tight">{lz(c.name)}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ───── Featured ───── */}
      <section className="container py-6">
        <SectionHeading title={t('home.featuredTitle')} subtitle={t('home.featuredSubtitle')} to="/catalog" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ───── Trust ───── */}
      <section className="container py-16">
        <h2 className="text-center font-display text-3xl font-bold">{t('home.trustTitle')}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-soft">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Seller CTA ───── */}
      <section className="container pb-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary-foreground px-8 py-14 text-center text-primary-foreground sm:px-16">
          <div className="floral-mesh absolute inset-0 opacity-40" aria-hidden />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              <Store className="h-4 w-4" /> FloraHub for business
            </span>
            <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">{t('home.sellerCtaTitle')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">{t('home.sellerCtaText')}</p>
            <Button asChild variant="accent" size="lg" className="mt-7">
              <Link to="/seller">
                {t('home.sellerCtaButton')} <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function SectionHeading({ title, subtitle, to }: { title: string; subtitle?: string; to?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex">
          {t('common.viewAll')} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

function HeroCollage() {
  const { lz } = useLocale()
  const picks = products.slice(0, 3)
  return (
    <div className="relative mx-auto h-[460px] w-full max-w-md">
      <FloatingCard product={picks[0]} className="left-0 top-6 w-52 rotate-[-4deg]" delay="0s" label={lz(picks[0].name)} />
      <FloatingCard product={picks[1]} className="right-0 top-0 w-44 rotate-[5deg]" delay="-2s" label={lz(picks[1].name)} />
      <FloatingCard product={picks[2]} className="bottom-2 left-12 w-56 rotate-[2deg]" delay="-4s" label={lz(picks[2].name)} />
    </div>
  )
}

function FloatingCard({ product, className, delay, label }: { product: typeof products[number]; className: string; delay: string; label: string }) {
  return (
    <div className={cn('absolute overflow-hidden rounded-3xl border border-border bg-card shadow-soft animate-float', className)} style={{ animationDelay: delay }}>
      <BouquetImage src={product.image} alt={label} id={product.id} className="aspect-[4/5] w-full" />
    </div>
  )
}
