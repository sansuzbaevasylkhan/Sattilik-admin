// Supabase Edge Function — admin-user-action
//
// askdrv-admin.vercel.app сияқты сыртқы админ-панельге арналған
// жазу/әрекет ету API-ы (admin-list-registrations тек оқу үшін еді).
//
// POST /functions/v1/admin-user-action?secret=<ADMIN_SECRET>
// Body: { action: "block" | "unblock" | "detail" | "delete_pending_code", phone?: string, code_id?: string }
//
//  - action="block"   { phone } -> users.is_blocked = true
//  - action="unblock" { phone } -> users.is_blocked = false
//  - action="detail"  { phone } -> { user, orders, reviews } — бір пайдаланушының толық профилі
//  - action="delete_pending_code" { code_id } -> verification_codes-тан бір жазбаны өшіру
//
// Қорғау: admin-list-registrations-пен бірдей ADMIN_SECRET.

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
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: unknown): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let ten = "";
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    ten = digits.slice(1);
  } else if (digits.length === 10) {
    ten = digits;
  } else if (digits.length === 12 && digits.startsWith("7")) {
    ten = digits.slice(2);
  } else {
    return null;
  }
  if (ten.length !== 10) return null;
  return `+7${ten}`;
}

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init?.headers ?? {}),
    },
  });
  return res;
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
  if (!ADMIN_SECRET) {
    return jsonResponse({ error: "ADMIN_SECRET is not set" }, 500);
  }

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret") ?? req.headers.get("X-Admin-Secret") ?? "";
  if (provided !== ADMIN_SECRET) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let payload: { action?: string; phone?: unknown; code_id?: unknown };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = payload.action;

  try {
    if (action === "block" || action === "unblock") {
      const phone = normalizePhone(payload.phone);
      if (!phone) return jsonResponse({ error: "Invalid phone" }, 400);

      const res = await sb(`users?phone=eq.${encodeURIComponent(phone)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ is_blocked: action === "block" }),
      });
      if (!res.ok) {
        return jsonResponse({ error: "Failed to update user", details: await res.text() }, 500);
      }
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        return jsonResponse({ error: "User not found" }, 404);
      }
      return jsonResponse({ success: true, phone, is_blocked: action === "block" });
    }

    if (action === "detail") {
      const phone = normalizePhone(payload.phone);
      if (!phone) return jsonResponse({ error: "Invalid phone" }, 400);

      const userRes = await sb(`users?phone=eq.${encodeURIComponent(phone)}&select=*`);
      const users = userRes.ok ? await userRes.json() : [];
      const user = Array.isArray(users) && users.length > 0 ? users[0] : null;
      if (!user) return jsonResponse({ error: "User not found" }, 404);

      const ordersRes = await sb(
        `orders?or=(passenger_phone.eq.${encodeURIComponent(phone)},driver_phone.eq.${encodeURIComponent(phone)})&order=created_at.desc&limit=50`,
      );
      const orders = ordersRes.ok ? await ordersRes.json() : [];

      const reviewsRes = await sb(
        `reviews?driver_phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=50`,
      );
      const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

      return jsonResponse({ success: true, user, orders, reviews });
    }

    if (action === "delete_pending_code") {
      const codeId = payload.code_id;
      if (!codeId || typeof codeId !== "string") {
        return jsonResponse({ error: "code_id is required" }, 400);
      }
      const res = await sb(`verification_codes?id=eq.${encodeURIComponent(codeId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return jsonResponse({ error: "Failed to delete", details: await res.text() }, 500);
      }
      return jsonResponse({ success: true });
    }

    return jsonResponse(
      { error: "Unknown action. Use: block | unblock | detail | delete_pending_code" },
      400,
    );
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
