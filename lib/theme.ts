/** Shared Sattilik Taxi palette: blue surfaces with gold actions and accents. */
export const BG = '#F3F7FF';
export const BG_ALT = '#E4EEFF';
export const BG_SOFT = '#D8E5F5';
export const TEXT = '#102A43';
export const TEXT_MUTED = 'rgba(16, 42, 67, 0.68)';
export const TEXT_SUBTLE = 'rgba(16, 42, 67, 0.5)';

export const BUTTON = '#FFD700';
export const BUTTON_PRESSED = '#E6B800';
export const BUTTON_LIGHT = '#FFE566';
export const BUTTON_DISABLED = '#E7DFA8';
export const BUTTON_TEXT = '#102A43';

export const BORDER = '#B8CCE8';
export const BORDER_SOFT = 'rgba(10, 61, 145, 0.22)';
export const SURFACE = '#FFFFFF';
export const INPUT_BG = '#F8FAFF';
export const OVERLAY = 'rgba(7, 27, 55, 0.45)';

export const SHADOW = 'rgba(7, 27, 55, 0.16)';
export const SHADOW_GOLD = 'rgba(212, 175, 55, 0.28)';

// Keep legacy GOLD_* exports to avoid breaking existing screens.
export const GOLD_PRIMARY = BUTTON;
export const GOLD_DARK = BUTTON_PRESSED;
export const GOLD_LIGHT = BUTTON_LIGHT;
export const GOLD_GRADIENT = [BUTTON_LIGHT, BUTTON_PRESSED] as const;
export const GOLD_GRADIENT_LIGHT = [BUTTON_LIGHT, BUTTON] as const;
export const GOLD_GRADIENT_DISABLED = [BUTTON_DISABLED, '#D7DDF0'] as const;
export const GOLD_SOFT_FILL = 'rgba(255, 215, 0, 0.16)';
export const GOLD_MEDIUM_FILL = 'rgba(255, 215, 0, 0.26)';
export const GOLD_STRONG_FILL = 'rgba(255, 215, 0, 0.38)';
export const GOLD_SOFT_BORDER = 'rgba(212, 175, 55, 0.45)';
export const GOLD_MEDIUM_BORDER = 'rgba(212, 175, 55, 0.68)';
export const GOLD_FOCUSED_BORDER = BUTTON_PRESSED;
export const GOLD_FOCUSED_FILL = 'rgba(255, 215, 0, 0.12)';

export const BG_DARK = BG;
export const BG_MID = BG_ALT;
export const BG_DEEP = BG;
export const BG_GRADIENT = [BG, BG_ALT] as const;
export const ROUTE_LINE_COLOR = '#0A3D91';
