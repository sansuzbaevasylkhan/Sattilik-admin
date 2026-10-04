// Supabase Edge Function — Telegram Bot webhook.
//
// Схема:
//  1) Апп send-code-қа POST жасайды → users INSERT, verification_codes INSERT.
//  2) send-code аппқа { telegram_link: "https://t.me/<bot>?start=<phone>" } қайтарады.
//  3) Пайдаланушы сілтемені ашып, ботта "Start" басады.
//  4) Telegram ботқа "/start <phone>" жібереді → осы функция шақырылады.
//  5) Біз phone-ты шығарып, users.telegram_chat_id-ны жазамыз (PATCH).
//  6) verification_codes-тан осы phone үшін ең жаңа жарамды кодты алып,
//     Telegram sendMessage арқылы сол кодты чатқа жібереміз.

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// /admin командасына тек осы телефон нөмірімен Telegram-ды байланыстырған
// адам ғана жауап ала алады. supabase secrets set ADMIN_PHONE=+7XXXXXXXXXX
const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE");

const TELEGRAM_API = "https://api.telegram.org";

interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  from?: { id: number; first_name?: string };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    console.error("telegram sendMessage failed:", err);
  }
}

async function fetchCount(path: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  const contentRange = res.headers.get("content-range"); // мыс. "0-0/42"
  const total = contentRange?.split("/")[1];
  return total ? parseInt(total, 10) || 0 : 0;
}

async function buildAdminStatsMessage(): Promise<string> {
  const [usersTotal, passengers, drivers, telegramLinked, ordersTotal] =
    await Promise.all([
      fetchCount("users?select=id"),
      fetchCount("users?select=id&role=eq.passenger"),
      fetchCount("users?select=id&role=eq.driver"),
      fetchCount("users?select=id&telegram_chat_id=not.is.null"),
      fetchCount("orders?select=id"),
    ]);

  return (
    `📊 <b>Sattilik Taxi — статистика</b>\n\n` +
    `👥 Барлық тіркелгендер: <b>${usersTotal}</b>\n` +
    `🧍 Жолаушылар: <b>${passengers}</b>\n` +
    `🚗 Жүргізушілер: <b>${drivers}</b>\n` +
    `📲 Telegram-мен байланысқандар: <b>${telegramLinked}</b>\n` +
    `🧾 Жасалған тапсырыстар (пайдаланғандар): <b>${ordersTotal}</b>`
  );
}

/**
 * +7XXXXXXXXXX форматына келтіру. URL-дан келген "+" белгісіз.
 */
