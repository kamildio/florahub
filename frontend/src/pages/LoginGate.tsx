import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Shown on protected pages when the visitor isn't authenticated. */
export function LoginGate() {
  const { t } = useTranslation()
  return (
    <div className="container grid min-h-[60vh] place-items-center py-12 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-8 w-8" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">{t('auth.loginTitle')}</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/login">{t('nav.login')}</Link>
        </Button>
      </div>
    </div>
  )
}
