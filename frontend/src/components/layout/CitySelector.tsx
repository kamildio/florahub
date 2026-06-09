import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { cities } from '@/data/mock'
import { useCity } from '@/store/useCity'
import { useLocale } from '@/hooks/useLocale'

export function CitySelector({ compact = false }: { compact?: boolean }) {
  const { cityId, setCity } = useCity()
  const { lz } = useLocale()
  const { t } = useTranslation()
  const active = cities.filter((c) => c.active)
  const current = cities.find((c) => c.id === cityId) ?? active[0]

  return (
    <Dropdown
      align="start"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('nav.selectCity')}
        >
          <MapPin className="h-4 w-4 text-accent" />
          {!compact && <span className="max-w-[8rem] truncate">{lz(current.name)}</span>}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nav.selectCity')}
          </p>
          {active.map((c) => (
            <DropdownItem
              key={c.id}
              active={c.id === cityId}
              onClick={() => {
                setCity(c.id)
                close()
              }}
            >
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{lz(c.name)}</span>
              {c.id === cityId && <Check className="h-4 w-4 text-primary" />}
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  )
}
