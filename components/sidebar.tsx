'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  Map,
  Activity,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Wallet,
  Ticket,
  Bell,
  MapPin,
  Settings,
  UserCog,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/drivers', label: 'Жүргізушілер', icon: Users },
  { href: '/admin/passengers', label: 'Жолаушылар', icon: UserSquare2 },
  { href: '/admin/orders', label: 'Сапарлар', icon: Map },
  { href: '/admin/orders/live', label: 'Live трекинг', icon: Activity },
  { href: '/admin/payments', label: 'Төлемдер', icon: CreditCard },
  { href: '/admin/statistics', label: 'Статистика', icon: BarChart3 },
  { href: '/complaints', label: 'Шағымдар', icon: ShieldCheck },
  { href: '/tariffs', label: 'Тарифтер', icon: Wallet },
  { href: '/admin/promos', label: 'Промокодтар', icon: Ticket },
  { href: '/admin/notifications', label: 'Хабарландырулар', icon: Bell },
  { href: '/admin/areas', label: 'Қызмет аймақтары', icon: MapPin },
  { href: '/admin/settings', label: 'Параметрлер', icon: Settings },
  { href: '/admin/admins', label: 'Әкімшілер', icon: UserCog },
  { href: '/admin/logs', label: 'Журнал', icon: FileText },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="relative h-8 w-8 overflow-hidden rounded-lg">
          <Image
            src="/logo.png"
            alt="Sattilik"
            fill
            sizes="32px"
            className="object-contain"
          />
        </div>
        <span className="text-lg font-semibold tracking-tight">Sattilik</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/50">
        v0.1 · admin
      </div>
    </aside>
  )
}
