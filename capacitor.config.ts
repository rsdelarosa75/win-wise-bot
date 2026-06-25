import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bobbyvegasai.picks',
  appName: 'Bobby Vegas',
  webDir: 'dist',
  server: {
    url: 'https://win-wise-bot.vercel.app',
    cleartext: false,
    allowNavigation: ['*'],
  },
  ios: {
    contentInset: 'never',
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
