import type { CapacitorConfig } from '@capacitor/cli';

// The iOS app is the same web app in a native shell (ios/). Build it with
// `npm run ios:sync`, then open ios/App in Xcode. appId is the App Store
// bundle identifier: final once the first build is uploaded.
const config: CapacitorConfig = {
  appId: 'ch.maillot.app',
  appName: 'MAILLOT',
  webDir: 'dist',
  backgroundColor: '#0A0C0B',
  ios: {
    contentInset: 'never',
    // Links to the website open inside the app instead of Safari.
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#0A0C0B', showSpinner: false },
    StatusBar: { style: 'DARK', overlaysWebView: true }
  }
};

export default config;
