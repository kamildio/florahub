import { useTranslation } from 'react-i18next'
import type { OrderStatus } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { statusConfig } from './orderStatus'

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation()
  const { tone, icon: Icon } = statusConfig[status]
  return (
    <Badge tone={tone}>
      <Icon className="h-3.5 w-3.5" />
      {t(`order.status.${status}`)}
    </Badge>
  )
}
