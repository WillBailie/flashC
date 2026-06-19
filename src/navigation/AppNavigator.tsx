import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';
import { useTranslation } from '../i18n/TranslationContext';
import DeckListScreen from '../screens/DeckListScreen';
import DeckDetailScreen from '../screens/DeckDetailScreen';
import CardFormScreen from '../screens/CardFormScreen';
import PracticeScreen from '../screens/PracticeScreen';
import TemplateEditorScreen from '../screens/TemplateEditorScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ImportScreen from '../screens/ImportScreen';
import TemplateListScreen from '../screens/TemplateListScreen';
import StatsScreen from '../screens/StatsScreen';
import ExportScreen from '../screens/ExportScreen';
import * as Notifications from 'expo-notifications';
import { initializeNotificationHandler, scheduleDailyReminder } from '../utils/notifications';
import { getNotificationsEnabled, getNotificationHour, getNotificationMinute } from '../utils/settings';

export type RootStackParamList = {
  MainTabs: undefined;
  DeckDetail: { deckId: number; deckName: string };
  CardForm: { deckId: number; cardId?: number };
  Practice: { deckId?: number; deckName?: string; mode?: 'daily' | 'freeflow'; cardCount?: number; reverse?: boolean };
  TemplateEditor: { templateId?: number };
  Import: undefined;
  TemplateList: undefined;
  Stats: undefined;
  Export: undefined;
};

export type TabParamList = {
  Home: undefined;
  DeckList: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const tabIcons: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
    Home: { focused: 'home', unfocused: 'home-outline' },
    DeckList: { focused: 'library', unfocused: 'library-outline' },
    Settings: { focused: 'settings', unfocused: 'settings-outline' },
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: route.name === 'Home' ? t('tab.home')
          : route.name === 'DeckList' ? t('tab.decks')
          : route.name === 'Settings' ? t('tab.settings')
          : route.name,
        tabBarIcon: ({ focused, size }) => {
          const icons = tabIcons[route.name];
          return (
            <Ionicons
              name={focused ? icons.focused : icons.unfocused}
              size={size}
              color={focused ? colors.tabActive : colors.tabInactive}
            />
          );
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="DeckList" component={DeckListScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    initializeNotificationHandler();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'Practice' && navigationRef.current) {
        navigationRef.current.navigate('Practice', { mode: (data.mode as 'daily' | 'freeflow') || 'daily' });
      }
    });

    getNotificationsEnabled().then(async (enabled) => {
      if (enabled) {
        const hour = await getNotificationHour();
        const minute = await getNotificationMinute();
        await scheduleDailyReminder(hour, minute);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={{ headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="CardForm"
          component={CardFormScreen}
          options={{ headerBackTitle: 'Back' }}
        />
        <Stack.Screen name="Practice" component={PracticeScreen} options={{ headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="TemplateEditor"
          component={TemplateEditorScreen}
          options={{ headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Import"
          component={ImportScreen}
          options={{ headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="TemplateList"
          component={TemplateListScreen}
          options={{ headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{ headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Export"
          component={ExportScreen}
          options={{ headerBackTitle: 'Back' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
