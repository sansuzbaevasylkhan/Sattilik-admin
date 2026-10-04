import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EXPO_PUSH_TOKEN_PREFIX = 'ExponentPushToken';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function sendExpoPush(token: string, title: string, body: string, data: any = {}) {
  if (!token.startsWith(EXPO_PUSH_TOKEN_PREFIX)) return;

  try {
    await fetch('https://exp.exponent.dev/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        title: title,
        body: body,
        data: data,
        sound: 'default',
      }),
    });
  } catch (e) {
    console.error('Expo push error:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { event, orderId, userId } = await req.json();

    // 1. Find the target user's token
    let targetUserId: string | null = null;
    let title = '';
    let body = '';

    if (event === 'new_order') {
      // Target: Potential Drivers (Simplified: send to driver if order is assigned)
      const { data: order } = await supabase.from('orders').select('driver_id').eq('id', orderId).single();
      targetUserId = order?.driver_id;
      title = 'Жаңа тапсырыс!';
      body = 'Сіз үшін жаңа тапсырыс келді. Қабылдаңыз!';
    } else if (event === 'driver_arrived') {
      // Target: Passenger
      const { data: order } = await supabase.from('orders').select('passenger_phone').eq('id', orderId).single();
      const { data: passenger } = await supabase.from('users').select('id').eq('phone', order?.passenger_phone).single();
      targetUserId = passenger?.id;
      title = 'Жүргізуші келді!';
      body = 'Сіздің таксиңіз көрсетілген мекенжайға жетті.';
    } else if (event === 'trip_completed') {
      // Target: Passenger
      const { data: order } = await supabase.from('orders').select('passenger_phone').eq('id', orderId).single();
      const { data: passenger } = await supabase.from('users').select('id').eq('phone', order?.passenger_phone).single();
      targetUserId = passenger?.id;
      title = 'Сапар аяқталды';
      body = 'Сапар аяқталды. Жүргізушіні бағалаңыз!';
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Target user not found' }), { status: 404 });
    }

    const { data: tokenData } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', targetUserId)
      .single();

    if (tokenData?.token) {
      await sendExpoPush(tokenData.token, title, body, { orderId });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
})
