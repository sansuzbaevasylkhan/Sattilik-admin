// Supabase Edge Function — send-code (Telegram-ға ауыстырылған).
//
// Схема:
//  1) Апп POST {phone, first_name, last_name, role} жібереді.
//  2) Біз users кестесіне INSERT (ON CONFLICT DO NOTHING) жасаймыз —
//     пайдаланушы алғаш рет тіркелсе.
//  3) Код жасап, verification_codes кестесіне 5 минуттық жарамдылықпен сақтаймыз.
//  4) Аппқа { telegram_link: "https://t.me/<bot>?start=<phone>" } қайтарамыз.
//     Кодты Telegram-ға осы жерде жібермейміз — өйткені chat_id әлі белгісіз.
//  5) Пайдаланушы сілтемені ашып, ботқа "/start" басады.
//  6) telegram-webhook функциясы chat_id-ны users-қа жазып,
//     verification_codes-тан соңғы жарамды кодты Telegram-ға жібереді.

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

// Telegram BotFather берген токен. @BotFather-дан алынады.
// Supabase CLI: supabase secrets set TELEGRAM_BOT_TOKEN=...
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// Боттың @username — BotFather-дың "/setusername" командасымен берілген.
// Сілтеме https://t.me/<username>?start=<phone> осы username-мен жасалады.
const TELEGRAM_BOT_USERNAME = Deno.env.get("TELEGRAM_BOT_USERNAME") ?? "sattiliktaxiappcodebot";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * +7XXXXXXXXXX форматына келтіру. Жарамсыз болса null.
 */
function normalizePhone(phone: unknown): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let ten = "";
  if (digits.length === 11 && digits.startsWith("7")) {
    ten = digits.slice(1);
  } else if (digits.length === 11 && digits.startsWith("8")) {
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

    if (!TELEGRAM_BOT_TOKEN) {
      return jsonResponse(
        { error: "TELEGRAM_BOT_TOKEN is not configured" },
        500,
      );
    }

    let payload: {
      phone?: unknown;
      first_name?: unknown;
      last_name?: unknown;
      role?: unknown;
    };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { phone, role } = payload;
    // Жүргізуші ағынында тегі/аты код расталғаннан кейін сұралады, сондықтан
    // бұл жерде міндетті емес — болмаса, бос жол ретінде сақталады.
    const first_name = typeof payload.first_name === "string" ? payload.first_name : "";
    const last_name = typeof payload.last_name === "string" ? payload.last_name : "";

    if (!phone || !role || typeof phone !== "string" || typeof role !== "string") {
      return jsonResponse(
        { error: "phone, role are required" },
        400,
      );
    }

    if (role !== "passenger" && role !== "driver") {
      return jsonResponse({ error: "role must be 'passenger' or 'driver'" }, 400);
    }

    if (role === "passenger" && (!first_name.trim() || !last_name.trim())) {
      return jsonResponse(
        { error: "first_name, last_name are required for passenger" },
        400,
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return jsonResponse({ error: "Invalid phone number" }, 400);
    }

    // 1) Пайдаланушыны users кестесіне қосу (бұрыннан бар болса — елемеу).
    // INSERT ON CONFLICT (phone) DO NOTHING — телефон бойынша бірегей.
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        first_name,
        last_name,
        role,
      }),
    });
    if (!userRes.ok) {
      const errBody = await userRes.text();
      return jsonResponse(
        { error: "Failed to upsert user", details: errBody },
        500,
      );
    }

    // 2) Пайдаланушының telegram_chat_id-сын алу.
    // Бұрын тіркелген болса, оның chat_id-сы бұрыннан бар — сол кезде
    // кодты бірден Telegram-ға жібереміз (мысалы, "Код қайта жіберу" жағдайы).
    const userRows = await userRes.json();
    let chatId: string | null = null;
    if (Array.isArray(userRows) && userRows.length > 0 && userRows[0]?.telegram_chat_id) {
      chatId = String(userRows[0].telegram_chat_id);
    } else {
      // INSERT жаңа жазба жасаған болса, userRows бос болады
      // (ignore-duplicates + return=representation). Қайта оқимыз.
      const lookupRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(normalizedPhone)}&select=telegram_chat_id&limit=1`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );
      if (lookupRes.ok) {
        const rows = await lookupRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.telegram_chat_id) {
          chatId = String(rows[0].telegram_chat_id);
        }
      }
    }

    // 3) Код жасау.
    const code = generateCode();

    // 4) Кодты verification_codes кестесіне сақтау (5 минут жарамды).
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_codes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          first_name,
          last_name,
          role,
          code,
          verified: false,
        }),
      },
    );
    if (!insertRes.ok) {
      const errBody = await insertRes.text();
      return jsonResponse(
        { error: "Failed to store code", details: errBody },
        500,
      );
    }

    // 5) Егер chat_id бұрыннан байланысқан болса — кодты бірден Telegram-ға жіберу.
    // Бұл "Код қайта жіберу" жағдайы үшін маңызды: пайдаланушы ботқа қайта /start
    // жасамайды, бірақ код келуі керек.
    if (chatId) {
      const roleLabel = role === "passenger" ? "Жолаушы" : "Жүргізуші";
      const text =
        `🔐 <b>Sattilik Taxi растау коды:</b> <code>${code}</code>\n\n` +
        `Сәлем, ${first_name} ${last_name}!\n` +
        `Рөл: ${roleLabel}\n\n` +
        `Код 5 минут ішінде жарамды. Егер сұрамасаңыз — хабарламаны елемеуіңізге болады.`;
      try {
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
          },
        );
      } catch (tgErr) {
        console.error("telegram sendMessage failed:", tgErr);
      }
    }

    // 6) Аппқа Telegram сілтемесін қайтару.
    // Егер chat_id бұрыннан байланысқан болса, апп кодты бірден күтеді
    // — бірақ біз кодты қауіпсіздік үшін қайтармаймыз. Апп "Код жіберілді" деп
    // көрсетеді, пайдаланушы Telegram-тан алады.
    const telegramLink =
      // Telegram deep-link "start" параметрі тек [A-Za-z0-9_-] рұқсат етеді —
      // "+" таңбасы жарамсыз, сондықтан "+"-сыз (тек цифрлар) жібереміз.
      `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${normalizedPhone.replace(/\D/g, "")}`;

    return jsonResponse({
      success: true,
      telegram_link: telegramLink,
      telegram_linked: !!chatId,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
