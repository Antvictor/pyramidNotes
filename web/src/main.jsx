import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/dark.css'
import './index.css'
import App from './App.jsx'
import { themeService } from './services/themeService';
import { initializeI18n } from './i18n';

async function bootstrap() {
  let settings = { theme: 'system', language: 'system' };

  try {
    if (window.api?.getSettings) {
      settings = { ...settings, ...(await window.api.getSettings()) };
    }
  } catch (error) {
    console.error('Failed to load startup settings:', error);
  }

  themeService.setThemeMode(settings.theme || 'system');

  try {
    await initializeI18n(settings.language, navigator.languages);
  } catch (error) {
    console.error('Failed to initialize language:', error);
    await initializeI18n('en', ['en']);
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
