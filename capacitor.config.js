import { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.CAP_DEV === 'true';

const config = {
  appId: 'com.basalioart.zenith',
  appName: 'Zenith',
  webDir: 'dist',
  server: {
    cleartext: true,
    ...(isDev && {
      url: 'http://127.0.0.1:5173'
    })
  },
  plugins: {
    CapacitorHttp: {
      enabled: false
    },
    SystemBars: {
      insetsHandling: "css",
      style: "DEFAULT",
      hidden: true,
      animation: "NONE"
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DEFAULT",
      backgroundColor: "#ffffff"
    }
  }
};

export default config;