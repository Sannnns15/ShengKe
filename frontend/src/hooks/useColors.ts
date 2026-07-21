// ══ useColors Hook ══════════════════════════════════════
// Returns the active color palette based on the current theme mode.
// Components should use useColors() instead of importing Colors directly.

import { Colors, DarkColors } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

export function useColors() {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

/**
 * Convenience hook that returns both colors and dark-mode flag.
 */
export function useThemeColors() {
  const isDark = useThemeStore((s) => s.isDark);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  return {
    colors: isDark ? DarkColors : Colors,
    isDark,
    mode,
    setMode,
  };
}
