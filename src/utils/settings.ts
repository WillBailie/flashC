import * as FileSystem from 'expo-file-system/legacy';
import { DailyWord } from '../models/types';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

interface Settings {
  reverseMode: boolean;
  aiEnabled: boolean;
  apiKey: string;
  appLanguage: 'en' | 'zh';
  dailyLanguage: string;
  dailyWordsDate: string;
  dailyWords: DailyWord[];
}

const DEFAULTS: Settings = {
  reverseMode: false,
  aiEnabled: false,
  apiKey: '',
  appLanguage: 'en',
  dailyLanguage: '',
  dailyWordsDate: '',
  dailyWords: [],
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
  return { date: settings.dailyWordsDate, words: settings.dailyWords };
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
