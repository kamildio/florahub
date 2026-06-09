import { CheckCircle2, Clock, PackageCheck, Sparkles, Truck, XCircle, type LucideIcon } from 'lucide-react'
import type { OrderStatus } from '@/lib/types'

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'muted' | 'destructive'

export const STATUS_FLOW: OrderStatus[] = ['pending', 'accepted', 'assembling', 'delivering', 'completed']

export const statusConfig: Record<OrderStatus, { tone: Tone; icon: LucideIcon }> = {
  pending: { tone: 'warning', icon: Clock },
  accepted: { tone: 'primary', icon: CheckCircle2 },
  assembling: { tone: 'accent', icon: Sparkles },
  delivering: { tone: 'primary', icon: Truck },
  completed: { tone: 'success', icon: PackageCheck },
  cancelled: { tone: 'destructive', icon: XCircle },
}
