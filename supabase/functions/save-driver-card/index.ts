// Supabase Edge Function — save-driver-card
//
// Банк картасын "қосу" ағыны — нақты төлем провайдері жоқ, сондықтан
// толық карта нөмірі/CVV ЕШҚАШАН серверге жіберілмейді және сақталмайды.
// Клиент тек соңғы 4 цифр мен карта иесінің атын жібереді, біз соны
// users кестесінде сақтаймыз (тек көрсету үшін, "···· 1234").

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, apikey, Apikey",
};

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "Server is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)" },
        500,
      );
    }

    let payload: {
      phone?: unknown;
      card_last4?: unknown;
      card_holder?: unknown;
    };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const normalizedPhone = normalizePhone(payload.phone);
    if (!normalizedPhone) {
      return jsonResponse({ error: "Invalid phone number" }, 400);
    }

    const cardLast4 = typeof payload.card_last4 === "string" ? payload.card_last4.trim() : "";
    const cardHolder = typeof payload.card_holder === "string" ? payload.card_holder.trim() : "";

    if (!/^\d{4}$/.test(cardLast4) || !cardHolder) {
      return jsonResponse({ error: "card_last4 (4 digits) and card_holder are required" }, 400);
    }

    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(normalizedPhone)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({ card_last4: cardLast4, card_holder: cardHolder }),
      },
    );

    if (!updateRes.ok) {
      const errBody = await updateRes.text();
      return jsonResponse({ error: "Failed to save card", details: errBody }, 500);
    }

    const rows = await updateRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return jsonResponse({ error: "User not found" }, 404);
    }

    return jsonResponse({ success: true, card_last4: cardLast4, card_holder: cardHolder });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
