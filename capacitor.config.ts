import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gulibrary.app',
  appName: "Gú's Library",
  webDir: 'dist',
  // Cream behind the WebView until the page paints: same as the splash and the opening doors' cover.
  backgroundColor: '#E9E5CD',
};

export default config;
