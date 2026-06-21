import * as FileSystem from 'expo-file-system/legacy';
import { DailyWord } from '../models/types';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

interface Settings {
  reverseMode: boolean;
  aiEnabled: boolean;
  apiKey: string;
  appLanguage: 'en' | 'zh';
  themeMode: 'system' | 'light' | 'dark';
  dailyLanguage: string;
  dailyWordsDate: string;
  dailyWords: DailyWord[];
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
}

const DEFAULTS: Settings = {
  reverseMode: false,
  aiEnabled: false,
  apiKey: '',
  appLanguage: 'en',
  themeMode: 'system',
  dailyLanguage: '',
  dailyWordsDate: '',
  dailyWords: [],
  notificationsEnabled: false,
  notificationHour: 9,
  notificationMinute: 0,
};

let cache: Settings | null = null;

export function clearSettingsCache(): void {
  cache = null;
}

async function readSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    const parsed = JSON.parse(content);
    const merged: Settings = { ...DEFAULTS, ...parsed };
    cache = merged;
    return merged;
  } catch {
    const defaults: Settings = { ...DEFAULTS };
    cache = defaults;
    return defaults;
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  cache = { ...settings };
  try {
    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
  } catch {
    // Fail silently — settings are non-critical
  }
}

export async function getReverseMode(): Promise<boolean> {
  const settings = await readSettings();
  return settings.reverseMode;
}

export async function setReverseMode(value: boolean): Promise<void> {
  const settings = await readSettings();
  settings.reverseMode = value;
  await writeSettings(settings);
}

export async function getAiEnabled(): Promise<boolean> {
  const settings = await readSettings();
  return settings.aiEnabled;
}

export async function setAiEnabled(value: boolean): Promise<void> {
  const settings = await readSettings();
  settings.aiEnabled = value;
  await writeSettings(settings);
}

export async function getApiKey(): Promise<string> {
  const settings = await readSettings();
  return settings.apiKey;
}

export async function setApiKey(value: string): Promise<void> {
  const settings = await readSettings();
  settings.apiKey = value;
  await writeSettings(settings);
}

export async function getAppLanguage(): Promise<'en' | 'zh'> {
  const settings = await readSettings();
  return settings.appLanguage;
}

export async function setAppLanguage(lang: 'en' | 'zh'): Promise<void> {
  const settings = await readSettings();
  settings.appLanguage = lang;
  await writeSettings(settings);
}

export async function getThemeMode(): Promise<'system' | 'light' | 'dark'> {
  const settings = await readSettings();
  return settings.themeMode;
}

export async function setThemeMode(mode: 'system' | 'light' | 'dark'): Promise<void> {
  const settings = await readSettings();
  settings.themeMode = mode;
  await writeSettings(settings);
}

export async function getDailyLanguage(): Promise<string> {
  const settings = await readSettings();
  return settings.dailyLanguage;
}

export async function setDailyLanguage(value: string): Promise<void> {
  const settings = await readSettings();
  settings.dailyLanguage = value;
  await writeSettings(settings);
}

export async function getDailyWordsData(): Promise<{ date: string; words: DailyWord[] }> {
  const settings = await readSettings();
  const words: DailyWord[] = settings.dailyWords.map((w: any) => {
    if (w.fields && typeof w.fields === 'object') {
      return { fields: w.fields, front: w.front || '', back: w.back || '', complexity: w.complexity ?? 1 };
    }
    return { fields: { Front: w.front || '', Back: w.back || '' }, front: w.front || '', back: w.back || '', complexity: w.complexity ?? 1 };
  });
  return { date: settings.dailyWordsDate, words };
}

export async function setDailyWordsData(date: string, words: DailyWord[]): Promise<void> {
  const settings = await readSettings();
  settings.dailyWordsDate = date;
  settings.dailyWords = words;
  await writeSettings(settings);
}

export async function clearDailyWords(): Promise<void> {
  const settings = await readSettings();
  settings.dailyWordsDate = '';
  settings.dailyWords = [];
  await writeSettings(settings);
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const settings = await readSettings();
  return settings.notificationsEnabled;
}

export async function setNotificationsEnabled(value: boolean): Promise<void> {
  const settings = await readSettings();
  settings.notificationsEnabled = value;
  await writeSettings(settings);
}

export async function getNotificationHour(): Promise<number> {
  const settings = await readSettings();
  return settings.notificationHour;
}

export async function setNotificationHour(value: number): Promise<void> {
  const settings = await readSettings();
  settings.notificationHour = value;
  await writeSettings(settings);
}

export async function getNotificationMinute(): Promise<number> {
  const settings = await readSettings();
  return settings.notificationMinute;
}

export async function setNotificationMinute(value: number): Promise<void> {
  const settings = await readSettings();
  settings.notificationMinute = value;
  await writeSettings(settings);
}
