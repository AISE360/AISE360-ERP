import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aise360.erp',
  appName: 'AISE360 ERP',
  webDir: 'dist',
  // Same Supabase backend as the website — expenses, tasks, CRM all sync live.
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
