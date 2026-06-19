# Daily Review Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a configurable daily reminder notification that prompts the user to review flashcards.

**Architecture:** New `src/utils/notifications.ts` handles all notification scheduling/permissions. Settings stored via `src/utils/settings.ts`. AppNavigator handles notification-tap deep linking into daily practice. SettingsScreen gets a toggle + time picker.

**Tech Stack:** expo-notifications (local scheduling via `DAILY` trigger), existing settings JSON file.

## Global Constraints

- expo-notifications installed via `npx expo install expo-notifications`
- Add `"expo-notifications"` plugin to app.json
- Daily trigger uses `SchedulableTriggerInputTypes.DAILY` with `{ hour, minute }`
- Notification says "Flashcards" / "Time for your daily review"
- Tap opens Practice screen in daily mode
- Foreground notifications suppressed (shouldShowBanner: false)
- New i18n strings in both en.json and zh.json

---

### Task 1: Install expo-notifications and configure app.json

**Files:**
- Modify: `app.json:29`
- Modify: `package.json`

- [ ] **Step 1: Install expo-notifications**

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: Add plugin to app.json**

In `app.json`, add `"expo-notifications"` to the plugins array:

```json
"plugins": [
  "expo-sqlite",
  "expo-asset",
  "expo-sharing",
  "expo-font",
  "expo-notifications"
],
```

- [ ] **Step 3: Verify install**

```bash
node -e "require('expo-notifications'); console.log('OK')"
```

Expected: `OK`

---

### Task 2: Add notification settings to storage

**Files:**
- Modify: `src/utils/settings.ts`
- Modify: `src/utils/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `getNotificationsEnabled(): Promise<boolean>`, `setNotificationsEnabled(v: boolean): Promise<void>`, `getNotificationHour(): Promise<number>`, `setNotificationHour(v: number): Promise<void>`, `getNotificationMinute(): Promise<number>`, `setNotificationMinute(v: number): Promise<void>`

- [ ] **Step 1: Add failing tests**

In `src/utils/__tests__/settings.test.ts`, add the import at top:

```ts
import { getReverseMode, setReverseMode, clearSettingsCache, getAiEnabled, setAiEnabled, getApiKey, setApiKey, getAppLanguage, setAppLanguage, getDailyLanguage, setDailyLanguage, getDailyWordsData, setDailyWordsData, clearDailyWords, getNotificationsEnabled, setNotificationsEnabled, getNotificationHour, setNotificationHour, getNotificationMinute, setNotificationMinute } from '../settings';
```

Append at end of file (before final `});`):

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/utils/__tests__/settings.test.ts 2>&1 | tail -20
```

Expected: FAIL with "is not a function" or "not exported" errors for the new functions.

- [ ] **Step 3: Implement settings fields**

In `src/utils/settings.ts`, update the `Settings` interface:

```ts
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
```

Update `DEFAULTS`:

```ts
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
```

Add new getter/setter functions at the end of the file (before the last line):

```ts
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
```

Also update the two test assertions for `setReverseMode` that check the full JSON output to include the new defaults:

Change line 43-45 (first setReverseMode test):
```ts
expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
  '/mock/documents/settings.json',
  JSON.stringify({ reverseMode: true, aiEnabled: false, apiKey: '', appLanguage: 'en', themeMode: 'system', dailyLanguage: '', dailyWordsDate: '', dailyWords: [], notificationsEnabled: false, notificationHour: 9, notificationMinute: 0 })
);
```

Change lines 51-54 (second setReverseMode test):
```ts
expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
  '/mock/documents/settings.json',
  JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en', themeMode: 'system', dailyLanguage: '', dailyWordsDate: '', dailyWords: [], notificationsEnabled: false, notificationHour: 9, notificationMinute: 0 })
);
```

Change lines 62-65 (future keys test):
```ts
expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
  '/mock/documents/settings.json',
  JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en', themeMode: 'system', dailyLanguage: '', dailyWordsDate: '', dailyWords: [], notificationsEnabled: false, notificationHour: 9, notificationMinute: 0, futureSetting: 'keep' })
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/utils/__tests__/settings.test.ts 2>&1 | tail -5
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/settings.ts src/utils/__tests__/settings.test.ts
git commit -m "feat: add notification settings to storage"
```

