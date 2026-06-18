import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TranslationProvider } from './src/i18n/TranslationContext';
import AppNavigator from './src/navigation/AppNavigator';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
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
