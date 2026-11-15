import { Badge } from '@/components/ui/badge'
import type { OrderStatus, PaymentStatus } from '@/lib/types'

type Status = OrderStatus | PaymentStatus | 'active' | 'blocked' | string

const STYLES: Record<string, string> = {
  active: 'bg-[#0066FF] text-white border-[#0052CC]',
  pending: 'bg-[#FFC800] text-black border-[#D4AF37]',
  blocked: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  inactive: 'bg-black/10 text-black/60 border-black/20',
  accepted: 'bg-[#0066FF] text-white border-[#0052CC]',
  in_progress: 'bg-[#0066FF]/80 text-white border-[#0052CC]',
  completed: 'bg-[#FFC800] text-black border-[#D4AF37]',
  cancelled: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  paid: 'bg-[#FFC800] text-black border-[#D4AF37]',
  failed: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
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
        'bg-black/10 text-black/60 border-black/20'
      }
    >
      {LABELS[key] ?? key}
    </Badge>
  )
}
