import * as FileSystem from 'expo-file-system/legacy';
import { getReverseMode, setReverseMode, clearSettingsCache, getAiEnabled, setAiEnabled, getApiKey, setApiKey, getAppLanguage, setAppLanguage } from '../settings';

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
        JSON.stringify({ reverseMode: true, aiEnabled: false, apiKey: '', appLanguage: 'en' })
      );
    });

    it('writes false to settings file', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: true }));
      await setReverseMode(false);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en' })
      );
    });

    it('preserves future unknown keys', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(
        JSON.stringify({ reverseMode: true, futureSetting: 'keep' })
      );
      await setReverseMode(false);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en', futureSetting: 'keep' })
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
});
