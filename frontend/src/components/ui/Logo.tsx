import { cn } from '@/lib/utils'

/**
 * FloraHub wordmark: a floral storefront glyph + two-tone wordmark
 * (forest "Flora" + floral-pink "Hub"), echoing the brand logo.
 */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary-foreground text-primary-foreground shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          {/* storefront awning + flower, simplified from the brand mark */}
          <path d="M4 9h16l-1.2-3.2a1 1 0 0 0-.94-.8H6.14a1 1 0 0 0-.94.8L4 9Z" fill="currentColor" opacity=".9" />
          <path d="M5 9v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="14.5" r="1.4" fill="currentColor" />
          <path d="M12 13.1c.8-1 .4-2.3-.7-2.6.5 1 .1 2-.0 2.6M12 13.1c-.8-1-.4-2.3.7-2.6-.5 1-.1 2 .0 2.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </span>
      {showText && (
        <span className="font-display text-xl font-bold leading-none tracking-tight">
          <span className="text-primary dark:text-secondary-foreground">Flora</span>
          <span className="text-accent">Hub</span>
        </span>
      )}
    </span>
  )
}
