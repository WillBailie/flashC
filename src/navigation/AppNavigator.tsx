import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';
import DeckListScreen from '../screens/DeckListScreen';
import DeckDetailScreen from '../screens/DeckDetailScreen';
import CardFormScreen from '../screens/CardFormScreen';
import PracticeScreen from '../screens/PracticeScreen';
import TemplateEditorScreen from '../screens/TemplateEditorScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  DeckDetail: { deckId: number; deckName: string };
  CardForm: { deckId: number; cardId?: number };
  Practice: { deckId?: number; deckName?: string; mode?: 'daily' | 'freeflow'; cardCount?: number; reverse?: boolean };
  TemplateEditor: { templateId?: number };
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
        tabBarIcon: ({ focused, size }) => {
          const icons = tabIcons[route.name];
          return (
            <Ionicons
              name={focused ? icons.focused : icons.unfocused}
              size={size}
              color={focused ? colors.primary : colors.textSecondary}
            />
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="DeckList" component={DeckListScreen} options={{ tabBarLabel: 'Decks' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  return (
    <NavigationContainer>
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
          options={({ route }) => ({
            headerTitle: route.params.cardId ? 'Edit Card' : 'New Card',
            headerBackTitle: 'Back',
          })}
        />
        <Stack.Screen name="Practice" component={PracticeScreen} options={{ headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="TemplateEditor"
          component={TemplateEditorScreen}
          options={({ route }) => ({
            headerTitle: route.params.templateId ? 'Edit Template' : 'New Template',
            headerBackTitle: 'Back',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
