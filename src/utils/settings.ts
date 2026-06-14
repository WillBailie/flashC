import * as FileSystem from 'expo-file-system/legacy';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

interface Settings {
  reverseMode: boolean;
}

const DEFAULTS: Settings = {
  reverseMode: false,
};

async function readSettings(): Promise<Settings> {
  try {
    const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    const parsed = JSON.parse(content);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

async function writeSettings(settings: Settings): Promise<void> {
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
