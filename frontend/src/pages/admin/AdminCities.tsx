import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cities as seed } from '@/data/mock'
import { useLocale } from '@/hooks/useLocale'
import type { City } from '@/lib/types'

export function AdminCities() {
  const { t } = useTranslation()
  const { lz } = useLocale()
  const [rows, setRows] = useState<City[]>(seed.map((c) => ({ ...c })))
  const [adding, setAdding] = useState(false)

  const toggle = (id: string) => setRows((rs) => rs.map((c) => (c.id === id ? { ...c, active: !c.active } : c)))
  const makePrimary = (id: string) => setRows((rs) => rs.map((c) => ({ ...c, primary: c.id === id })))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('admin.activeCities')}: {rows.filter((c) => c.active).length}</p>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {t('admin.addCity')}</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              {c.primary && <Badge tone="accent"><Star className="h-3 w-3 fill-current" /> {t('admin.primaryCity')}</Badge>}
            </div>
            <h3 className="mt-4 text-lg font-bold">{lz(c.name)}</h3>
            <p className="text-sm text-muted-foreground">/{c.slug}</p>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => toggle(c.id)}
                role="switch"
                aria-checked={c.active}
                className={`relative h-6 w-11 rounded-full transition-colors ${c.active ? 'bg-primary' : 'bg-border'}`}
                aria-label={t('admin.cityActive')}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${c.active ? 'translate-x-[1.4rem]' : 'translate-x-0.5'}`} />
              </button>
              <div className="flex items-center gap-1">
                {!c.primary && (
                  <button onClick={() => makePrimary(c.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-warning" aria-label={t('admin.primaryCity')}>
                    <Star className="h-4 w-4" />
                  </button>
                )}
                {!c.primary && (
                  <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== c.id))} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={t('common.delete')}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <AddCityModal
          onClose={() => setAdding(false)}
          onSave={(city) => { setRows((rs) => [...rs, city]); setAdding(false) }}
          index={rows.length}
        />
      )}
    </div>
  )
}

function AddCityModal({ onClose, onSave, index }: { onClose: () => void; onSave: (c: City) => void; index: number }) {
  const { t } = useTranslation()
  const [name, setName] = useState({ ru: '', kk: '', en: '' })
  const [slug, setSlug] = useState('')

  return (
    <Modal
      open
      onClose={onClose}
      title={t('admin.addCity')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            disabled={!name.ru || !slug}
            onClick={() => onSave({ id: 'c' + (index + 1), slug, name: { ru: name.ru, kk: name.kk || name.ru, en: name.en || name.ru }, active: true })}
          >
            {t('common.add')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="c-ru">{t('admin.cityName')} (RU)</Label>
            <Input id="c-ru" value={name.ru} onChange={(e) => setName({ ...name, ru: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="c-kk">ҚАЗ</Label>
            <Input id="c-kk" value={name.kk} onChange={(e) => setName({ ...name, kk: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="c-en">EN</Label>
            <Input id="c-en" value={name.en} onChange={(e) => setName({ ...name, en: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="c-slug">{t('admin.citySlug')}</Label>
          <Input id="c-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="taraz" />
        </div>
      </div>
    </Modal>
  )
}
