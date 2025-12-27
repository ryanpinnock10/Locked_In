import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ryancp.lockedin',
  appName: 'Locked In',
  webDir: 'out',
  server: {
    // START: Update this to your production URL when deploying!
    // For local dev on Android Emulator, use 'http://10.0.2.2:3000'
    // For iOS Simulator, use 'http://localhost:3000'
    url: 'http://192.168.1.191:3000',
    cleartext: true
  }
};

export default config;
