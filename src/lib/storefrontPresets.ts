export interface StorefrontPreset {
  id: string;
  name: string;
  description: string;
  // Backgrounds
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  headerBorder: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Accent (CTA buttons, prices, active states)
  accent: string;
  accentHover: string;
  accentText: string;
  // Input / search
  inputBg: string;
  inputBorder: string;
  // Pill / badge
  pillBg: string;
  pillActiveBg: string;
  pillActiveText: string;
}

export const PRESETS: Record<string, StorefrontPreset> = {
  linen: {
    id: 'linen',
    name: 'Linen',
    description: 'Warm cream & charcoal, sage accent',
    pageBg: '#f0ede8',
    cardBg: '#ffffff',
    cardBorder: '#e3ded5',
    headerBg: '#f0ede8',
    headerBorder: '#1a1d2e14',
    textPrimary: '#1a1d2e',
    textSecondary: '#1a1d2e',
    textMuted: '#1a1d2e80',
    accent: '#3d5a3e',
    accentHover: '#2f4630',
    accentText: '#ffffff',
    inputBg: '#ffffff',
    inputBorder: '#1a1d2e1a',
    pillBg: '#ffffff',
    pillActiveBg: '#1a1d2e',
    pillActiveText: '#ffffff',
  },
  noir: {
    id: 'noir',
    name: 'Noir',
    description: 'Black & gold, premium boutique',
    pageBg: '#0b0b0d',
    cardBg: '#161618',
    cardBorder: '#2a2a2e',
    headerBg: '#0b0b0d',
    headerBorder: '#2a2a2e',
    textPrimary: '#f5f0e6',
    textSecondary: '#d8d2c4',
    textMuted: '#8a8578',
    accent: '#c9a227',
    accentHover: '#a9851d',
    accentText: '#0b0b0d',
    inputBg: '#1c1c1f',
    inputBorder: '#2e2e33',
    pillBg: '#1c1c1f',
    pillActiveBg: '#c9a227',
    pillActiveText: '#0b0b0d',
  },
  porcelain: {
    id: 'porcelain',
    name: 'Porcelain',
    description: 'Clean minimal white, deep indigo',
    pageBg: '#fafafa',
    cardBg: '#ffffff',
    cardBorder: '#e7e7ea',
    headerBg: '#ffffff',
    headerBorder: '#ececef',
    textPrimary: '#14141a',
    textSecondary: '#3c3c46',
    textMuted: '#8d8d99',
    accent: '#2952e3',
    accentHover: '#1f3fc0',
    accentText: '#ffffff',
    inputBg: '#f4f4f6',
    inputBorder: '#e7e7ea',
    pillBg: '#f4f4f6',
    pillActiveBg: '#14141a',
    pillActiveText: '#ffffff',
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Warm clay tones, handmade & lifestyle',
    pageBg: '#fbf3ec',
    cardBg: '#fffaf5',
    cardBorder: '#ecd9c4',
    headerBg: '#fbf3ec',
    headerBorder: '#ecd9c4',
    textPrimary: '#3a2418',
    textSecondary: '#5b3a26',
    textMuted: '#9c7a5e',
    accent: '#c1542c',
    accentHover: '#9c3f1f',
    accentText: '#ffffff',
    inputBg: '#fff3e9',
    inputBorder: '#ecd9c4',
    pillBg: '#fff3e9',
    pillActiveBg: '#c1542c',
    pillActiveText: '#ffffff',
  },
};

export const DEFAULT_PRESET = PRESETS.linen;

export function resolvePreset(preset: string, accentOverride?: string): StorefrontPreset {
  const base = PRESETS[preset] ?? DEFAULT_PRESET;
  if (accentOverride && /^#[0-9a-fA-F]{6}$/.test(accentOverride)) {
    return { ...base, accent: accentOverride, accentHover: accentOverride, pillActiveBg: accentOverride };
  }
  return base;
}

const ANNOUNCEMENT_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  amber: '#f59e0b',
  red: '#ef4444',
};

/** Resolves the announcement bar background. 'accent' (or unset) follows the active accent/gradient. */
export function resolveAnnouncementColor(color: string | undefined, localAccentBg: string): string {
  if (!color || color === 'accent') return localAccentBg;
  return ANNOUNCEMENT_COLORS[color] ?? localAccentBg;
}
