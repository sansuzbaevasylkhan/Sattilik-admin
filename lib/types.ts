// Types mirror the real Supabase schema shared with the Sattilik mobile app
// (see the mobile app's supabase/migrations). Both driver and passenger
// accounts live in one `users` table, distinguished by `role`.

export type UserRole = 'passenger' | 'driver'
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed'

export interface AppUser {
  id: string
  phone: string
  first_name: string
  last_name: string
  role: UserRole
  avatar_url: string | null
  car_name: string | null
  car_number: string | null
  car_color: string | null
  average_rating: number | null
  reviews_count: number | null
  is_blocked: boolean
  created_at: string
  // Computed client-side from orders, not a real column.
  total_trips?: number
  total_spent?: number
}

export interface Order {
  id: string
  passenger_phone: string
  passenger_first_name: string
  passenger_last_name: string
  driver_phone: string | null
  driver_first_name: string | null
  driver_last_name: string | null
  pickup_address: string
  dropoff_address: string
  distance: string
  estimated_time: string
  price: number
  status: OrderStatus
  payment_method: string | null
  passenger_reviewed: boolean
  created_at: string
  updated_at: string
  // Optional realtime location data (not populated by the app today).
  driver_lat?: number | null
  driver_lng?: number | null
}

// Admin-only supplemental tables (see sql/admin-supplemental.sql).
export interface Payment {
  id: string
  driver_id: string
  driver_name?: string
  driver_phone?: string
  period_start: string
  period_end: string
  total_trips: number
  gross_amount: number
  commission_percent: number
  net_amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}

export interface AdminSetting {
  key: string
  value: string
  updated_at?: string
}
