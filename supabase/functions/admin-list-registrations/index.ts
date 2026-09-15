// Supabase Edge Function — admin-list-registrations
//
// Админге жаңа тіркелулерді көрсету үшін.
// Пайдаланушылар тізімі + күтудегі растау кодтары.
//
// GET /functions/v1/admin-list-registrations
//   - Қайтарады:
//     {
//       users: [
//         { id, phone, first_name, last_name, role,
//           telegram_chat_id, telegram_linked, driver_id,
//           car_name, car_number, car_color,
//           card_linked, card_last4, card_holder,
//           average_rating, reviews_count, is_blocked, created_at },
//         ...
//       ],
//       pending_codes: [
//         { id, phone, first_name, last_name, role,
//           code, verified, expires_at, created_at },
//         ...
//       ],
//       orders: [
//         { id, passenger_phone, passenger_first_name, passenger_last_name,
//           driver_phone, driver_first_name, driver_last_name,
//           pickup_address, dropoff_address, price, status, payment_method,
//           driver_paid, driver_paid_amount, driver_withdrawn, created_at },
//         ...
//       ],
//       counts: { ...жалпы сандар, төлем статистикасы қоса... }
//     }
//
// Қорғау: ?secret=<ADMIN_SECRET> немесе X-Admin-Secret header арқылы.
// ADMIN_SECRET және SUPABASE_SERVICE_ROLE_KEY орнатылуы керек.
//
// Локалда тексеру:
//   curl "http://127.0.0.1:54321/functions/v1/admin-list-registrations?secret=test123" \
//     -H "Authorization: Bearer <SUPABASE_ANON_KEY>"

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, apikey, Apikey, X-Admin-Secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Админ кілті. supabase secrets set ADMIN_SECRET=<құпия сөз>
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchTable(
  path: string,
): Promise<{ ok: boolean; rows: unknown[]; err?: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    return { ok: false, rows: [], err: await res.text() };
  }
  const rows = await res.json();
  return { ok: true, rows: Array.isArray(rows) ? rows : [] };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured" },
      500,
    );
  }

  // Авторизация: ?secret=... немесе X-Admin-Secret header.
  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret") ??
    req.headers.get("X-Admin-Secret") ??
    "";

  if (!ADMIN_SECRET) {
    return jsonResponse(
      {
        error:
          "ADMIN_SECRET is not set. Run: supabase secrets set ADMIN_SECRET=<password>",
      },
      500,
    );
  }
  if (provided !== ADMIN_SECRET) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    // 1) Пайдаланушылар тізімі (соңғы 100).
    const usersRes = await fetchTable(
      "users?select=id,phone,first_name,last_name,role,telegram_chat_id,driver_id,car_name,car_number,car_color,card_last4,card_holder,average_rating,reviews_count,is_blocked,created_at&order=created_at.desc&limit=100",
    );
    if (!usersRes.ok) {
      return jsonResponse(
        { error: "Failed to fetch users", details: usersRes.err },
        500,
      );
    }

    const users = (usersRes.rows as Array<Record<string, unknown>>).map(
      (u) => ({
        id: u.id,
        phone: u.phone,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        telegram_chat_id: u.telegram_chat_id ?? null,
        telegram_linked: !!u.telegram_chat_id,
        driver_id: u.driver_id ?? null,
        car_name: u.car_name ?? null,
        car_number: u.car_number ?? null,
        car_color: u.car_color ?? null,
        card_linked: !!u.card_last4,
        card_last4: u.card_last4 ?? null,
        card_holder: u.card_holder ?? null,
        average_rating: u.average_rating ?? null,
        reviews_count: u.reviews_count ?? 0,
        is_blocked: !!u.is_blocked,
        created_at: u.created_at,
      }),
    );

    // 2) Күтудегі (verified=false, әлі жарамды) кодтар — соңғы 50.
    const nowIso = new Date().toISOString();
    const codesRes = await fetchTable(
      `verification_codes?select=id,phone,first_name,last_name,role,code,verified,expires_at,created_at&verified=eq.false&expires_at=gt.${encodeURIComponent(nowIso)}&order=created_at.desc&limit=50`,
    );
    if (!codesRes.ok) {
      return jsonResponse(
        { error: "Failed to fetch codes", details: codesRes.err },
        500,
      );
    }

    // 3) Соңғы тапсырыстар (сапар + жол ақысын төлеу/шығару күйі) — соңғы 100.
    const ordersRes = await fetchTable(
      "orders?select=id,passenger_phone,passenger_first_name,passenger_last_name,driver_phone,driver_first_name,driver_last_name,pickup_address,dropoff_address,price,status,payment_method,driver_paid,driver_paid_amount,driver_withdrawn,created_at&order=created_at.desc&limit=100",
    );
    if (!ordersRes.ok) {
      return jsonResponse(
        { error: "Failed to fetch orders", details: ordersRes.err },
        500,
      );
    }
    const orders = ordersRes.rows as Array<Record<string, unknown>>;
    const paidOrders = orders.filter((o) => o.driver_paid === true);

    return jsonResponse({
      success: true,
      users,
      pending_codes: codesRes.rows,
      orders,
      counts: {
        users_total: users.length,
        users_telegram_linked: users.filter((u) => u.telegram_linked).length,
        users_passenger: users.filter((u) => u.role === "passenger").length,
        users_driver: users.filter((u) => u.role === "driver").length,
        pending_codes: codesRes.rows.length,
        orders_total: orders.length,
        orders_completed: orders.filter((o) => o.status === "completed").length,
        payments_total_amount: paidOrders.reduce(
          (sum, o) => sum + (Number(o.driver_paid_amount) || 0),
          0,
        ),
        payments_pending_withdrawal: paidOrders.filter((o) => !o.driver_withdrawn).length,
        payments_withdrawn: paidOrders.filter((o) => o.driver_withdrawn).length,
      },
      server_time: nowIso,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
