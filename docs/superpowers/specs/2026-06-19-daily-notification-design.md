# Daily Review Notification Design

## Summary

Add a configurable daily reminder notification that prompts the user to do their flashcard review. Uses `expo-notifications` for local scheduled notifications — no push/remote infrastructure needed.

## Configurable Options

- **Enable/disable toggle** — turn the daily reminder on or off
- **Time picker** — set the hour and minute the notification fires each day (default: 9:00 AM)

## Architecture

### New file: `src/utils/notifications.ts`

All notification logic lives here:

| Function | Purpose |
|----------|---------|
| `requestPermissions()` | Prompt iOS/Android for notification permissions |
| `scheduleDailyReminder(hour, minute)` | Cancel existing + schedule new daily recurring notification |
| `cancelDailyReminder()` | Remove any scheduled daily reminder |
| `initializeHandler()` | Configure `setNotificationHandler` (show banner in background, not foreground) |

### Settings storage: `src/utils/settings.ts`

Add three fields to the persistent settings JSON:

- `notificationsEnabled: boolean` (default `false`)
- `notificationHour: number` (default `9`)
- `notificationMinute: number` (default `0`)

Six new getter/setter pairs: `getNotificationsEnabled`/`setNotificationsEnabled`, `getNotificationHour`/`setNotificationHour`, `getNotificationMinute`/`setNotificationMinute`.

### Settings UI: `src/screens/SettingsScreen.tsx`

New **Notifications** card below the current cards:
- Toggle switch for enable/disable (`Switch` component, updates state + reschedules/cancels)
- Time picker (two `TextInput` fields for hour/minute, or native time picker) — visible only when enabled
- Changing the time reschedules the notification immediately

### App initialization: `src/navigation/AppNavigator.tsx`

On app mount:
1. Call `initializeHandler()` to configure foreground notification behavior
2. Listen for notification tap responses — if tapped, navigate to `Practice` screen with `{ mode: 'daily' }`
3. If notifications are enabled in settings, reschedule the daily reminder (handles app update / device reboot cases)

### Notification Content

```
Title: "Flashcards"
Body:  "Time for your daily review"
Data:  { screen: 'Practice', mode: 'daily' }
```

### Trigger

`SchedulableTriggerInputTypes.DAILY` with `{ hour, minute }` from settings.

### Foreground Behavior

`setNotificationHandler` returns `{ shouldShowBanner: false }` — don't interrupt the user if they're already using the app.

## Dependencies

- `expo-notifications` — install via `npx expo install expo-notifications`
- No additional packages needed (`expo-task-manager` not required since we're not using background fetch, just local scheduling)

## App Config

Add to `app.json` plugins:
```json
"expo-notifications"
```

No custom plugin config needed (default icon/color are fine).

## Files

| File | Change |
|------|--------|
| `src/utils/notifications.ts` | New |
| `src/utils/settings.ts` | +3 settings fields, +6 functions |
| `src/screens/SettingsScreen.tsx` | New Notifications card |
| `src/navigation/AppNavigator.tsx` | Init handler + deep-link on tap |
| `app.json` | + plugin |
| `src/i18n/translations/en.json` | New strings |
| `src/i18n/translations/zh.json` | New strings |
| `src/utils/__tests__/settings.test.ts` | Tests for new settings |
