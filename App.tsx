import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TranslationProvider } from './src/i18n/TranslationContext';
import AppNavigator from './src/navigation/AppNavigator';

import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Playfair Display': PlayfairDisplay_700Bold,
    'Space Grotesk': SpaceGrotesk_700Bold,
    'JetBrains Mono': JetBrainsMono_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <TranslationProvider>
          <ThemedStatusBar />
          <AppNavigator />
        </TranslationProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
