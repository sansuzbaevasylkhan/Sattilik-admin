import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-chat-session',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const { action, orderId, text } = await req.json()
    if (!['list', 'send'].includes(action) || typeof orderId !== 'string') {
      return json({ error: 'Invalid chat request' }, 400)
    }

    const token = req.headers.get('x-chat-session')
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) return json({ error: 'Chat session required' }, 401)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    const { data: session } = await supabase.from('trip_chat_sessions').select('phone, expires_at').eq('token_hash', tokenHash).maybeSingle()
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) return json({ error: 'Chat session expired' }, 401)
    const phone = session.phone

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, passenger_phone, driver_phone, status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) return json({ error: 'Trip not found' }, 404)
    if (phone !== order.passenger_phone && phone !== order.driver_phone) {
      return json({ error: 'Not a participant in this trip' }, 403)
    }
    if (!order.driver_phone || !['accepted', 'in_progress'].includes(order.status)) {
      return json({ error: 'Chat is available after a driver accepts the trip' }, 409)
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('messages')
        .select('id, trip_id, sender_id, text, created_at, sender:users!messages_sender_id_fkey(phone)')
        .eq('trip_id', orderId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) return json({ error: 'Could not load messages' }, 500)
      return json({ messages: (data || []).map((message: any) => ({
        id: message.id,
        trip_id: message.trip_id,
        sender_id: message.sender_id,
        sender_phone: message.sender?.phone || '',
        text: message.text,
        created_at: message.created_at,
      })) })
    }

    const cleanText = typeof text === 'string' ? text.trim() : ''
    if (!cleanText || cleanText.length > 1000) return json({ error: 'Message must be 1 to 1000 characters' }, 400)

    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()
    if (senderError || !sender) return json({ error: 'Sender not found' }, 404)

    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({ trip_id: orderId, sender_id: sender.id, text: cleanText })
      .select('id, trip_id, sender_id, text, created_at')
      .single()
    if (insertError || !message) return json({ error: 'Could not send message' }, 500)

    return json({ message: { ...message, sender_phone: phone } }, 201)
  } catch {
    return json({ error: 'Invalid chat request' }, 400)
  }
})
