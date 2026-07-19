// ══ Design System: Theme Tokens ═══════════════════════════
// Warm palette for a personal journaling app.
// 8-point spacing grid, React Native shadows.

// ── Colours ──────────────────────────────────────────────
export const Colors = {
  // Core
  primary: '#D4A574',        // 暖驼色 — 主色
  primaryLight: '#E8C9A6',   // 浅驼色
  primaryDark: '#B8895C',    // 深驼色

  // Backgrounds
  bg: '#FAF8F5',             // 米白 — 页面背景
  bgCard: '#FFFFFF',         // 白色 — 卡片背景
  bgCardElevated: '#FFFFFF', // 白色（阴影感知）
  bgSecondary: '#F5F0EB',    // 浅米色 — 次级背景
  bgTertiary: '#EDE6DC',     // 中米色 — AI 区块

  // Text
  textPrimary: '#2C2416',    // 暖黑色 — 正文
  textSecondary: '#7A6E5D',  // 暖灰 — 二级文字
  textTertiary: '#A89C8A',   // 浅暖灰 — 占位符
  textInverse: '#FFFFFF',    // 白色文字
  textAccent: '#D4A574',     // 主色文字

  // Borders & Dividers
  border: '#EDE6DC',         // 米色边框
  borderLight: '#F2EDE5',    // 浅边框
  divider: '#EBE4DA',        // 分割线

  // Status
  success: '#7EB07E',        // 柔绿
  warning: '#E0B87A',        // 暖黄
  error: '#D48080',          // 柔红
  info: '#80A8C8',           // 柔蓝

  // Mood colors
  moodHappy: '#E8C9A6',      // 开心
  moodSad: '#A8B8C8',        // 难过
  moodCalm: '#B8D4B8',       // 平静
  moodAngry: '#D4A0A0',      // 生气
  moodWarm: '#F0D5B8',       // 温暖
  moodCold: '#A8C0D4',       // 冷漠

  // Shadows
  shadowSm: 'rgba(44, 36, 22, 0.06)',
  shadowMd: 'rgba(44, 36, 22, 0.08)',
  shadowLg: 'rgba(44, 36, 22, 0.10)',

  // Overlay
  overlay: 'rgba(44, 36, 22, 0.4)',
  overlayLight: 'rgba(44, 36, 22, 0.15)',
} as const;

// ── Spacing (8-point grid) ──────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  page: 20,         // 页面边距
  cardPadding: 16,  // 卡片内边距
} as const;

// ── Typography ──────────────────────────────────────────
export const FontSize = {
  caption: 11,
  small: 13,
  body: 15,
  bodyLarge: 17,
  heading3: 19,
  heading2: 22,
  heading1: 28,
  hero: 36,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
} as const;

// ── Radius ──────────────────────────────────────────────
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ── Shadows (React Native compatible) ───────────────────
export const Shadows = {
  sm: {
    shadowColor: Colors.shadowSm,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadowMd,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.shadowLg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;
