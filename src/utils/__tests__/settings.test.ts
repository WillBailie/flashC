import * as FileSystem from 'expo-file-system/legacy';
import { getReverseMode, setReverseMode, clearSettingsCache, getAiEnabled, setAiEnabled, getApiKey, setApiKey, getAppLanguage, setAppLanguage, getDailyLanguage, setDailyLanguage, getDailyWordsData, setDailyWordsData, clearDailyWords, getNotificationsEnabled, setNotificationsEnabled, getNotificationHour, setNotificationHour, getNotificationMinute, setNotificationMinute, getDailyTemplateId, setDailyTemplateId } from '../settings';
import { DailyWord } from '../../models/types';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

const mockedFs = jest.mocked(FileSystem);

describe('settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSettingsCache();
  });

  describe('getReverseMode', () => {
    it('returns false when settings file does not exist', async () => {
      mockedFs.readAsStringAsync.mockRejectedValue(new Error('ENOENT'));
      const result = await getReverseMode();
      expect(result).toBe(false);
    });

    it('returns persisted value when set', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: true }));
      const result = await getReverseMode();
      expect(result).toBe(true);
    });

    it('returns default for malformed JSON', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue('not json');
      const result = await getReverseMode();
      expect(result).toBe(false);
    });
  });

  describe('setReverseMode', () => {
    it('writes true to settings file', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: false }));
      await setReverseMode(true);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: true, aiEnabled: false, apiKey: '', appLanguage: 'en', themeMode: 'system', dailyLanguage: '', dailyWordsDate: '', dailyWords: [], notificationsEnabled: false, notificationHour: 9, notificationMinute: 0, dailyTemplateId: null })
      );
    });

    it('writes false to settings file', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: true }));
      await setReverseMode(false);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en', themeMode: 'system', dailyLanguage: '', dailyWordsDate: '', dailyWords: [], notificationsEnabled: false, notificationHour: 9, notificationMinute: 0, dailyTemplateId: null })
      );
    });

    it('preserves future unknown keys', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(
        JSON.stringify({ reverseMode: true, futureSetting: 'keep' })
      );
      await setReverseMode(false);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en', themeMode: 'system', dailyLanguage: '', dailyWordsDate: '', dailyWords: [], notificationsEnabled: false, notificationHour: 9, notificationMinute: 0, dailyTemplateId: null, futureSetting: 'keep' })
      );
    });

    it('handles write failure silently', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: false }));
      mockedFs.writeAsStringAsync.mockRejectedValue(new Error('disk full'));
      await expect(setReverseMode(true)).resolves.not.toThrow();
    });
  });

  describe('AI settings', () => {
    beforeEach(async () => {
      await setAiEnabled(false);
      await setApiKey('');
    });

    test('getAiEnabled returns false when not set', async () => {
      const enabled = await getAiEnabled();
      expect(enabled).toBe(false);
    });

    test('setAiEnabled and getAiEnabled round-trip', async () => {
      await setAiEnabled(true);
      expect(await getAiEnabled()).toBe(true);
      await setAiEnabled(false);
      expect(await getAiEnabled()).toBe(false);
    });

    test('getApiKey returns empty string when not set', async () => {
      const key = await getApiKey();
      expect(key).toBe('');
    });

    test('setApiKey and getApiKey round-trip', async () => {
      await setApiKey('sk-test-key-123');
      expect(await getApiKey()).toBe('sk-test-key-123');
      await setApiKey('');
      expect(await getApiKey()).toBe('');
    });
  });

  describe('App language', () => {
    test('getAppLanguage returns en by default', async () => {
      const lang = await getAppLanguage();
      expect(lang).toBe('en');
    });

    test('setAppLanguage and getAppLanguage round-trip', async () => {
      await setAppLanguage('zh');
      expect(await getAppLanguage()).toBe('zh');
      await setAppLanguage('en');
      expect(await getAppLanguage()).toBe('en');
    });
  });

  describe('Daily language', () => {
    test('getDailyLanguage returns empty string by default', async () => {
      const lang = await getDailyLanguage();
      expect(lang).toBe('');
    });

    test('setDailyLanguage and getDailyLanguage round-trip', async () => {
      await setDailyLanguage('French');
      expect(await getDailyLanguage()).toBe('French');
      await setDailyLanguage('');
      expect(await getDailyLanguage()).toBe('');
    });
  });

  describe('Daily words', () => {
    test('getDailyWordsData returns empty by default', async () => {
      const data = await getDailyWordsData();
      expect(data.date).toBe('');
      expect(data.words).toEqual([]);
    });

    test('setDailyWordsData and getDailyWordsData round-trip', async () => {
      const words: DailyWord[] = [{ front: 'bonjour', back: 'hello', complexity: 2, fields: { Front: 'bonjour', Back: 'hello' } }];
      await setDailyWordsData('2026-06-21', words);
      const data = await getDailyWordsData();
      expect(data.date).toBe('2026-06-21');
      expect(data.words[0].front).toBe('bonjour');
      expect(data.words[0].fields).toEqual({ Front: 'bonjour', Back: 'hello' });
    });

    test('clearDailyWords resets to empty', async () => {
      const words: DailyWord[] = [{ front: 'bonjour', back: 'hello', complexity: 2, fields: { Front: 'bonjour', Back: 'hello' } }];
      await setDailyWordsData('2026-06-21', words);
      await clearDailyWords();
      const data = await getDailyWordsData();
      expect(data.date).toBe('');
      expect(data.words).toEqual([]);
    });

    test('normalizes old daily words without fields', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({
        dailyWordsDate: '2026-06-21',
        dailyWords: [{ front: 'hola', back: 'hello', complexity: 2 }],
      }));
      const data = await getDailyWordsData();
      expect(data.words[0].fields).toEqual({ Front: 'hola', Back: 'hello' });
      expect(data.words[0].front).toBe('hola');
    });
  });

  describe('Notifications', () => {
    test('getNotificationsEnabled returns false by default', async () => {
      const enabled = await getNotificationsEnabled();
      expect(enabled).toBe(false);
    });

    test('setNotificationsEnabled and getNotificationsEnabled round-trip', async () => {
      await setNotificationsEnabled(true);
      expect(await getNotificationsEnabled()).toBe(true);
      await setNotificationsEnabled(false);
      expect(await getNotificationsEnabled()).toBe(false);
    });

    test('getNotificationHour returns 9 by default', async () => {
      const hour = await getNotificationHour();
      expect(hour).toBe(9);
    });

    test('setNotificationHour and getNotificationHour round-trip', async () => {
      await setNotificationHour(18);
      expect(await getNotificationHour()).toBe(18);
    });

    test('getNotificationMinute returns 0 by default', async () => {
      const minute = await getNotificationMinute();
      expect(minute).toBe(0);
    });

    test('setNotificationMinute and getNotificationMinute round-trip', async () => {
      await setNotificationMinute(30);
      expect(await getNotificationMinute()).toBe(30);
    });
  });

  describe('dailyTemplateId', () => {
    test('getDailyTemplateId returns null by default', async () => {
      const id = await getDailyTemplateId();
      expect(id).toBeNull();
    });

    test('setDailyTemplateId and getDailyTemplateId round-trip', async () => {
      await setDailyTemplateId(3);
      expect(await getDailyTemplateId()).toBe(3);
      await setDailyTemplateId(null);
      expect(await getDailyTemplateId()).toBeNull();
    });
  });
});
