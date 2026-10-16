import { supabase } from './supabase'
import type { AdminSetting, AppUser, Order, Payment } from './types'
import { endOfDay, startOfDay } from './format'

function logTableError(table: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.warn(`[supabase] table "${table}" unavailable:`, error)
}

// Trip counts / revenue per phone number, computed from `orders` since the
// `users` table has no running totals. Cheap enough at this app's scale.
async function getTripStatsByPhone(): Promise<
  Map<string, { trips: number; spent: number }>
> {
  const { data, error } = await supabase
    .from('orders')
    .select('driver_phone, passenger_phone, price, status')
    .eq('status', 'completed')
  if (error) {
    logTableError('orders', error)
    return new Map()
  }
  const stats = new Map<string, { trips: number; spent: number }>()
  for (const o of data ?? []) {
    if (o.driver_phone) {
      const cur = stats.get(o.driver_phone) ?? { trips: 0, spent: 0 }
      cur.trips += 1
      stats.set(o.driver_phone, cur)
    }
    if (o.passenger_phone) {
      const cur = stats.get(o.passenger_phone) ?? { trips: 0, spent: 0 }
      cur.trips += 1
      cur.spent += o.price ?? 0
      stats.set(o.passenger_phone, cur)
    }
  }
  return stats
}

// ---------- Drivers ----------

export async function getDrivers(): Promise<AppUser[]> {
  const [{ data, error }, stats] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', { ascending: false }),
    getTripStatsByPhone(),
  ])
  if (error) {
    logTableError('users', error)
    return []
  }
  return (data ?? []).map((d) => ({
    ...(d as AppUser),
    total_trips: stats.get(d.phone)?.trips ?? 0,
  }))
}

export async function getDriver(id: string): Promise<AppUser | null> {
  const [{ data, error }, stats] = await Promise.all([
    supabase.from('users').select('*').eq('id', id).eq('role', 'driver').maybeSingle(),
    getTripStatsByPhone(),
  ])
  if (error) {
    logTableError('users', error)
    return null
  }
  if (!data) return null
  return { ...(data as AppUser), total_trips: stats.get(data.phone)?.trips ?? 0 }
}

export async function setUserBlocked(id: string, blocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_blocked: blocked })
    .eq('id', id)
  if (error) throw error
}

// Removes the account permanently. `orders`/`reviews` reference users by
// phone (text), not a foreign key, so this does not cascade-delete trip
// history — it only removes the account itself, matching how the mobile
// app's send-code/verify-code create it.
export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
}

// ---------- Passengers ----------

export async function getPassengers(): Promise<AppUser[]> {
  const [{ data, error }, stats] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('role', 'passenger')
      .order('created_at', { ascending: false }),
    getTripStatsByPhone(),
  ])
  if (error) {
    logTableError('users', error)
    return []
  }
  return (data ?? []).map((p) => ({
    ...(p as AppUser),
    total_trips: stats.get(p.phone)?.trips ?? 0,
    total_spent: stats.get(p.phone)?.spent ?? 0,
  }))
}

// ---------- Orders ----------

export async function getOrders(filters?: {
  status?: Order['status']
  from?: string
  to?: string
}): Promise<Order[]> {
  let q = supabase.from('orders').select('*').order('created_at', {
    ascending: false,
  })
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.from) q = q.gte('created_at', filters.from)
  if (filters?.to) q = q.lte('created_at', filters.to)
  const { data, error } = await q
  if (error) {
    logTableError('orders', error)
    return []
  }
  return (data ?? []) as Order[]
}

export async function getActiveOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['accepted', 'in_progress', 'pending'])
  if (error) {
    logTableError('orders', error)
    return []
  }
  return (data ?? []) as Order[]
}

// ---------- Dashboard stats ----------

export async function getDashboardStats(period: 'today' | 'weekly' | 'monthly' | 'total' = 'today') {
  let from = startOfDay().toISOString()
  let to = endOfDay().toISOString()

  if (period === 'weekly') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    from = d.toISOString()
  } else if (period === 'monthly') {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    from = d.toISOString()
  } else if (period === 'total') {
    from = '1970-01-01T00:00:00Z'
  }

  const [driversActive, driversBlocked, ordersCount, completedOrders, ratings] =
    await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'driver')
        .eq('is_blocked', false),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'driver')
        .eq('is_blocked', true),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', from)
        .lte('created_at', to),
      supabase
        .from('orders')
        .select('price')
        .eq('status', 'completed')
        .gte('created_at', from)
        .lte('created_at', to),
      supabase
        .from('users')
        .select('average_rating')
        .eq('role', 'driver')
        .not('average_rating', 'is', null),
    ])

  for (const r of [driversActive, driversBlocked, ratings]) {
    if (r.error) logTableError('users', r.error)
  }
  for (const r of [ordersCount, completedOrders]) {
    if (r.error) logTableError('orders', r.error)
  }

  const totalRevenue =
    completedOrders.data?.reduce((sum, r) => sum + (r.price ?? 0), 0) ?? 0

  // Calculate commission based on admin settings
  const commissionRate = await getAdminSetting('commission_rate')
  const rate = commissionRate ? parseFloat(commissionRate) / 100 : 0
  const companyCommission = totalRevenue * rate
  const netProfit = totalRevenue - companyCommission

  const ratingValues = (ratings.data ?? [])
    .map((r) => r.average_rating as number | null)
    .filter((v): v is number => typeof v === 'number')
  const avgRating = ratingValues.length
    ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
    : 0

  return {
    activeDrivers: driversActive.count ?? 0,
    blockedDrivers: driversBlocked.count ?? 0,
    todayOrders: ordersCount.count ?? 0,
    totalRevenue,
    companyCommission,
    netProfit,
    avgRating,
  }
}

export async function getRecentOrders(limit = 10): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    logTableError('orders', error)
    return []
  }
  return (data ?? []) as Order[]
}

export async function getRecentDrivers(limit = 10): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'driver')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    logTableError('users', error)
    return []
  }
  return (data ?? []) as AppUser[]
}

// ---------- Statistics ----------

export async function getOrdersByPeriod(from: string, to: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, price, created_at, status, driver_phone, driver_first_name, driver_last_name')
    .gte('created_at', from)
    .lte('created_at', to)
  if (error) {
    logTableError('orders', error)
    return []
  }
  return (data ?? []) as Pick<
    Order,
    'id' | 'price' | 'created_at' | 'status' | 'driver_phone' | 'driver_first_name' | 'driver_last_name'
  >[]
}

// ---------- Payments ----------

export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('period_end', { ascending: false })
  if (error) {
    logTableError('payments', error)
    return []
  }
  const payments = (data ?? []) as Payment[]
  if (payments.length === 0) return payments

  const driverIds = Array.from(new Set(payments.map((p) => p.driver_id)))
  const { data: drivers, error: driversError } = await supabase
    .from('users')
    .select('id, phone, first_name, last_name')
    .in('id', driverIds)
  if (driversError) {
    logTableError('users', driversError)
    return payments
  }
  const byId = new Map((drivers ?? []).map((d) => [d.id, d]))
  return payments.map((p) => {
    const d = byId.get(p.driver_id)
    return d
      ? { ...p, driver_name: `${d.first_name} ${d.last_name}`, driver_phone: d.phone }
      : p
  })
}

export async function markPaymentPaid(id: string): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ---------- Admin settings ----------

export async function getAdminSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) {
    // Treat missing table as "no value" so the admin page still works.
    return null
  }
  return (data as AdminSetting | null)?.value ?? null
}

export async function setAdminSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}
