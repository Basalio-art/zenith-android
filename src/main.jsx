import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

async function appInit() {
  if (import.meta.env.DEV) {
    const { default: eruda } = await import('eruda');
    eruda.init();
  }

  createRoot(document.getElementById('root')).render(<App />);
}

appInit();
