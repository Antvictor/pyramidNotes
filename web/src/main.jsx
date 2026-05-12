import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import './styles/dark.css'
import './index.css'
import 'antd/dist/reset.css';
import App from './App.jsx'
import { themeService } from './services/themeService';

// Initialize theme on app startup based on saved preference
themeService.setTheme(themeService.getTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
