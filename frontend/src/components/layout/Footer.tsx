import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, Instagram, Send, Phone } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  const columns = [
    {
      title: t('footer.company'),
      links: [
        { label: t('footer.aboutUs'), to: '/' },
        { label: t('footer.careers'), to: '/' },
        { label: t('footer.contacts'), to: '/' },
      ],
    },
    {
      title: t('footer.forBusiness'),
      links: [
        { label: t('footer.becomeSeller'), to: '/seller' },
        { label: t('nav.admin'), to: '/admin' },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { label: t('footer.help'), to: '/' },
        { label: t('footer.delivery'), to: '/' },
        { label: t('footer.terms'), to: '/' },
        { label: t('footer.privacy'), to: '/' },
      ],
    },
  ]

  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="container grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {t('footer.aboutText')}
          </p>
          <div className="mt-5 flex items-center gap-2">
            {[Instagram, Send, Phone].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                aria-label="social link"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-sm font-bold text-foreground">{col.title}</h4>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-2 py-5 text-sm text-muted-foreground sm:flex-row">
          <p>© {year} FloraHub. {t('footer.rights')}.</p>
          <p className="inline-flex items-center gap-1.5">
            {t('footer.madeWith')} <Heart className="h-4 w-4 fill-accent text-accent" />
          </p>
        </div>
      </div>
    </footer>
  )
}
