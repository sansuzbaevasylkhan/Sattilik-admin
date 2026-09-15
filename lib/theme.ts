/**
 * Ортақ түс схемасы — Sattilik такси қосымшасы.
 *
 * Сары алтын (gold) тақырып: көк түстерді алтынмен ауыстыру.
 * - GOLD_PRIMARY: #FFD700 — ашық алтын
 * - GOLD_DARK:    #B8860B — қою алтын / "old gold"
 * - GOLD_LIGHT:   #FFC107 — ашық сары алтын
 * - GOLD_GRADIENT: [ашық алтын, қою алтын] — батырмалар үшін
 * - GOLD_SOFT_FILL, GOLD_BORDER, GOLD_FOCUSED — мөлдір алтын
 */

export const GOLD_PRIMARY = '#FFD700';
export const GOLD_DARK = '#B8860B';
export const GOLD_LIGHT = '#FFC107';

export const GOLD_GRADIENT = [GOLD_PRIMARY, GOLD_DARK] as const;
export const GOLD_GRADIENT_LIGHT = [GOLD_LIGHT, GOLD_PRIMARY] as const;
export const GOLD_GRADIENT_DISABLED = ['rgba(255, 215, 0, 0.4)', 'rgba(184, 134, 11, 0.4)'] as const;

export const GOLD_SOFT_FILL = 'rgba(255, 215, 0, 0.10)';
export const GOLD_MEDIUM_FILL = 'rgba(255, 215, 0, 0.18)';
export const GOLD_STRONG_FILL = 'rgba(255, 215, 0, 0.25)';
export const GOLD_SOFT_BORDER = 'rgba(255, 215, 0, 0.30)';
export const GOLD_MEDIUM_BORDER = 'rgba(255, 215, 0, 0.55)';
export const GOLD_FOCUSED_BORDER = '#FFD700';
export const GOLD_FOCUSED_FILL = 'rgba(255, 215, 0, 0.10)';

export const BG_DARK = '#B8860B';
export const BG_MID = '#DAA520';
export const BG_DEEP = '#FFD700';

/** Фон градиент — алтын сары түстерде. */
export const BG_GRADIENT = [BG_DARK, BG_MID, BG_DEEP] as const;

/** RouteMapPreview ішіндегі GPS маршрут сызығы — сары алтын. */
export const ROUTE_LINE_COLOR = GOLD_PRIMARY;
