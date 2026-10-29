import { AppThemeProvider, useAppTheme } from '@/lib/app-theme';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return <AppThemeProvider><RootNavigator /></AppThemeProvider>;
}

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const [showWebSplash, setShowWebSplash] = useState(Platform.OS === 'web');
  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync();
      setShowWebSplash(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border } }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.root}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        {showWebSplash && <View style={styles.webSplash}><Image source={require('@/assets/images/app-icon.jpg')} resizeMode="contain" style={styles.logo} /></View>}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webSplash: { ...StyleSheet.absoluteFill, zIndex: 1000, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 28 },
  logo: { width: '90%', maxWidth: 440, height: 190 },
});
