import { useState } from 'react'
import { Flower2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Deterministic pleasant gradient per product, used as a fallback when the
// remote photo is unavailable (offline or 404) so the layout never breaks.
const palettes = [
  'from-rose-200 to-emerald-200 dark:from-rose-900/40 dark:to-emerald-900/40',
  'from-pink-200 to-amber-100 dark:from-pink-900/40 dark:to-amber-900/30',
  'from-emerald-200 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/30',
  'from-fuchsia-200 to-rose-100 dark:from-fuchsia-900/40 dark:to-rose-900/30',
  'from-violet-200 to-sky-100 dark:from-violet-900/40 dark:to-sky-900/30',
  'from-amber-200 to-rose-100 dark:from-amber-900/40 dark:to-rose-900/30',
]

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function BouquetImage({
  src,
  alt,
  id,
  className,
}: {
  src: string
  alt: string
  id: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const palette = palettes[hash(id) % palettes.length]

  if (failed) {
    return (
      <div className={cn('grid place-items-center bg-gradient-to-br', palette, className)} aria-label={alt} role="img">
        <Flower2 className="h-1/4 w-1/4 text-foreground/25" strokeWidth={1.2} aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}
