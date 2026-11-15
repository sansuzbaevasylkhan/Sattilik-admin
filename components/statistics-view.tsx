'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import type { Order } from '@/lib/types'

interface Props {
  initialOrders: Order[]
}

type Period = 'day' | 'week' | 'month' | 'year'

const COLORS = {
  line: '#0066FF',
  bar: '#0052CC',
  grid: 'rgba(0, 0, 0, 0.12)',
  fg: 'rgba(0, 0, 0, 0.6)',
}

function rangeFor(period: Period): { from: Date; to: Date; bucket: 'hour' | 'day' | 'month' } {
  const to = new Date()
  const from = new Date()
  if (period === 'day') from.setDate(from.getDate() - 1)
  else if (period === 'week') from.setDate(from.getDate() - 7)
  else if (period === 'month') from.setMonth(from.getMonth() - 1)
  else from.setFullYear(from.getFullYear() - 1)
  const bucket = period === 'day' ? 'hour' : period === 'year' ? 'month' : 'day'
  return { from, to, bucket }
}

function bucketKey(d: Date, bucket: 'hour' | 'day' | 'month'): string {
  if (bucket === 'hour') {
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:00`
  }
  if (bucket === 'month') {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
  }
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

export function StatisticsView({ initialOrders }: Props) {
  const [orders] = useState(initialOrders)
  const [period, setPeriod] = useState<Period>('week')

  const { lineData, barData, topDrivers } = useMemo(() => {
    const { from, to, bucket } = rangeFor(period)
    const inRange = orders.filter((o) => {
      const t = new Date(o.created_at)
      return t >= from && t <= to
    })
    const completed = inRange.filter((o) => o.status === 'completed')

    // Group by bucket
    const byBucket = new Map<string, { trips: number; revenue: number }>()
    for (const o of completed) {
      const k = bucketKey(new Date(o.created_at), bucket)
      const cur = byBucket.get(k) ?? { trips: 0, revenue: 0 }
      cur.trips += 1
      cur.revenue += o.price ?? 0
      byBucket.set(k, cur)
    }
    const sortedKeys = Array.from(byBucket.keys()).sort()
    const lineData = sortedKeys.map((k) => ({
      label: k,
      trips: byBucket.get(k)!.trips,
    }))
    const barData = sortedKeys.map((k) => ({
      label: k,
      revenue: byBucket.get(k)!.revenue,
    }))

    const byDriver = new Map<string, { name: string; trips: number; revenue: number }>()
    for (const o of completed) {
      if (!o.driver_phone) continue
      const name = `${o.driver_first_name ?? ''} ${o.driver_last_name ?? ''}`.trim()
      const cur = byDriver.get(o.driver_phone) ?? { name, trips: 0, revenue: 0 }
      cur.trips += 1
      cur.revenue += o.price ?? 0
      byDriver.set(o.driver_phone, cur)
    }
    const topDrivers = Array.from(byDriver.entries())
      .map(([phone, v]) => ({ phone, ...v }))
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 5)

    return { lineData, barData, topDrivers }
  }, [orders, period])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Статистика</h1>
          <p className="text-sm text-muted-foreground">
            Кезең бойынша сапарлар мен табыс
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Соңғы тәулік</SelectItem>
              <SelectItem value="week">Соңғы апта</SelectItem>
              <SelectItem value="month">Соңғы ай</SelectItem>
              <SelectItem value="year">Соңғы жыл</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сапарлар саны</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke={COLORS.fg} fontSize={11} />
                  <YAxis stroke={COLORS.fg} fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFC800',
                      border: '1px solid #D4AF37',
                      borderRadius: 6,
                      color: '#000000',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="trips"
                    stroke={COLORS.line}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Табыс</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke={COLORS.fg} fontSize={11} />
                  <YAxis stroke={COLORS.fg} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFC800',
                      border: '1px solid #D4AF37',
                      borderRadius: 6,
                      color: '#000000',
                    }}
                    formatter={(v) => formatCurrency(Number(Array.isArray(v) ? v[0] : v) || 0)}
                  />
                  <Bar dataKey="revenue" fill={COLORS.bar} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Топ-5 белсенді жүргізушілер</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Жүргізуші</TableHead>
                <TableHead className="text-right">Сапарлар</TableHead>
                <TableHead className="text-right">Табыс</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Деректер жоқ
                  </TableCell>
                </TableRow>
              ) : (
                topDrivers.map((d, i) => (
                  <TableRow key={d.phone}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="text-xs">{d.name || d.phone}</TableCell>
                    <TableCell className="text-right">{d.trips}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(d.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
