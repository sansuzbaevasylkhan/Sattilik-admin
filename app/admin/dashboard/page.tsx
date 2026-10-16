import Link from 'next/link'
import {
  Car, Map as MapIcon, Wallet, Star, Clock, ShieldCheck,
  Users, UserSquare2, Activity, BarChart3, CreditCard,
  Bell, MapPin, Settings, UserCog, FileText, Ticket, TrendingUp, DollarSign
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/stat-card'
import { StatusBadge } from '@/components/status-badge'
import { getDashboardStats, getRecentOrders, getRecentDrivers } from '@/lib/queries'
import { formatCurrency, formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: 'today' | 'weekly' | 'monthly' | 'total' }
}) {
  const period = searchParams.period || 'today'
  const [stats, recentOrders, recentDrivers] = await Promise.all([
    getDashboardStats(period),
    getRecentOrders(10),
    getRecentDrivers(10),
  ])

  return (
    <div className="space-y-8">
      {/* Header & Global Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Sattilik Hub 2.0</h1>
          <p className="text-sm text-muted-foreground">
            Жүйелік басқару орталығы — {period === 'today' ? 'Бүгінгі' : period === 'weekly' ? 'Апталық' : period === 'monthly' ? 'Айлық' : 'Жалпы'} көрсеткіштер
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-card p-1 rounded-lg border border-border">
            {(['today', 'weekly', 'monthly', 'total'] as const).map((p) => (
              <Link
                key={p}
                href={`/admin/dashboard?period=${p}`}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p === 'today' ? 'Бүгін' : p === 'weekly' ? '7 күн' : p === 'monthly' ? '30 күн' : 'Барлығы'}
              </Link>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Activity className="h-4 w-4" /> Жаңарту
          </Button>
        </div>
      </div>

      {/* KPI Grid - Row 1: Financials & Orders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Бүгінгі тапсырыстар"
          value={stats.todayOrders}
          icon={MapIcon}
          href="/admin/orders"
          description="Жалпы сұраныс"
        />
        <StatCard
          title="Жалпы айналым"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          href="/admin/payments"
          description="Жалпы табыс"
        />
        <StatCard
          title="Компания комиссиясы"
          value={formatCurrency(stats.companyCommission)}
          icon={CreditCard}
          href="/admin/payments"
          description="Таза табыс"
        />
        <StatCard
          title="Орташа рейтинг"
          value={stats.avgRating.toFixed(1)}
          icon={Star}
          href="/admin/drivers"
          description="Жүргізушілер бойынша"
        />
      </div>

      {/* KPI Grid - Row 2: Drivers & Users */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Белсенді жүргізушілер"
          value={stats.activeDrivers}
          icon={Car}
          href="/admin/drivers"
          description={`Бұғатталған: ${stats.blockedDrivers}`}
        />
        <StatCard
          title="Онлайн жүргізушілер"
          value="--"
          icon={Activity}
          href="/admin/orders/live"
          description="Нақты уақытта"
        />
        <StatCard
          title="Жалпы жолаушылар"
          value="--"
          icon={UserSquare2}
          href="/admin/passengers"
          description="Тіркелгендер саны"
        />
        <StatCard
          title="Белсенді тарифтер"
          value="--"
          icon={Wallet}
          href="/tariffs"
          description="Қолданыстағы"
        />
      </div>

      {/* KPI Grid - Row 3: Operations */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Күтілген төлемдер"
          value="--"
          icon={CreditCard}
          href="/admin/payments"
          description="Төленбегендер"
        />
        <StatCard
          title="Ашық шағымдар"
          value="--"
          icon={ShieldCheck}
          href="/complaints"
          description="Шешілуді күтуде"
        />
        <StatCard
          title="Белсенді промокодтар"
          value="--"
          icon={Ticket}
          href="/admin/promos"
          description="Жарамдылық мерзімі"
        />
        <StatCard
          title="Жүйелік хабарламалар"
          value="--"
          icon={Bell}
          href="/admin/notifications"
          description="Жаңа ескертулер"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Соңғы сапарлар</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              asChild
            >
              <Link href="/admin/orders">Барлығы →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Жолаушы</TableHead>
                  <TableHead>Жүргізуші</TableHead>
                  <TableHead>Баға</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Уақыт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Деректер жоқ
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">
                        {o.passenger_first_name} {o.passenger_last_name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.driver_first_name
                          ? `${o.driver_first_name} ${o.driver_last_name ?? ''}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(o.price)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(o.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Monitoring Block */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Жедел бақылау
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {recentDrivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Деректер жоқ</p>
              ) : (
                recentDrivers.map((d) => (
                  <Link
                    key={d.id}
                    href={`/admin/drivers/${d.id}`}
                    className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {d.first_name[0]}{d.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{d.first_name} {d.last_name}</div>
                        <div className="text-xs text-muted-foreground">{d.phone}</div>
                      </div>
                    </div>
                    <StatusBadge status={d.is_blocked ? 'blocked' : 'active'} />
                  </Link>
                ))
              )}
            </div>
            <div className="pt-4 border-t border-border">
              <Button className="w-full gap-2" asChild>
                <Link href="/admin/orders/live">
                  <MapIcon className="h-4 w-4" /> Live картаны ашу
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}

