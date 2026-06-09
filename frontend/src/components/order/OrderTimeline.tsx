import { useTranslation } from 'react-i18next'
import type { Order } from '@/lib/types'
import { useLocale } from '@/hooks/useLocale'
import { formatDate, cn } from '@/lib/utils'
import { STATUS_FLOW, statusConfig } from './orderStatus'

/**
 * Vertical stepper that tracks an order through the fulfilment flow,
 * highlighting the reached steps and the current one.
 */
export function OrderTimeline({ order }: { order: Order }) {
  const { t } = useTranslation()
  const { intlLocale } = useLocale()

  if (order.status === 'cancelled') {
    const { icon: Icon } = statusConfig.cancelled
    return (
      <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-destructive">
        <Icon className="h-5 w-5" />
        <span className="font-semibold">{t('order.status.cancelled')}</span>
      </div>
    )
  }

  const reachedAt = new Map(order.timeline.map((e) => [e.status, e]))
  const currentIndex = STATUS_FLOW.indexOf(order.status)

  return (
    <ol className="relative space-y-0.5">
      {STATUS_FLOW.map((status, idx) => {
        const { icon: Icon } = statusConfig[status]
        const reached = idx <= currentIndex
        const isCurrent = idx === currentIndex
        const event = reachedAt.get(status)
        const isLast = idx === STATUS_FLOW.length - 1
        return (
          <li key={status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-colors',
                  reached
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground',
                  isCurrent && 'ring-4 ring-primary/15',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {!isLast && <span className={cn('w-0.5 flex-1 min-h-[1.25rem]', reached ? 'bg-primary' : 'bg-border')} />}
            </div>
            <div className={cn('pb-5 pt-1', !reached && 'opacity-50')}>
              <p className={cn('text-sm font-semibold', isCurrent && 'text-primary')}>
                {t(`order.status.${status}`)}
              </p>
              {event && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.at, intlLocale)}
                  {event.note && <span className="ml-1">· {event.note}</span>}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
