import { themeService } from '../services/themeService';
import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: themeService.getTheme(),
  toggle: () => {
    themeService.toggle();
    set({ isDark: themeService.getTheme() });
  },
  setTheme: (isDark: boolean) => {
    themeService.setTheme(isDark);
    set({ isDark });
  },
}));
