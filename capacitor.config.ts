import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.decfd41d7f73412e8678bb257bb9c2d4',
  appName: 'win-wise-bot',
  webDir: 'dist',
  server: {
    url: "https://decfd41d-7f73-412e-8678-bb257bb9c2d4.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;