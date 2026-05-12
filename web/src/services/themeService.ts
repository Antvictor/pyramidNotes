const THEME_KEY = 'pyramid-notes-theme';
const DARK_CLASS = 'dark';

export interface ThemeService {
  toggle(): void;
  setTheme(isDark: boolean): void;
  getTheme(): boolean;
}

class ThemeServiceImpl implements ThemeService {
  private htmlElement: HTMLElement | null = null;

  private getHtmlElement(): HTMLElement {
    if (!this.htmlElement) {
      this.htmlElement = document.documentElement;
    }
    return this.htmlElement;
  }

  toggle(): void {
    const isDark = this.getTheme();
    this.setTheme(!isDark);
  }

  setTheme(isDark: boolean): void {
    const html = this.getHtmlElement();
    if (isDark) {
      html.classList.add(DARK_CLASS);
    } else {
      html.classList.remove(DARK_CLASS);
    }
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }

  getTheme(): boolean {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') {
      return true;
    }
    if (stored === 'light') {
      return false;
    }
    // Default to light theme
    return false;
  }
}

export const themeService = new ThemeServiceImpl();
