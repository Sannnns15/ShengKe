// ══ Theme Constants ══════════════════════════════════════

export const Colors = {
  // Primary
  primary: "#4A90D9",
  primaryLight: "#6BA3E0",
  primaryDark: "#3578B8",

  // Semantic
  success: "#2ECC71",
  warning: "#F39C12",
  error: "#E74C3C",
  info: "#3498DB",

  // Neutrals
  white: "#FFFFFF",
  background: "#F5F5F5",
  card: "#FFFFFF",
  border: "#E0E0E0",
  borderLight: "#F0F0F0",

  // Text
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textPlaceholder: "#BBBBBB",
  textInverse: "#FFFFFF",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
  hero: 34,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
