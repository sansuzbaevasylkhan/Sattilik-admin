// Supabase Edge Function — admin-reset-telegram-links
//
// Bot токені/username ауыстырылғанда шақырылады: барлық
// users.telegram_chat_id мәнін NULL-ге қайтарады, өйткені ескі боттан
// алынған chat_id жаңа бот үшін жарамсыз (пайдаланушы жаңа ботта
// әлі /start баспаған — жаңа бот сол chat_id-ға хабарлама жібере алмайды).
//
// POST /functions/v1/admin-reset-telegram-links?secret=<ADMIN_SECRET>

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
    return jsonResponse({ error: "RESET_TELEGRAM_LINKS_SECRET is not set" }, 500);
  }

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret") ?? req.headers.get("X-Admin-Secret") ?? "";
  if (provided !== ADMIN_SECRET) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?telegram_chat_id=not.is.null`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({ telegram_chat_id: null }),
      },
    );

    if (!res.ok) {
      const details = await res.text();
      return jsonResponse({ error: "Failed to reset links", details }, 500);
    }

    const rows = await res.json();
    return jsonResponse({
      success: true,
      reset_count: Array.isArray(rows) ? rows.length : 0,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
