export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'pyramid-notes-theme';
const DARK_CLASS = 'dark';

export interface ThemeService {
  setThemeMode(mode: ThemeMode): void;
}

class ThemeServiceImpl implements ThemeService {
  private htmlElement: HTMLElement | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private themeMode: ThemeMode = 'system';

  constructor() {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    }
  }

  private getHtmlElement(): HTMLElement {
    if (!this.htmlElement) {
      this.htmlElement = document.documentElement;
    }
    return this.htmlElement;
  }

  private handleSystemThemeChange(): void {
    if (this.themeMode === 'system') {
      this.applyThemeForMode('system');
    }
  }

  private applyThemeForMode(mode: ThemeMode): void {
    const html = this.getHtmlElement();
    if (mode === 'dark') {
      html.classList.add(DARK_CLASS);
    } else if (mode === 'light') {
      html.classList.remove(DARK_CLASS);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        html.classList.add(DARK_CLASS);
      } else {
        html.classList.remove(DARK_CLASS);
      }
    }
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode = mode;
    localStorage.setItem(THEME_KEY, mode);
    this.applyThemeForMode(mode);
  }
}

export const themeService = new ThemeServiceImpl();
