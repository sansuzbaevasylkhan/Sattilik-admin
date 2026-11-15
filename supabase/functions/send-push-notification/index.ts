import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN') ?? ''
const PUSH_ADMIN_SECRET = Deno.env.get('PUSH_ADMIN_SECRET') ?? ''

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100
const TOKEN_PREFIX = /^Expo(nent)?PushToken\[/

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type PushEvent =
  | 'new_order'
  | 'order_accepted'
  | 'trip_started'
  | 'driver_arrived'
  | 'trip_completed'
  | 'new_passenger'
  | 'new_driver'
  | 'chat_message'
  | 'news'

const EVENTS: PushEvent[] = [
  'new_order',
  'order_accepted',
  'trip_started',
  'driver_arrived',
  'trip_completed',
  'new_passenger',
  'new_driver',
  'chat_message',
  'news',
]

interface PushMessage {
  to: string
  title: string
  body: string
  data: Record<string, unknown>
  sound: 'default'
  channelId: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clean(value: unknown, max = 160): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function userIdByPhone(phone: string | null | undefined): Promise<string | null> {
  if (!phone) return null
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

async function userIdsByRole(role: 'driver' | 'admin'): Promise<string[]> {
  const { data } = await supabase.from('users').select('id').eq('role', role)
  return (data ?? []).map((row: { id: string }) => row.id)
}

async function getOrder(orderId: string | null) {
  if (!orderId) return null
  const { data } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
  return data
}

async function tokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []
  const { data } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds)
  return (data ?? [])
    .map((row: { token: string }) => row.token)
    .filter((token: string) => TOKEN_PREFIX.test(token))
}

async function tokensForPhone(phone: string | null | undefined): Promise<string[]> {
  const userId = await userIdByPhone(phone)
  return tokensForUsers(userId ? [userId] : [])
}

async function allTokens(): Promise<string[]> {
  const tokens: string[] = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .range(from, from + pageSize - 1)

    if (error || !data || data.length === 0) break
    for (const row of data as Array<{ token: string }>) {
      if (TOKEN_PREFIX.test(row.token)) tokens.push(row.token)
    }
    if (data.length < pageSize) break
  }

  return tokens
}

async function removeInvalidTokens(tokens: string[]) {
  if (tokens.length === 0) return
  await supabase.from('push_tokens').delete().in('token', tokens)
}

