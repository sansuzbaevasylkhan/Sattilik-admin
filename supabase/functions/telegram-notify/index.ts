// Supabase Edge Function — Telegram Live Monitoring System
//
// This function is triggered by Supabase Database Webhooks to send
// real-time notifications to a dedicated Telegram Admin Group.

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8807728611:AAHuByveDELzqHC6MrtrFLJiErUJ5QPZv_8";
const TELEGRAM_GROUP_ID = Deno.env.get("TELEGRAM_GROUP_ID") || "-1004474212726";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TELEGRAM_API = "https://api.telegram.org";

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  old_record?: any;
  schema: string;
}

function escapeHtml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendTelegramMessage(text: string): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("Telegram API error:", err);
    }
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}

function formatTimestamp(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Almaty" });
  } catch {
    return "—";
  }
}

Deno.serve(async (req: Request) => {
  try {
    const payload: WebhookPayload = await req.json();
    const { table, type, record, old_record } = payload;

    let message = "";
    const separator = "━━━━━━━━━━━━━━━━━━\n";
    const header = `━━━━━━━━━━━━━━━━━━\n🚕 <b>SATtilik TAXI</b>\n📡 <b>LIVE MONITORING</b>\n━━━━━━━━━━━━━━━━━━\n`;

    if (table === 'orders') {
      if (type === 'INSERT') {
        message = `${header}🚕 <b>ЖАҢА ТАПСЫРЫС</b>\n\n` +
          `📦 №: <code>${record.id.substring(0, 8)}</code>\n` +
          `👤 Жолаушы: <b>${escapeHtml(record.passenger_first_name)} ${escapeHtml(record.passenger_last_name)}</b>\n` +
          `📞 Телефон: <code>${escapeHtml(record.passenger_phone)}</code>\n` +
          `📍 Қай жерден: <b>${escapeHtml(record.pickup_address)}</b>\n` +
          `🏁 Қай жерге: <b>${escapeHtml(record.dropoff_address)}</b>\n` +
          `📏 Қашықтық: ${escapeHtml(record.distance)}\n` +
          `💰 Бағасы: <b>${record.price} ₸</b>\n` +
          `🕒 Уақыты: ${formatTimestamp(record.created_at)}\n` +
          `📊 Статус: <i>Жаңа тапсырыс</i>\n\n${separator}`;
      } else if (type === 'UPDATE') {
        // Check for status changes
        if (record.status !== old_record?.status) {
          const statusMap: Record<string, string> = {
            'accepted': '✅ ТАПСЫРЫС ҚАБЫЛДАНДЫ',
            'in_progress': '📍 ЖҮРГІЗУШІ ЖОЛДА',
            'completed': '🏁 САПАР АЯҚТАЛДЫ',
            'cancelled': '❌ ТАПСЫРЫС ТОҚТАТЫЛДЫ',
            'pending': '⏳ Күтуде'
          };
          const statusText = statusMap[record.status] || `Статус өзгерді: ${record.status}`;

          message = `${header}${statusText}\n\n` +
            `📦 №: <code>${record.id.substring(0, 8)}</code>\n` +
            `👤 Жолаушы: ${escapeHtml(record.passenger_first_name)}\n` +
            `🚗 Жүргізуші: ${escapeHtml(record.driver_first_name || 'Ізделуде...')}\n` +
            `💰 Бағасы: <b>${record.price} ₸</b>\n` +
            `🕒 Уақыты: ${formatTimestamp(record.updated_at)}\n` +
            `📊 Статус: <b>${record.status.toUpperCase()}</b>\n\n${separator}`;
        }
        // Check for payment (driver_paid changed to true)
        else if (old_record?.driver_paid === false && record.driver_paid === true) {
          message = `${header}💰 <b>ТӨЛЕМ СӘТТІ ЖАСАЛДЫ</b>\n\n` +
            `📦 №: <code>${record.id.substring(0, 8)}</code>\n` +
            `👤 Жолаушы: ${escapeHtml(record.passenger_first_name)}\n` +
            `🚗 Жүргізуші: ${escapeHtml(record.driver_first_name)}\n` +
            `💵 Сома: <b>${record.driver_paid_amount} ₸</b>\n` +
            `🕒 Уақыты: ${formatTimestamp(record.updated_at)}\n` +
            `📊 Статус: <b>SUCCESS</b>\n\n${separator}`;
        }
      }
    } else if (table === 'users') {
      if (type === 'INSERT') {
        const role = record.role === 'driver' ? '🚗 Жүргізуші' : '👤 Жолаушы';
        message = `${header}<b>${role.toUpperCase()} ТІРКЕЛДІ</b>\n\n` +
          `🆔 ID: <code>${record.id.substring(0, 8)}</code>\n` +
          `👤 Аты: <b>${escapeHtml(record.first_name)} ${escapeHtml(record.last_name)}</b>\n` +
          `📞 Телефон: <code>${escapeHtml(record.phone)}</code>\n` +
          `📅 Тіркелген күні: ${formatTimestamp(record.created_at)}\n` +
          `📱 Қосымша: Sattilik Taxi\n\n${separator}`;
      }
    }

    if (message) {
      await sendTelegramMessage(message);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
