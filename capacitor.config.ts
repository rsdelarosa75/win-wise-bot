import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bobbyvegasai.picks',
  appName: 'Bobby Vegas',
  webDir: 'dist',
  server: {
    iosScheme: 'ionic',
    allowNavigation: ['*'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