function normalizePhone(arg: string): string | null {
  const digits = arg.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 12 && digits.startsWith("7")) return `+${digits}`;
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1) Webhook қауіпсіздігі: Telegram жіберетін secret token header-ды тексеру.
  // TELEGRAM_WEBHOOK_SECRET орнатылмаса, тексеруді өткізіп жібереміз —
  // бұл жергілікті/dev ортада ыңғайлы. Продакшнда міндетті түрде
  // орнатыңыз: supabase secrets set TELEGRAM_WEBHOOK_SECRET=<random-string>
  const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (TELEGRAM_WEBHOOK_SECRET && secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TELEGRAM_BOT_TOKEN) {
    return jsonResponse({ error: "env missing" }, 500);
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, 400);
  }

  const message = update.message;
  if (!message || !message.text) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const chatId = message.chat.id;
  const firstName = message.from?.first_name ?? "дос";
  const text = message.text.trim();

  if (text === "/admin") {
    if (!ADMIN_PHONE || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ ok: true, admin: false, reason: "not configured" });
    }

    // Осы chat_id-мен байланысқан пайдаланушының телефоны ADMIN_PHONE-мен
    // сәйкес пе — солай ғана статистика көрсетіледі.
    const adminCheckRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?telegram_chat_id=eq.${encodeURIComponent(String(chatId))}&select=phone&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );
    const adminRows = adminCheckRes.ok ? await adminCheckRes.json() : [];
    const requesterPhone = Array.isArray(adminRows) && adminRows.length > 0 ? adminRows[0]?.phone : null;

    if (requesterPhone !== ADMIN_PHONE) {
      await sendTelegramMessage(chatId, `⛔ Бұл команда тек әкімшіге арналған.`);
      return jsonResponse({ ok: true, admin: false });
    }

    const statsMessage = await buildAdminStatsMessage();
    await sendTelegramMessage(chatId, statsMessage);
    return jsonResponse({ ok: true, admin: true, statsSent: true });
  }

  if (!text.startsWith("/start")) {
    await sendTelegramMessage(
      chatId,
      `Сәлем, ${firstName}! 👋\n\n` +
        `Бұл бот тек Sattilik Taxi тіркелу кезінде растау кодтарын жіберу үшін қолданылады.`,
    );
    return jsonResponse({ ok: true });
  }

  // /start командасынан кейінгі аргумент — телефон нөмірі.
  const arg = text.split(/\s+/).slice(1).join(" ").trim();
  if (!arg) {
    await sendTelegramMessage(
      chatId,
      `Сәлем, ${firstName}! 👋\n\n` +
        `Sattilik Taxi қосымшасын ашып, тіркелу кезіндегі "Telegram-ты ашу" батырмасын басыңыз.`,
    );
    return jsonResponse({ ok: true, noArg: true });
  }

  const phone = normalizePhone(arg);
  if (!phone) {
    await sendTelegramMessage(
      chatId,
      `Қателік: сілтемедегі нөмір дұрыс емес.\n` +
        `Sattilik Taxi қосыммасында қайтадан тіркеліп көріңіз.`,
    );
    return jsonResponse({ ok: true, invalidArg: true });
  }

  // 2) Пайдаланушыны phone бойынша табу.
  const userRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=id,first_name&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!userRes.ok) {
    return jsonResponse({ error: "db error" }, 500);
  }
  const rows = await userRes.json();
  const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

  if (!user) {
    await sendTelegramMessage(
      chatId,
      `Сәлем, ${firstName}! 👋\n\n` +
        `Сіздің нөміріңіз ${phone} тіркелу парағында табылмады.\n` +
        `Sattilik Taxi қосымшасында "Код жіберу" батырмасын басып, қайтадан бастаңыз.`,
    );
    return jsonResponse({ ok: true, noUser: true });
  }

  // 3) users.telegram_chat_id бағанын жаңарту.
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ telegram_chat_id: String(chatId) }),
    },
  );
  if (!patchRes.ok) {
    console.error("users update failed:", await patchRes.text());
    return jsonResponse({ error: "db update failed" }, 500);
  }

  // 4) Осы phone үшін ең жаңа жарамды кодты табу.
  const nowIso = new Date().toISOString();
  const codeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/verification_codes?phone=eq.${encodeURIComponent(phone)}&verified=eq.false&expires_at=gt.${encodeURIComponent(nowIso)}&order=created_at.desc&limit=1&select=code,first_name`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!codeRes.ok) {
    return jsonResponse({ error: "db error" }, 500);
  }
  const codeRows = await codeRes.json();
  const pending = Array.isArray(codeRows) && codeRows.length > 0 ? codeRows[0] : null;

  if (!pending) {
    await sendTelegramMessage(
      chatId,
      `Сәлем, ${user.first_name}! 👋\n\n` +
        `Сіздің нөміріңіз Telegram-қа байланысты.\n` +
        `Бірақ жарамды растау коды табылмады — Sattilik қосымшасында "Код жіберу" батырмасын қайта басыңыз.`,
    );
    return jsonResponse({ ok: true, linked: true, noPendingCode: true });
  }

  // 5) Кодты Telegram-ға жіберу.
  const code = pending.code;
  const firstNameForCode = pending.first_name || user.first_name || firstName;
  await sendTelegramMessage(
    chatId,
    `Сәлем, ${firstNameForCode}! 👋\n\n` +
      `🔐 <b>Sattilik Taxi растау коды:</b> <code>${code}</code>\n\n` +
      `Код 5 минут ішінде жарамды. Егер сұрамасаңыз — хабарламаны елемеуіңізге болады.`,
  );

  return jsonResponse({ ok: true, linked: true, codeSent: true });
});
