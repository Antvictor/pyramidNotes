import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/dark.css'
import './index.css'
import 'antd/dist/reset.css';
import App from './App.jsx'
import { themeService } from './services/themeService';

// Initialize theme on app startup based on saved preference
async function initTheme() {
  try {
    if (window.api && window.api.getSettings) {
      const settings = await window.api.getSettings();
      themeService.setThemeMode(settings.theme || 'system');
    } else {
      themeService.setTheme(themeService.getTheme());
    }
  } catch (error) {
    console.error('Failed to load theme settings:', error);
    themeService.setTheme(themeService.getTheme());
  }
}

initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
