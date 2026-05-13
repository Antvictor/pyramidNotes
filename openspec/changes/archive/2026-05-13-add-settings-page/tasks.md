## 1. Settings Infrastructure

- [x] 1.1 Create `settings.json` schema with defaults (theme, storagePath, autoUpdate, language)
- [x] 1.2 Implement Electron IPC handler for reading settings.json
- [x] 1.3 Implement Electron IPC handler for writing settings.json
- [x] 1.4 Add settings validation and fallback to defaults logic

## 2. Settings UI - Basic Info

- [x] 2.1 Create SettingsPage React component with three-section layout
- [x] 2.2 Implement theme mode selector (Light/Dark/System radio buttons)
- [x] 2.3 Add storage location display and change button
- [x] 2.4 Wire up theme selector to persist preference
- [x] 2.5 Wire up storage location to persist preference

## 3. Settings UI - Other Section

- [x] 3.1 Display system version (from Electron app.getVersion())
- [x] 3.2 Add auto-update toggle switch
- [x] 3.3 Add help link button
- [x] 3.4 Add language selector dropdown

## 4. Settings UI - Common Operations

- [x] 4.1 Create empty placeholder section for Common Operations

## 5. Theme Integration

- [x] 5.1 Update theme initialization to read from settings.json
- [x] 5.2 Apply theme immediately when user changes selection
- [x] 5.3 Handle System theme by listening to media query changes

## 6. Storage Path Integration

- [x] 6.1 Update file reading logic to use storage path from settings
- [x] 6.2 Update file writing logic to use storage path from settings
- [x] 6.3 Add directory picker dialog for storage location change
