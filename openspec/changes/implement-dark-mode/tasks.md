## 1. CSS Variables Setup

- [ ] 1.1 Create `src/styles/variables.css` with light theme CSS variables
- [ ] 1.2 Create `src/styles/dark.css` with dark theme CSS variable overrides
- [ ] 1.3 Import both CSS files in the project entry point

## 2. Theme Service Implementation

- [ ] 2.1 Create `src/services/themeService.ts` with `toggle()`, `setTheme(isDark: boolean)`, `getTheme()` methods
- [ ] 2.2 Implement localStorage persistence for theme preference
- [ ] 2.3 Implement `html` element class toggling logic

## 3. Store Integration

- [ ] 3.1 Create `src/stores/themeStore.ts` for theme state management
- [ ] 3.2 Integrate themeService with themeStore for reactive state

## 4. Theme Initialization

- [ ] 4.1 Initialize theme on app startup based on saved preference
- [ ] 4.2 Apply dark class on html element during SSR/hydration to prevent flash
