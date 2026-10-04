import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // 1. Validate token and get trip details
    const { data: share, error: shareError } = await supabase
      .from('trip_shares')
      .select('trip_id, revoked, expires_at')
      .eq('token', token)
      .single()

    if (shareError || !share || share.revoked || new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // 2. Get trip/order details (masked)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, pickup_address, dropoff_address, price')
      .eq('id', share.trip_id)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Trip not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // 3. Get driver details (masked)
    const { data: driver, error: driverError } = await supabase
      .from('users')
      .select('first_name, last_name, avatar_url')
      .eq('phone', (await supabase.from('orders').select('driver_phone').eq('id', share.trip_id).single()).data?.driver_phone)
      .single()

    // 4. Get current location from driver_locations
    const { data: location, error: locError } = await supabase
      .from('driver_locations')
      .select('lat, lng, last_updated')
      .eq('phone', (await supabase.from('orders').select('driver_phone').eq('id', share.trip_id).single()).data?.driver_phone)
      .maybeSingle()

    return new Response(
      JSON.stringify({
        order,
        driver: driver || { first_name: 'Жүргізуші', last_name: '' },
        location: location || null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
