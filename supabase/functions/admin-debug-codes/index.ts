// Уақытша диагностика функциясы: verification_codes/users жағдайын
// service_role арқылы қарап, растау кодының неге жетпей жатқанын анықтау үшін.
//
// GET /functions/v1/admin-debug-codes?secret=<RESET_TELEGRAM_LINKS_SECRET>

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
const ADMIN_SECRET = Deno.env.get("RESET_TELEGRAM_LINKS_SECRET");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchRows(path: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) return { error: await res.text() };
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret") ?? req.headers.get("X-Admin-Secret") ?? "";
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const codes = await fetchRows(
    "verification_codes?select=phone,first_name,role,code,verified,created_at,expires_at&order=created_at.desc&limit=10",
  );
  const users = await fetchRows(
    "users?select=phone,first_name,role,telegram_chat_id,created_at&order=created_at.desc&limit=10",
  );

  return jsonResponse({ codes, users, server_time: new Date().toISOString() });
});
