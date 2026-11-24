'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { StatusBadge } from '@/components/status-badge'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Order, OrderStatus } from '@/lib/types'
import { supabase } from '@/lib/supabase'

interface Props {
  initialOrders: Order[]
}

const STATUS_OPTIONS: { value: 'all' | OrderStatus; label: string }[] = [
  { value: 'all', label: 'Барлығы' },
  { value: 'pending', label: 'Күтуде' },
  { value: 'accepted', label: 'Қабылданды' },
  { value: 'in_progress', label: 'Орындалуда' },
  { value: 'completed', label: 'Аяқталды' },
  { value: 'cancelled', label: 'Бас тартылды' },
]

export function OrdersTable({ initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState<{
    status: 'all' | OrderStatus
    from: string
    to: string
  }>({ status: 'all', from: '', to: '' })

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        setOrders((current) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Partial<Order>).id
            return current.filter((order) => order.id !== deletedId)
          }

          const nextOrder = payload.new as Order
          if (!nextOrder.id) return current
          return [nextOrder, ...current.filter((order) => order.id !== nextOrder.id)]
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        })
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (applied.status !== 'all' && o.status !== applied.status) return false
      if (applied.from && o.created_at < applied.from) return false
      if (applied.to && o.created_at > applied.to + 'T23:59:59') return false
      return true
    })
  }, [orders, applied])

  function applyFilters() {
    setApplied({ status, from, to })
  }

  function resetFilters() {
    setStatus('all')
    setFrom('')
    setTo('')
    setApplied({ status: 'all', from: '', to: '' })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="text-xs">Статус</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as 'all' | OrderStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Бастап</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Дейін</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={applyFilters}>Қолдану</Button>
          <Button variant="outline" onClick={resetFilters}>
            Тазалау
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Жолаушы</TableHead>
              <TableHead>Жүргізуші</TableHead>
              <TableHead>Бағыт</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Баға</TableHead>
              <TableHead>Уақыт</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Сапарлар табылмады
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">
                    {o.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.passenger_first_name} {o.passenger_last_name}
                    <div className="font-mono text-xs text-muted-foreground">
                      {o.passenger_phone}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {o.driver_first_name
                      ? `${o.driver_first_name} ${o.driver_last_name ?? ''}`
                      : '—'}
                    {o.driver_phone ? (
                      <div className="font-mono text-xs text-muted-foreground">
                        {o.driver_phone}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{o.pickup_address}</div>
                    <div className="text-xs text-muted-foreground">
                      → {o.dropoff_address}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(o.price)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(o.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
