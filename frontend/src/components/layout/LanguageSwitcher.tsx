import { Check, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { SUPPORTED_LOCALES } from '@/i18n'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = SUPPORTED_LOCALES.find((l) => l.code === i18n.language?.slice(0, 2)) ?? SUPPORTED_LOCALES[0]

  return (
    <Dropdown
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={current.label}
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{current.short}</span>
        </button>
      )}
    >
      {(close) =>
        SUPPORTED_LOCALES.map((l) => (
          <DropdownItem
            key={l.code}
            active={l.code === current.code}
            onClick={() => {
              void i18n.changeLanguage(l.code)
              close()
            }}
          >
            <span className="grid w-9 place-items-center rounded-md bg-muted py-0.5 text-xs font-bold">
              {l.short}
            </span>
            <span className="flex-1 text-left">{l.label}</span>
            {l.code === current.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownItem>
        ))
      }
    </Dropdown>
  )
}
