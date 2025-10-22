import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
// Import notifications service to initialize notification handler
import './src/services/notifications';

export default function App() {
  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '359536687611-bvuaih3374i672rn77sgm9r26e86mfa0.apps.googleusercontent.com',
      iosClientId: '359536687611-mbh4rs4ijl8pbdnglne2u00a69839s0g.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