async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  const unique = Array.from(new Set(tokens))
  let sent = 0
  let failed = 0
  const invalid: string[] = []

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)
    const messages: PushMessage[] = batch.map((token) => ({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      channelId: 'default',
    }))

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(messages),
      })

      if (!res.ok) {
        failed += batch.length
        continue
      }

      const payload = await res.json()
      const tickets: Array<{
        status?: string
        details?: { error?: string }
      }> = Array.isArray(payload?.data) ? payload.data : []

      tickets.forEach((ticket, index) => {
        if (ticket?.status === 'ok') {
          sent += 1
          return
        }
        failed += 1
        if (ticket?.details?.error === 'DeviceNotRegistered' && batch[index]) {
          invalid.push(batch[index])
        }
      })
    } catch (e) {
      console.error('Expo push error:', e)
      failed += batch.length
    }
  }

  await removeInvalidTokens(invalid)
  return { sent, failed }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const payload = await req.json()
    const event = payload?.event as PushEvent

    if (!EVENTS.includes(event)) {
      return json({ error: 'unknown_event', events: EVENTS }, 400)
    }

    const orderId = clean(payload?.orderId ?? payload?.order_id, 64) || null
    const order = orderId ? await getOrder(orderId) : null

    const orderEvents: PushEvent[] = [
      'new_order',
      'order_accepted',
      'trip_started',
      'driver_arrived',
      'trip_completed',
      'chat_message',
    ]

    if (orderEvents.includes(event) && !order) {
      return json({ success: true, sent: 0, failed: 0, reason: 'order_not_found' })
    }

    if (event === 'news') {
      if (!PUSH_ADMIN_SECRET || req.headers.get('x-admin-secret') !== PUSH_ADMIN_SECRET) {
        return json({ error: 'forbidden' }, 403)
      }
    }

    // Хабарлама тек нақты сапар күйіне сәйкес келгенде жіберіледі.
    const expectedStatus: Partial<Record<PushEvent, string[]>> = {
      new_order: ['pending'],
      order_accepted: ['accepted'],
      trip_started: ['in_progress'],
      driver_arrived: ['accepted', 'in_progress'],
      trip_completed: ['completed'],
    }
    const expected = expectedStatus[event]
    if (expected && order && !expected.includes(order.status)) {
      return json({ success: true, sent: 0, failed: 0, reason: 'event_state_mismatch' })
    }

    let tokens: string[] = []
    let title = ''
    let body = ''

    switch (event) {
      case 'new_order': {
        title = 'Жаңа тапсырыс'
        body = order
          ? `${order.pickup_address} → ${order.dropoff_address} · ${order.price} ₸`
          : 'Сізге жаңа тапсырыс келді'
        tokens = await tokensForUsers(await userIdsByRole('driver'))
        break
      }

      case 'order_accepted': {
        title = 'Жүргізуші қабылдады'
        body = order?.driver_first_name
          ? `${order.driver_first_name} келе жатыр`
          : 'Жүргізуші тапсырысты қабылдады'
        tokens = await tokensForPhone(order?.passenger_phone)
        break
      }

      case 'trip_started': {
        title = 'Сапар басталды'
        body = 'Жүргізуші сапарды бастады. Жолыңыз болсын!'
        tokens = await tokensForPhone(order?.passenger_phone)
        break
      }

      case 'driver_arrived': {
        title = 'Жүргізуші келді'
        body = 'Көлік сізді күтіп тұр. Жолаушы шығуыңызды сұраймыз.'
        tokens = await tokensForPhone(order?.passenger_phone)
        break
      }

      case 'trip_completed': {
        title = 'Сапар аяқталды'
        body = 'Сапар аяқталды. Жүргізушіні бағалап қоюды ұмытпаңыз.'
        tokens = await tokensForPhone(order?.passenger_phone)
        break
      }

      case 'new_passenger': {
        const name = clean(payload?.name, 80)
        title = 'Жаңа жолаушы'
        body = name ? `${name} тіркелді` : 'Жаңа жолаушы тіркелді'
        tokens = await tokensForUsers(await userIdsByRole('admin'))
        break
      }

      case 'new_driver': {
        const name = clean(payload?.name, 80)
        title = 'Жаңа жүргізуші'
        body = name ? `${name} тіркелді` : 'Жаңа жүргізуші тіркелді'
        tokens = await tokensForUsers(await userIdsByRole('admin'))
        break
      }

      case 'chat_message': {
        const senderPhone = clean(payload?.senderPhone, 20)
        const isPassengerSender = !!order && order.passenger_phone === senderPhone
        const targetPhone = isPassengerSender ? order?.driver_phone : order?.passenger_phone
        title = 'Жаңа хабарлама'
        body = clean(payload?.body, 140) || 'Сапар чатында жаңа хабарлама бар'
        tokens = await tokensForPhone(targetPhone)
        break
      }

      case 'news': {
        title = clean(payload?.title, 80) || 'Sattilik Taxi'
        body = clean(payload?.body, 180) || 'Жаңа жаңалық жарияланды'
        tokens = await allTokens()
        break
      }
    }

    if (tokens.length === 0) {
      return json({ success: true, sent: 0, failed: 0, reason: 'no_tokens' })
    }

    const result = await sendPush(tokens, title, body, {
      type: event,
      ...(orderId ? { orderId } : {}),
    })

    return json({ success: true, ...result, targets: tokens.length })
  } catch (e) {
    console.error('send-push-notification error:', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
