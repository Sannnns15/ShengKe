import { StyleSheet } from 'react-native';
import { Radius, Spacing, FontSize, FontWeight, Colors, Shadows } from '../constants/theme';

// ── Common Typography Combinations ──────────────────────
export const typography = StyleSheet.create({
  hero: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.hero * 1.2,
    color: Colors.textPrimary,
  },
  h1: {
    fontSize: FontSize.heading1,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.heading1 * 1.2,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: FontSize.heading2,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.heading2 * 1.3,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.body * 1.6,
    color: Colors.textPrimary,
  },
  caption: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.regular,
    color: Colors.textTertiary,
  },
});

// ── Common Layout Combinations ──────────────────────────
export const layout = StyleSheet.create({
  screenPadding: {
    paddingHorizontal: Spacing.page,
  },
  cardPadding: {
    padding: Spacing.cardPadding,
  },
});

// ── Universal Card Styles ───────────────────────────────
export const card = StyleSheet.create({
  base: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    ...Shadows.md,
    padding: Spacing.cardPadding,
  },
  highImpact: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    ...Shadows.lg,
    padding: Spacing.cardPadding,
  },
});
