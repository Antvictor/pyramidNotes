## 1. CSS Variables Setup

- [x] 1.1 Create `src/styles/variables.css` with light theme CSS variables
- [x] 1.2 Create `src/styles/dark.css` with dark theme CSS variable overrides
- [x] 1.3 Import both CSS files in the project entry point

## 2. Theme Service Implementation

- [x] 2.1 Create `src/services/themeService.ts` with `toggle()`, `setTheme(isDark: boolean)`, `getTheme()` methods
- [x] 2.2 Implement localStorage persistence for theme preference
- [x] 2.3 Implement `html` element class toggling logic

## 3. Store Integration

- [x] 3.1 Create `src/stores/themeStore.ts` for theme state management
- [x] 3.2 Integrate themeService with themeStore for reactive state

## 4. Theme Initialization

- [x] 4.1 Initialize theme on app startup based on saved preference
- [x] 4.2 Apply dark class on html element during SSR/hydration to prevent flash
