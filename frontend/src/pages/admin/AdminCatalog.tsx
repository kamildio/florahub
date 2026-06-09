import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { categories, products as seed, sellers } from '@/data/mock'
import { useLocale } from '@/hooks/useLocale'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/lib/types'

type Row = Pick<Product, 'id' | 'name' | 'price' | 'categoryId' | 'sellerId' | 'inStock' | 'image'>

export function AdminCatalog() {
  const { t } = useTranslation()
  const { lz, intlLocale } = useLocale()
  const [rows, setRows] = useState<Row[]>(seed.map((p) => ({ ...p })))
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [isNew, setIsNew] = useState(false)

  const filtered = rows.filter((r) => lz(r.name).toLowerCase().includes(query.toLowerCase()))

  const openNew = () => {
    setIsNew(true)
    setEditing({ id: 'new-' + rows.length, name: { kk: '', ru: '', en: '' }, price: 0, categoryId: categories[0].id, sellerId: sellers[0].id, inStock: true, image: '' })
  }

  const save = (row: Row) => {
    setRows((rs) => (isNew ? [{ ...row, id: 'p' + (rs.length + 1) }, ...rs] : rs.map((r) => (r.id === row.id ? row : r))))
    setEditing(null)
    setIsNew(false)
  }

  const toggleStock = (id: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, inStock: !r.inStock } : r)))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common.searchShort')} className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> {t('admin.addProduct')}</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-semibold">{t('admin.productName')}</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">{t('admin.category')}</th>
                <th className="hidden px-5 py-3 font-semibold lg:table-cell">{t('admin.seller')}</th>
                <th className="px-5 py-3 text-right font-semibold">{t('admin.price')}</th>
                <th className="px-5 py-3 text-center font-semibold">{t('admin.status')}</th>
                <th className="px-5 py-3 text-right font-semibold">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cat = categories.find((c) => c.id === r.categoryId)
                const seller = sellers.find((s) => s.id === r.sellerId)
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={r.image} alt="" className="h-10 w-10 rounded-lg object-cover" loading="lazy" />
                        <span className="font-medium">{lz(r.name)}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">{cat ? lz(cat.name) : '—'}</td>
                    <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">{seller?.name}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular">{formatPrice(r.price, intlLocale)}</td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => toggleStock(r.id)} className="cursor-pointer">
                        <Badge tone={r.inStock ? 'success' : 'muted'}>{r.inStock ? t('common.active') : t('common.inactive')}</Badge>
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setIsNew(false); setEditing(r) }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('common.edit')}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={t('common.delete')}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductModal
          row={editing}
          isNew={isNew}
          onClose={() => { setEditing(null); setIsNew(false) }}
          onSave={save}
        />
      )}
    </div>
  )
}

function ProductModal({ row, isNew, onClose, onSave }: { row: Row; isNew: boolean; onClose: () => void; onSave: (r: Row) => void }) {
  const { t } = useTranslation()
  const { lz } = useLocale()
  const [draft, setDraft] = useState<Row>(row)

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? t('admin.addProduct') : t('common.edit')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => onSave(draft)} disabled={!draft.name.ru || draft.price <= 0}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="pn-ru">{t('admin.productName')} (RU)</Label>
          <Input id="pn-ru" value={draft.name.ru} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, ru: e.target.value } })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pn-kk">Атауы (ҚАЗ)</Label>
            <Input id="pn-kk" value={draft.name.kk} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, kk: e.target.value } })} />
          </div>
          <div>
            <Label htmlFor="pn-en">Name (EN)</Label>
            <Input id="pn-en" value={draft.name.en} onChange={(e) => setDraft({ ...draft, name: { ...draft.name, en: e.target.value } })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pp">{t('admin.price')} (₸)</Label>
            <Input id="pp" type="number" inputMode="numeric" value={draft.price || ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="pc">{t('admin.category')}</Label>
            <select id="pc" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {categories.map((c) => <option key={c.id} value={c.id}>{lz(c.name)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="pi">URL</Label>
          <Input id="pi" value={draft.image} onChange={(e) => setDraft({ ...draft, image: e.target.value })} placeholder="https://…" />
        </div>
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={draft.inStock} onChange={(e) => setDraft({ ...draft, inStock: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--primary))]" />
          <span className="text-sm font-medium">{t('common.inStock')}</span>
        </label>
      </div>
    </Modal>
  )
}
