import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flower2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="container grid min-h-[60vh] place-items-center py-12 text-center">
      <div>
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary">
          <Flower2 className="h-10 w-10" />
        </span>
        <p className="mt-6 font-display text-6xl font-bold text-primary">404</p>
        <p className="mt-2 text-lg text-muted-foreground">{t('catalog.empty')}</p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/">FloraHub</Link>
        </Button>
      </div>
    </div>
  )
}
