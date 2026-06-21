/**
 * Independent layout "slots" merchants can mix and match — each one changes a
 * different part of the storefront, so combined with a theme + accent color
 * the same code renders a large number of distinct-looking stores.
 */

export type HeaderStyle = 'logo-left' | 'logo-center' | 'minimal';
export type HeroStyle = 'classic' | 'banner-overlay' | 'split' | 'none';
export type CardStyle = 'minimal' | 'bordered' | 'shadow' | 'badge';
export type CornerStyle = 'sharp' | 'soft' | 'round';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type TypographyStyle = 'modern' | 'editorial' | 'bold';

export interface SlotOption<T extends string = string> {
  id: T;
  label: string;
  description: string;
}

export interface LayoutSlot<T extends string = string> {
  key: 'headerStyle' | 'heroStyle' | 'cardStyle' | 'cornerStyle' | 'density' | 'typography';
  label: string;
  description: string;
  options: SlotOption<T>[];
}

export const HEADER_STYLE_OPTIONS: SlotOption<HeaderStyle>[] = [
  { id: 'logo-left', label: 'Logo Left', description: 'Logo & name on the left, nav and actions on the right' },
  { id: 'logo-center', label: 'Centered', description: 'Logo & name centered, actions split to either side' },
  { id: 'minimal', label: 'Minimal', description: 'Just the logo and cart — no nav links' },
];

export const HERO_STYLE_OPTIONS: SlotOption<HeroStyle>[] = [
  { id: 'classic', label: 'Classic', description: 'Heading & description stacked above the catalog' },
  { id: 'banner-overlay', label: 'Banner Overlay', description: 'Heading text overlaid on your banner image' },
  { id: 'split', label: 'Split', description: 'Banner image and heading side-by-side' },
  { id: 'none', label: 'None', description: 'Skip the hero — go straight to filters & products' },
];

export const CARD_STYLE_OPTIONS: SlotOption<CardStyle>[] = [
  { id: 'minimal', label: 'Minimal', description: 'Image and text only, no border or shadow' },
  { id: 'bordered', label: 'Bordered', description: 'Clean outline around each product card' },
  { id: 'shadow', label: 'Shadow', description: 'Soft elevated shadow under each card' },
  { id: 'badge', label: 'Badge', description: 'Brand shown as a pill badge over the image' },
];

export const CORNER_STYLE_OPTIONS: SlotOption<CornerStyle>[] = [
  { id: 'sharp', label: 'Sharp', description: 'Square corners — editorial, architectural feel' },
  { id: 'soft', label: 'Soft', description: 'Gently rounded corners (default)' },
  { id: 'round', label: 'Round', description: 'Fully rounded pills & cards — playful, friendly feel' },
];

export const DENSITY_OPTIONS: SlotOption<Density>[] = [
  { id: 'compact', label: 'Compact', description: 'Tighter spacing, more products per screen' },
  { id: 'comfortable', label: 'Comfortable', description: 'Balanced spacing (default)' },
  { id: 'spacious', label: 'Spacious', description: 'Generous whitespace, boutique feel' },
];

export const TYPOGRAPHY_OPTIONS: SlotOption<TypographyStyle>[] = [
  { id: 'modern', label: 'Modern', description: 'Bold sans-serif headings, tight tracking (default)' },
  { id: 'editorial', label: 'Editorial', description: 'Serif headings for a premium magazine feel' },
  { id: 'bold', label: 'Statement', description: 'Black-weight uppercase headings that demand attention' },
];

export const LAYOUT_SLOTS: LayoutSlot[] = [
  { key: 'headerStyle', label: 'Header', description: 'How your logo, nav and actions are arranged', options: HEADER_STYLE_OPTIONS },
  { key: 'heroStyle', label: 'Hero', description: 'How your welcome section is presented', options: HERO_STYLE_OPTIONS },
  { key: 'cardStyle', label: 'Product Cards', description: 'The visual treatment of each product card', options: CARD_STYLE_OPTIONS },
  { key: 'cornerStyle', label: 'Shape', description: 'Corner roundness across the whole store', options: CORNER_STYLE_OPTIONS },
  { key: 'density', label: 'Density', description: 'Spacing between sections, cards & grid items', options: DENSITY_OPTIONS },
  { key: 'typography', label: 'Typography', description: 'The voice of your headings', options: TYPOGRAPHY_OPTIONS },
];

export function cardRadiusClass(corner: CornerStyle): string {
  if (corner === 'sharp') return 'rounded-none';
  if (corner === 'round') return 'rounded-3xl';
  return 'rounded-2xl';
}

export function controlRadiusClass(corner: CornerStyle): string {
  if (corner === 'sharp') return 'rounded-md';
  if (corner === 'round') return 'rounded-full';
  return 'rounded-xl';
}

export function pillRadiusClass(corner: CornerStyle): string {
  if (corner === 'sharp') return 'rounded-sm';
  return 'rounded-full';
}

export function gridGapClass(density: Density): string {
  if (density === 'compact') return 'gap-3';
  if (density === 'spacious') return 'gap-7';
  return 'gap-5';
}

export function sectionGapClass(density: Density): string {
  if (density === 'compact') return 'mb-6 sm:mb-8';
  if (density === 'spacious') return 'mb-12 sm:mb-16';
  return 'mb-10 sm:mb-12';
}

export function headingFontClass(typography: TypographyStyle): string {
  if (typography === 'editorial') return 'font-serif font-semibold tracking-normal';
  if (typography === 'bold') return 'font-black tracking-tighter uppercase';
  return 'font-extrabold tracking-tight';
}
