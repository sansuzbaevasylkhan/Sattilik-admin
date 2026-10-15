import { Badge } from '@/components/ui/badge'
import type { OrderStatus, PaymentStatus } from '@/lib/types'

type Status = OrderStatus | PaymentStatus | 'active' | 'blocked' | string

const STYLES: Record<string, string> = {
  active: 'bg-primary/20 text-primary border-primary/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  blocked: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  accepted: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  in_progress: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  completed: 'bg-primary/20 text-primary border-primary/30',
  cancelled: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  paid: 'bg-primary/20 text-primary border-primary/30',
  failed: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
}

const LABELS: Record<string, string> = {
  active: 'Белсенді',
  pending: 'Күтуде',
  blocked: 'Бұғатталған',
  inactive: 'Белсенді емес',
  accepted: 'Қабылданды',
  in_progress: 'Орындалуда',
  completed: 'Аяқталды',
  cancelled: 'Бас тартылды',
  paid: 'Төленді',
  failed: 'Сәтсіз',
}

export function StatusBadge({ status }: { status: Status }) {
  const key = String(status)
  return (
    <Badge
      variant="outline"
      className={
        STYLES[key] ??
        'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
      }
    >
      {LABELS[key] ?? key}
    </Badge>
  )
}
