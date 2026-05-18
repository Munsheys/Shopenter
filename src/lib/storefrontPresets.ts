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
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep dark with green accents',
    pageBg: '#0a0d14',
    cardBg: '#161925',
    cardBorder: '#1f2335',
    headerBg: '#0f1117',
    headerBorder: '#1f2335',
    textPrimary: '#ffffff',
    textSecondary: '#c9cde0',
    textMuted: '#9ca3af',
    accent: '#22c55e',
    accentHover: '#16a34a',
    accentText: '#ffffff',
    inputBg: '#1f2335',
    inputBorder: '#2a2e45',
    pillBg: '#1f2335',
    pillActiveBg: '#22c55e',
    pillActiveText: '#ffffff',
  },
  snow: {
    id: 'snow',
    name: 'Snow',
    description: 'Clean white minimal',
    pageBg: '#f8fafc',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    headerBg: '#ffffff',
    headerBorder: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#1e293b',
    textMuted: '#64748b',
    accent: '#22c55e',
    accentHover: '#16a34a',
    accentText: '#ffffff',
    inputBg: '#f1f5f9',
    inputBorder: '#e2e8f0',
    pillBg: '#f1f5f9',
    pillActiveBg: '#22c55e',
    pillActiveText: '#ffffff',
  },
  blush: {
    id: 'blush',
    name: 'Blush',
    description: 'Warm pinks for fashion & beauty',
    pageBg: '#fff5f7',
    cardBg: '#ffffff',
    cardBorder: '#fce7f3',
    headerBg: '#ffffff',
    headerBorder: '#fce7f3',
    textPrimary: '#1f1f2e',
    textSecondary: '#2d1f2e',
    textMuted: '#7c5c75',
    accent: '#ec4899',
    accentHover: '#db2777',
    accentText: '#ffffff',
    inputBg: '#fdf2f8',
    inputBorder: '#fce7f3',
    pillBg: '#fdf2f8',
    pillActiveBg: '#ec4899',
    pillActiveText: '#ffffff',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue for premium stores',
    pageBg: '#0a1628',
    cardBg: '#0f2040',
    cardBorder: '#1e3a5f',
    headerBg: '#0a1628',
    headerBorder: '#1e3a5f',
    textPrimary: '#e0f2fe',
    textSecondary: '#bae6fd',
    textMuted: '#7cb9d6',
    accent: '#38bdf8',
    accentHover: '#0ea5e9',
    accentText: '#0a1628',
    inputBg: '#0f2040',
    inputBorder: '#1e3a5f',
    pillBg: '#1e3a5f',
    pillActiveBg: '#38bdf8',
    pillActiveText: '#0a1628',
  },
  kraft: {
    id: 'kraft',
    name: 'Kraft',
    description: 'Earthy warm tones for handmade & food',
    pageBg: '#fdf6ec',
    cardBg: '#fffbf5',
    cardBorder: '#e8d5b7',
    headerBg: '#fffbf5',
    headerBorder: '#e8d5b7',
    textPrimary: '#2c1a0e',
    textSecondary: '#3d2410',
    textMuted: '#6b5035',
    accent: '#d97706',
    accentHover: '#b45309',
    accentText: '#ffffff',
    inputBg: '#fdf3e3',
    inputBorder: '#e8d5b7',
    pillBg: '#fdf3e3',
    pillActiveBg: '#d97706',
    pillActiveText: '#ffffff',
  },
};

export const DEFAULT_PRESET = PRESETS.midnight;

export function resolvePreset(preset: string, accentOverride?: string): StorefrontPreset {
  const base = PRESETS[preset] ?? DEFAULT_PRESET;
  if (accentOverride && /^#[0-9a-fA-F]{6}$/.test(accentOverride)) {
    return { ...base, accent: accentOverride, accentHover: accentOverride, pillActiveBg: accentOverride };
  }
  return base;
}
