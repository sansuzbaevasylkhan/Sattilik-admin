// Telegram ботының @username-і бір жерден оқылады.
// Мәнді .env / EAS env арқылы беріңіз: EXPO_PUBLIC_TELEGRAM_BOT_USERNAME=sattiliktaxiappcodebot
const botUsername = process.env.EXPO_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ?? "";

export const TELEGRAM_BOT_USERNAME = botUsername;

export function buildTelegramStartLink(startPayload: string): string | null {
  if (!botUsername) return null;
  const payload = startPayload.trim();
  if (!payload) return null;
  return `https://t.me/${botUsername}?start=${payload}`;
}
