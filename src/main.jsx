import { createRoot } from 'react-dom/client';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import './index.css';
import App from './App.jsx';

if (Capacitor.isNativePlatform()) {
  SplashScreen.show({
    autoHide: false
  });
}

createRoot(document.getElementById('root')).render(<App />);
