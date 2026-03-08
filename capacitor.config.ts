import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.foodfactorypos.app',
  appName: 'Food Factory POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
