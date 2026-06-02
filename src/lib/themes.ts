export type Theme = 'light' | 'lite' | 'dark';

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceDeep: string;
  border: string;
  text: string;
  muted: string;
  input: string;
}

export function getThemeTokens(theme: Theme): ThemeTokens {
  if (theme === 'dark') {
    return {
      bg: 'bg-[#0f1117]',
      surface: 'bg-[#161925] border border-[#1f2335]',
      surfaceDeep: 'bg-[#1a1d2e]',
      border: 'border-[#1f2335]',
      text: 'text-white',
      muted: 'text-[#8b92ad]',
      input: 'bg-[#1a1d2e] border-[#2d3555] text-white placeholder-[#4a5068] focus:border-[#3d4a7a] focus:outline-none',
    };
  }
  if (theme === 'lite') {
    return {
      bg: 'bg-[#d9dfe8]',
      surface: 'bg-[#e7ecf3] border border-[#cdd3dd]',
      surfaceDeep: 'bg-[#dce1ea]',
      border: 'border-[#cdd3dd]',
      text: 'text-[#2f3744]',
      muted: 'text-[#6b7585]',
      input: 'bg-white border-[#cdd3dd] text-[#2f3744] placeholder-[#9aa3b0] focus:border-[#7b8fa6] focus:outline-none',
    };
  }
  // light (default)
  return {
    bg: 'bg-slate-50',
    surface: 'bg-white border border-slate-200',
    surfaceDeep: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-900',
    muted: 'text-slate-500',
    input: 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none',
  };
}
