import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import SettingsScreen from '../../screens/SettingsScreen';

jest.mock('../../utils/settings', () => ({
  getThemeMode: jest.fn().mockResolvedValue('system'),
  setThemeMode: jest.fn().mockResolvedValue(undefined),
  getAiEnabled: jest.fn().mockResolvedValue(false),
  setAiEnabled: jest.fn().mockResolvedValue(undefined),
  getApiKey: jest.fn().mockResolvedValue(''),
  setApiKey: jest.fn().mockResolvedValue(undefined),
  getDailyLanguage: jest.fn().mockResolvedValue('en'),
  setDailyLanguage: jest.fn().mockResolvedValue(undefined),
  getNotificationsEnabled: jest.fn().mockResolvedValue(false),
  setNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
  getNotificationHour: jest.fn().mockResolvedValue(9),
  setNotificationHour: jest.fn().mockResolvedValue(undefined),
  getNotificationMinute: jest.fn().mockResolvedValue(0),
  setNotificationMinute: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/notifications', () => ({
  initializeNotificationHandler: jest.fn(),
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
  scheduleDailyReminder: jest.fn().mockResolvedValue(undefined),
  cancelDailyReminder: jest.fn().mockResolvedValue(undefined),
  NOTIFICATION_ID: 'daily-review-reminder',
}));

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: ['en', 'zh', 'es'] }),
}));

jest.mock('../../utils/animation', () => ({
  useReduceMotion: () => false,
  SPRING_CONFIG: {},
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

describe('SettingsScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(SettingsScreen, {})
    );
    await new Promise(r => setTimeout(r, 50));
    expect(toJSON()).toBeTruthy();
  });
});
