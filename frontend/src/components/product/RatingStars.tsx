import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RatingStars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={cn(
            i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-border',
          )}
        />
      ))}
    </span>
  )
}
