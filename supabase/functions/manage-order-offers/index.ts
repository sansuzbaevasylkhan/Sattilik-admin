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
    const { action, orderId, driverId, status } = await req.json()

    if (action === 'offer_order') {
      // Logic to find next closest driver and create offer
      // 1. Find drivers who haven't been offered this order yet
      const { data: offeredDrivers } = await supabase
        .from('order_offers')
        .select('driver_id')
        .eq('order_id', orderId)

      const excludedIds = offeredDrivers?.map(d => d.driver_id) || []

      // 2. Get available drivers (online and not in other trips)
      // This is a simplified version. In production, we'd use PostGIS for distance.
      const { data: availableDrivers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'driver')
        .notin('id', excludedIds)
        .limit(1)
        .single()

      if (!availableDrivers) {
        return new Response(JSON.stringify({ error: 'No more available drivers' }), { status: 404 })
      }

      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + 20)

      const { data: offer, error } = await supabase
        .from('order_offers')
        .insert({
          order_id: orderId,
          driver_id: availableDrivers.id,
          status: 'pending',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      return new Response(JSON.stringify(offer), { status: 200 })
    }

    if (action === 'handle_expiration') {
      // Logic for pg_cron or scheduled call to expire pending offers
      const { data: expiredOffers } = await supabase
        .from('order_offers')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'pending')
        .select()

      return new Response(JSON.stringify({ expired_count: expiredOffers?.length || 0 }), { status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
