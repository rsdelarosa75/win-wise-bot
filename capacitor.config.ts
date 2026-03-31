import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bobbyvegasai.app',
  appName: 'Bobby Vegas',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
