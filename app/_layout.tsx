import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import { EchoLoadScreen } from '@/components/game/echo-load-screen';
import { GameTheme } from '@/constants/theme';
import { ElsewhereGameProvider } from '@/hooks/use-elsewhere-game';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.setOptions({
  duration: 300,
  fade: true,
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const appNavigationTheme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      background: GameTheme.colors.background,
      card: GameTheme.colors.background,
    },
  };

  return (
    <ThemeProvider value={appNavigationTheme}>
      <View style={{ flex: 1, backgroundColor: GameTheme.colors.background }}>
        <ElsewhereGameProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="link-discord" options={{ title: 'Link Discord' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <EchoLoadScreen />
          <StatusBar style="light" />
        </ElsewhereGameProvider>
      </View>
    </ThemeProvider>
  );
}
