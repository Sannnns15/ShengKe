// ══ Theme Store ════════════════════════════════════════
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const THEME_KEY = '@shengke_theme';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  isDark: boolean; // 实际生效的暗黑状态
  setMode: (mode: ThemeMode) => void;
  _load: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'system',
  isDark: false,

  setMode: async (mode: ThemeMode) => {
    let isDark = mode === 'dark';
    if (mode === 'system') {
      const scheme = Appearance.getColorScheme();
      isDark = scheme === 'dark';
    }
    set({ mode, isDark });
    await AsyncStorage.setItem(THEME_KEY, mode);
  },

  _load: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      const mode: ThemeMode = (stored as ThemeMode) || 'system';
      let isDark = mode === 'dark';
      if (mode === 'system') {
        const scheme = Appearance.getColorScheme();
        isDark = scheme === 'dark';
      }
      set({ mode, isDark });
    } catch {
      // Default to system
      const scheme = Appearance.getColorScheme();
      set({ mode: 'system', isDark: scheme === 'dark' });
    }
  },
}));
