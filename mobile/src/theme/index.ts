/**
 * LegacyX Mobile Theme — "Refined Dark Luxury"
 *
 * Matches the web design system:
 * - bg #0A0A08, surface #111110, gold #C9A96E
 * - Fonts: System default (closest to Sora) for body, serif for display
 */

export const theme = {
  colors: {
    bg: '#0A0A08',
    surface: '#111110',
    raised: '#1A1918',
    border: '#2A2927',
    text: '#F5F0E8',
    muted: '#8A8780',
    gold: '#C9A96E',
    amber: '#D4782A',
    red: '#C0392B',
    green: '#27AE60',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 999,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    hero: 40,
  },
} as const;

export type Theme = typeof theme;