---

### Task 3: Create notifications utility

**Files:**
- Create: `src/utils/notifications.ts`

**Interfaces:**
- Produces: `initializeNotificationHandler(): void`, `requestNotificationPermissions(): Promise<boolean>`, `scheduleDailyReminder(hour: number, minute: number): Promise<void>`, `cancelDailyReminder(): Promise<void>`, `NOTIFICATION_ID: string`

- [ ] **Step 1: Create src/utils/notifications.ts**

```ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const NOTIFICATION_ID = 'daily-review-reminder';

export function initializeNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminder', {
      name: 'Daily Review Reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Flashcards',
      body: 'Time for your daily review',
      data: { screen: 'Practice', mode: 'daily' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/utils/notifications.ts
git commit -m "feat: add notification utility functions"
```

---

### Task 4: Handle notification tap in AppNavigator

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

**Interfaces:**
- Consumes: `NOTIFICATION_ID`, `initializeNotificationHandler`, `scheduleDailyReminder` from `../utils/notifications`
- Consumes: `getNotificationsEnabled`, `getNotificationHour`, `getNotificationMinute` from `../utils/settings`

- [ ] **Step 1: Update AppNavigator.tsx**

Add imports at top:

```ts
import React, { useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
```

Replace the existing `import React from 'react';` with the above.

After the existing imports add:

```ts
import { initializeNotificationHandler, scheduleDailyReminder } from '../utils/notifications';
import { getNotificationsEnabled, getNotificationHour, getNotificationMinute } from '../utils/settings';
```

In `AppNavigator`, add notification handling before the return statement:

```tsx
export default function AppNavigator() {
  const { colors } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    initializeNotificationHandler();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'Practice' && navigationRef.current) {
        navigationRef.current.navigate('Practice', { mode: data.mode || 'daily' });
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
```

Note: add the `navigationRef` type annotation. Change the `NavigationContainer` to use `ref={navigationRef}`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: handle notification tap deep link in navigator"
```

---

### Task 5: Add notification settings UI

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `getNotificationsEnabled`, `setNotificationsEnabled`, `getNotificationHour`, `setNotificationHour`, `getNotificationMinute`, `setNotificationMinute` from `../utils/settings`
- Consumes: `requestNotificationPermissions`, `scheduleDailyReminder`, `cancelDailyReminder` from `../utils/notifications`

- [ ] **Step 1: Add notification card to SettingsScreen**

Add imports at top of SettingsScreen:

```ts
import { getNotificationsEnabled, setNotificationsEnabled, getNotificationHour, setNotificationHour, getNotificationMinute, setNotificationMinute } from '../utils/settings';
import { requestNotificationPermissions, scheduleDailyReminder, cancelDailyReminder } from '../utils/notifications';
```

Add state variables after the existing state declarations (after `const [dailyLanguage, setDailyLanguageState] = useState('');`):

```ts
  const [notificationsEnabled, setNotificationsEnabledLocal] = useState(false);
  const [notificationHour, setNotificationHourLocal] = useState('9');
  const [notificationMinute, setNotificationMinuteLocal] = useState('0');
```

Add to the `useEffect` block to load notification settings:

```ts
  useEffect(() => {
    getAiEnabled().then(setAiEnabledLocal);
    getApiKey().then((key) => {
      setApiKeyLocal(key);
      setDraftApiKey(key);
    });
    getDailyLanguage().then(setDailyLanguageState);
    getNotificationsEnabled().then(setNotificationsEnabledLocal);
    getNotificationHour().then(h => setNotificationHourLocal(String(h)));
    getNotificationMinute().then(m => setNotificationMinuteLocal(String(m)));
  }, []);
