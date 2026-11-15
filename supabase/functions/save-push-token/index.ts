import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/
const PHONE_RE = /^\+?\d{10,15}$/

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Құрылғының Expo push токенін users телефоны бойынша push_tokens кестесіне жазады.
 * Жазу service_role арқылы жүреді, сондықтан RLS саясаты әлсіретілмейді.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const { phone, token, device_type } = await req.json()

    if (typeof phone !== 'string' || !PHONE_RE.test(phone.trim())) {
      return json({ error: 'invalid_phone' }, 400)
    }
    if (typeof token !== 'string' || !EXPO_TOKEN_RE.test(token.trim())) {
      return json({ error: 'invalid_push_token' }, 400)
    }

    const normalizedPhone = phone.trim()
    const normalizedToken = token.trim()
    const deviceType = device_type === 'ios' || device_type === 'android' ? device_type : null

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle()

    if (userError) return json({ error: userError.message }, 500)
    if (!user?.id) return json({ error: 'user_not_found' }, 404)

    // Құрылғы бір аккаунтқа тиесілі болсын: бұрынғы пайдаланушылардан токенді өшіреміз.
    await supabase
      .from('push_tokens')
      .delete()
      .eq('token', normalizedToken)
      .neq('user_id', user.id)

    const { error: upsertError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token: normalizedToken,
          device_type: deviceType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' },
      )

    if (upsertError) return json({ error: upsertError.message }, 500)

    return json({ ok: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
