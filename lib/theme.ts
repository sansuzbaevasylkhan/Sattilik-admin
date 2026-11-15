/**
 * Global design tokens — Sattilik Taxi.
 *
 * PREMIUM GOLD & BLACK:
 * - Background: gold (#FFD700), secondary gold (#FFC800)
 * - All text: black (#000000)
 * - Buttons: blue (#0066FF), hover/pressed (#0052CC), label white
 * - Borders: #D4AF37
 *
 * Ескі экспорт атаулары (GOLD_*, BG_*) үйлесімділік үшін сақталған,
 * бірақ олардың мәндері жаңа палитраға бейімделген:
 * GOLD_PRIMARY — интерактивті көк, BG_* — алтын фондар.
 */

export const BG = '#FFD700';
export const BG_ALT = '#FFC800';
export const BG_SOFT = '#FFE066';
export const TEXT = '#000000';
export const TEXT_MUTED = 'rgba(0, 0, 0, 0.65)';
export const TEXT_SUBTLE = 'rgba(0, 0, 0, 0.5)';

export const BUTTON = '#0066FF';
export const BUTTON_PRESSED = '#0052CC';
export const BUTTON_LIGHT = '#3385FF';
export const BUTTON_DISABLED = '#9CC0FF';
export const BUTTON_TEXT = '#FFFFFF';

export const BORDER = '#D4AF37';
export const BORDER_SOFT = 'rgba(212, 175, 55, 0.55)';
export const SURFACE = '#FFC800';
export const INPUT_BG = '#FFE066';
export const OVERLAY = 'rgba(0, 0, 0, 0.45)';

export const SHADOW = 'rgba(0, 0, 0, 0.18)';
export const SHADOW_GOLD = 'rgba(212, 175, 55, 0.35)';

/** Интерактивті акцент — ескі атау, енді көк. */
export const GOLD_PRIMARY = BUTTON;
export const GOLD_DARK = BUTTON_PRESSED;
export const GOLD_LIGHT = BUTTON_LIGHT;

/** Батырмаларға арналған көк градиент. */
export const GOLD_GRADIENT = [BUTTON, BUTTON_PRESSED] as const;
export const GOLD_GRADIENT_LIGHT = [BUTTON_LIGHT, BUTTON] as const;
export const GOLD_GRADIENT_DISABLED = [BUTTON_DISABLED, '#7FA8F5'] as const;

/** Көк реңкті жұмсақ фондар/шекаралар (таңдалған күйлер). */
export const GOLD_SOFT_FILL = 'rgba(0, 102, 255, 0.12)';
export const GOLD_MEDIUM_FILL = 'rgba(0, 102, 255, 0.20)';
export const GOLD_STRONG_FILL = 'rgba(0, 102, 255, 0.28)';
export const GOLD_SOFT_BORDER = 'rgba(0, 102, 255, 0.35)';
export const GOLD_MEDIUM_BORDER = 'rgba(0, 102, 255, 0.55)';
export const GOLD_FOCUSED_BORDER = BUTTON;
export const GOLD_FOCUSED_FILL = 'rgba(0, 102, 255, 0.10)';

/** Бет фондары — алтын. */
export const BG_DARK = BG;
export const BG_MID = BG_ALT;
export const BG_DEEP = BG;

/** Фон градиенті — тек алтын реңктер. */
export const BG_GRADIENT = [BG, BG_ALT] as const;

/** Картадағы маршрут сызығы — көк (алтын фонда анық көрінеді). */
export const ROUTE_LINE_COLOR = BUTTON;
