import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bobbyvegasai.picks',
  appName: 'Bobby Vegas',
  webDir: 'dist',
  server: {
    iosScheme: 'ionic',
    allowNavigation: ['*'],
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