```

Add new styles to the `useMemo` block after line 166 (`}), [colors]);`). Insert before the closing `}), [colors]);`:

```ts
    notifToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.xs,
    },
    notifTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      flex: 1,
    },
    notifDesc: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      flexShrink: 1,
      marginBottom: spacing.sm,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.sm + 2,
      marginTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    timeLabel: { fontSize: typography.fontSize.sm, color: colors.text },
    timeInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs + 2,
      fontSize: typography.fontSize.md,
      color: colors.text,
      textAlign: 'center',
      minWidth: 48,
      backgroundColor: colors.background,
    },
    timeColon: { fontSize: typography.fontSize.md, color: colors.text, fontWeight: typography.fontWeight.bold },
```

Add the notification card JSX after the AI card closing `</Card>` (before `{/* VERSION */}`). Insert right after the closing `</Card>` of the AI card and before `{/* VERSION */}`:

```tsx
        {/* NOTIFICATIONS CARD */}
        <Card variant="elevated">
          <View style={styles.cardHeader}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>{t('settings.notifications')}</Text>
          </View>
          <View style={styles.notifToggle}>
            <Text style={[styles.notifDesc, { flex: 1 }]}>
              {t('settings.notificationsDescription')}
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={async (v) => {
                setNotificationsEnabledLocal(v);
                await setNotificationsEnabled(v);
                if (v) {
                  const granted = await requestNotificationPermissions();
                  if (granted) {
                    const h = parseInt(notificationHour) || 9;
                    const m = parseInt(notificationMinute) || 0;
                    await scheduleDailyReminder(h, m);
                  } else {
                    setNotificationsEnabledLocal(false);
                    await setNotificationsEnabled(false);
                  }
                } else {
                  await cancelDailyReminder();
                }
              }}
              trackColor={{ false: colors.border, true: withAlpha(colors.primary, 0.4) }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
          {notificationsEnabled && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{t('settings.notificationTime')}</Text>
              <View style={{ flex: 1 }} />
              <TextInput
                style={styles.timeInput}
                keyboardType="numeric"
                value={notificationHour}
                onChangeText={async (text) => {
                  setNotificationHourLocal(text);
                  const h = parseInt(text) || 9;
                  await setNotificationHour(h);
                  const m = parseInt(notificationMinute) || 0;
                  await scheduleDailyReminder(h, m);
                }}
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.timeColon}>:</Text>
              <TextInput
                style={styles.timeInput}
                keyboardType="numeric"
                value={notificationMinute}
                onChangeText={async (text) => {
                  setNotificationMinuteLocal(text);
                  const h = parseInt(notificationHour) || 9;
                  const m = parseInt(text) || 0;
                  await setNotificationMinute(m);
                  await scheduleDailyReminder(h, m);
                }}
                maxLength={2}
                selectTextOnFocus
              />
            </View>
          )}
        </Card>
```

Add `TextInput` to the RN import line at top. Change:

```ts
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
```

to:

```ts
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
```

- [ ] **Step 2: Run tests**

```bash
npx jest src/screens/__tests__/SettingsScreen.test.tsx 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: add notification settings card with toggle and time picker"
```

---

### Task 6: Add i18n translation strings

**Files:**
- Modify: `src/i18n/translations/en.json`
- Modify: `src/i18n/translations/zh.json`

- [ ] **Step 1: Add English strings**

In `en.json`, add after the existing `settings.dailyLanguage` line (before the closing `}`):

```json
  "settings.notifications": "Notifications",
  "settings.notificationsDescription": "Daily reminder to review your flashcards",
  "settings.notificationTime": "Reminder time"
```

- [ ] **Step 2: Add Chinese strings**

In `zh.json`, add after the existing `settings.dailyLanguage` line:

```json
  "settings.notifications": "通知",
  "settings.notificationsDescription": "每日提醒复习闪卡",
  "settings.notificationTime": "提醒时间"
```

- [ ] **Step 3: Run full test suite**

```bash
npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations/en.json src/i18n/translations/zh.json
git commit -m "feat: add notification i18n strings"
```

---

### Final Verification

- [ ] Run full TypeScript check: `npx tsc --noEmit`
- [ ] Run full test suite: `npx jest --passWithNoTests`
- [ ] Update ROADMAP.md: mark #13 as `done`
