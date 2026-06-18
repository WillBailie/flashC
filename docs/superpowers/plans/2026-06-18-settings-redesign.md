# Settings Screen Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the segmented SettingsScreen with a clean card-based layout. Extract inline sub-pages (Stats, Import, Templates) into proper stack screens. Keep AI API key behind a bottom sheet.

**Architecture:** Four `Card` components in a `ScrollView` — Appearance (theme + language chips), Data & Tools (drill-down rows), AI Assistant (toggle + optional API Key row → bottom sheet), Version footer. Two new screens: StatsScreen (extracted StatsView) and ExportScreen (deck picker + format export).

**Tech Stack:** React Native, react-navigation (native-stack), expo-sqlite (for deck list), expo-file-system + expo-sharing (for export), Reanimated (Modal component).

---

### File Structure

| File | Responsibility |
|------|---------------|
| `src/screens/SettingsScreen.tsx` | **Rewrite** — 4-card layout, state for AI toggle/key, navigation dispatch |
| `src/screens/StatsScreen.tsx` | **New** — Extracted StatsView component as standalone screen |
| `src/screens/ExportScreen.tsx` | **New** — Deck list, pick deck, pick format (CSV/JSON), share |
| `src/navigation/AppNavigator.tsx` | **Modify** — Add Stats and Export to RootStackParamList + Stack.Screen entries |
| `src/i18n/translations/en.json` | **Modify** — Add ~12 keys, remove 3 segment keys |
| `src/i18n/translations/zh.json` | **Modify** — Add ~12 Chinese translations |

---

### Task 1: Add Translation Keys

**Files:**
- Modify: `src/i18n/translations/en.json:1-187`
- Modify: `src/i18n/translations/zh.json:1-187`

- [ ] **Step 1: Add new keys to en.json**

After the last `"settings."` key, add these new keys. Remove `settings.segmentImport`, `settings.segmentStats`, `settings.segmentTemplates`.

```json
"settings.appearance": "Appearance",
"settings.themeLabel": "Theme",
"settings.languageLabel": "Language",
"settings.dataTools": "Data & Tools",
"settings.stats": "Stats",
"settings.import": "Import",
"settings.templates": "Templates",
"settings.export": "Export",
"settings.exportTitle": "Export Deck",
"settings.apiKeyRow": "API Key",
"settings.configureApiKey": "Configure API Key",
"settings.version": "Flashcard App",
"settings.testConnection": "Test Key",
"settings.connectionOk": "Connection OK",
```

- [ ] **Step 2: Add Chinese translations to zh.json**

```json
"settings.appearance": "外观",
"settings.themeLabel": "主题",
"settings.languageLabel": "语言",
"settings.dataTools": "数据与工具",
"settings.stats": "统计",
"settings.import": "导入",
"settings.templates": "模板",
"settings.export": "导出",
"settings.exportTitle": "导出牌组",
"settings.apiKeyRow": "API 密钥",
"settings.configureApiKey": "配置 API 密钥",
"settings.version": "闪卡应用",
"settings.testConnection": "测试连接",
"settings.connectionOk": "连接正常",
```

- [ ] **Step 3: Remove obsolete keys from en.json**

Remove these lines:
```json
"settings.segmentImport": "Import",
"settings.segmentStats": "Stats",
"settings.segmentTemplates": "Templates",
```

- [ ] **Step 4: Remove obsolete keys from zh.json**

Remove the corresponding Chinese lines:
```json
"settings.segmentImport": "导入",
"settings.segmentStats": "统计",
"settings.segmentTemplates": "模板",
```

- [ ] **Step 5: Run typecheck + test, commit**

```bash
npx tsc --noEmit && npx jest --passWithNoTests 2>&1 | tail -3
```
Expected: TypeScript clean, all tests pass.

```bash
git add src/i18n/translations/en.json src/i18n/translations/zh.json
git commit -m "i18n: add/remove settings keys for redesign"
```

---

### Task 2: Add Stats and Export Screens to Navigator

**Files:**
- Modify: `src/navigation/AppNavigator.tsx:1-117`

- [ ] **Step 1: Add route params to RootStackParamList**

Add `Import`, `TemplateList`, `Stats`, and `Export` entries:

```tsx
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
```

- [ ] **Step 2: Add imports for new screens**

After `import SettingsScreen from '../screens/SettingsScreen';` add:

```tsx
import ImportScreen from '../screens/ImportScreen';
import TemplateListScreen from '../screens/TemplateListScreen';
import StatsScreen from '../screens/StatsScreen';
import ExportScreen from '../screens/ExportScreen';
```

- [ ] **Step 3: Add Stack.Screen entries**

Add after the last `<Stack.Screen>` entry (TemplateEditor):

```tsx
<Stack.Screen
  name="Import"
  component={ImportScreen}
  options={{ headerTitle: 'Import', headerBackTitle: 'Back' }}
/>
<Stack.Screen
  name="TemplateList"
  component={TemplateListScreen}
  options={{ headerTitle: 'Templates', headerBackTitle: 'Back' }}
/>
<Stack.Screen
  name="Stats"
  component={StatsScreen}
  options={{ headerTitle: 'Stats', headerBackTitle: 'Back' }}
/>
<Stack.Screen
  name="Export"
  component={ExportScreen}
  options={{ headerTitle: 'Export', headerBackTitle: 'Back' }}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: add Stats and Export routes to navigator"
```

---

### Task 3: Create StatsScreen (extracted StatsView)

**Files:**
- Create: `src/screens/StatsScreen.tsx`

- [ ] **Step 1: Create StatsScreen.tsx**

Extract the `StatsView` inner component and its `StatCard` sub-component from `SettingsScreen.tsx` into a standalone screen. No functional changes — pure extraction.

```tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getGlobalStats } from '../storage/database';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { useTranslation } from '../i18n/TranslationContext';

function StatCard({ label, value, icon, color }: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  const { colors } = useTheme();
  const finalColor = color ?? colors.primary;

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      flex: 1,
      minWidth: '45%',
      marginHorizontal: spacing.xs,
      marginBottom: spacing.sm,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: withAlpha(finalColor, 0.125),
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    value: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.heavy,
      color: finalColor,
    },
    label: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
  }), [colors, finalColor]);

  return (
    <View style={styles.wrapper}>
      <Card variant="outlined">
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Ionicons name={icon} size={20} color={finalColor} />
          </View>
          <View style={styles.content}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [stats, setStats] = useState<{
    totalCards: number;
    totalDecks: number;
    totalTemplates: number;
    newCards: number;
    dueCards: number;
    reviewsToday: number;
    avgEaseFactor: number;
    masteredCards: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getGlobalStats().then((s) => {
        if (active) setStats(s);
      });
      return () => { active = false; };
    }, [])
  );

  const containerStyles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    row: { flexDirection: 'row', marginHorizontal: -spacing.xs },
    loading: { flex: 1, alignItems: 'center' as const, padding: spacing.xl, gap: spacing.md },
    loadingText: { color: colors.textSecondary, fontSize: typography.fontSize.md },
  }), [colors]);

  if (!stats) {
    return (
      <View style={containerStyles.container}>
        <View style={containerStyles.loading}>
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
        </View>
      </View>
    );
  }

  const statRows = [
    [
      { label: t('settings.statsTotalCards'), value: stats.totalCards, icon: 'albums' as const, color: colors.primary },
      { label: t('settings.statsTotalDecks'), value: stats.totalDecks, icon: 'book' as const, color: colors.textSecondary },
    ],
    [
      { label: t('home.cardsDue'), value: stats.dueCards, icon: 'alarm' as const, color: stats.dueCards > 0 ? colors.danger : colors.primary },
      { label: t('settings.statsReviewsToday'), value: stats.reviewsToday, icon: 'checkmark-done' as const, color: colors.success },
    ],
    [
      { label: t('settings.statsNewCards'), value: stats.newCards, icon: 'sparkles' as const, color: colors.secondary },
      { label: t('settings.statsMastered'), value: stats.masteredCards, icon: 'star' as const, color: colors.warning },
    ],
    [
      { label: t('settings.statsTemplates'), value: stats.totalTemplates, icon: 'layers' as const, color: colors.primary },
      { label: t('settings.statsAvgEase'), value: stats.avgEaseFactor.toFixed(2), icon: 'trending-up' as const, color: colors.easy },
    ],
  ] as const;

  return (
    <View style={containerStyles.container}>
      <ScrollView style={containerStyles.scroll} contentContainerStyle={containerStyles.content}>
        {statRows.map((row, i) => (
          <View key={i} style={containerStyles.row}>
            {row.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/StatsScreen.tsx
git commit -m "feat: extract StatsScreen from SettingsScreen"
```

---

### Task 4: Create ExportScreen

**Files:**
- Create: `src/screens/ExportScreen.tsx`

- [ ] **Step 1: Create ExportScreen.tsx**

New screen that lists decks, lets user pick one, then offers CSV/JSON format picker.

```tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getAllDecks } from '../storage/database';
import { exportDeckToCSV, exportDeckToJSON } from '../utils/exportCards';
import { Card as CardComponent } from '../components/Card';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useTranslation } from '../i18n/TranslationContext';
import { Deck } from '../models/types';

export default function ExportScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getAllDecks().then(setDecks);
    }, [])
  );

  const handleExport = async (format: 'csv' | 'json') => {
    if (!selectedDeck) return;
    setModalVisible(false);
    try {
      const content = format === 'csv'
        ? await exportDeckToCSV(selectedDeck.id)
        : await exportDeckToJSON(selectedDeck.id);

      const ext = format === 'csv' ? 'csv' : 'json';
      const fileName = `${selectedDeck.name.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, content);
      await Sharing.shareAsync(filePath);
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert(t('import.error'), error?.message || t('import.error'));
      }
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
    deckRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    deckInfo: { flex: 1 },
    deckName: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
    },
    deckLang: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyContent: { padding: spacing.xl },
    exportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    exportText: {
      fontSize: typography.fontSize.md,
      color: colors.text,
      flex: 1,
    },
  }), [colors]);

  if (decks === null) {
    return (
      <View style={[styles.container, { padding: spacing.lg }]}>
        <Skeleton width="100%" height={60} borderRadius={borderRadius.md} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={60} borderRadius={borderRadius.md} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={60} borderRadius={borderRadius.md} />
      </View>
    );
  }

  if (decks.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="document-outline"
          title={t('settings.export')}
          subtitle={t('import.noDecks')}
          style={styles.emptyContent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {decks.map((deck) => (
          <CardComponent key={deck.id} variant="outlined" interactive onPress={() => {
            setSelectedDeck(deck);
            setModalVisible(true);
          }}>
            <View style={styles.deckRow}>
              <View style={styles.deckInfo}>
                <Text style={styles.deckName}>{deck.name}</Text>
                {deck.language ? <Text style={styles.deckLang}>{deck.language}</Text> : null}
              </View>
              <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
            </View>
          </CardComponent>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={t('deckDetail.exportTitle')}
      >
        <Text style={{
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing.lg,
        }}>
          {selectedDeck?.name}
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Button
            title={t('deckDetail.exportCSV')}
            onPress={() => handleExport('csv')}
            variant="primary"
            fullWidth
          />
          <Button
            title={t('deckDetail.exportJSON')}
            onPress={() => handleExport('json')}
            variant="secondary"
            fullWidth
          />
          <Button
            title={t('common.cancel')}
            onPress={() => setModalVisible(false)}
            variant="ghost"
            fullWidth
          />
        </View>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 2: Run typecheck + test**

```bash
npx tsc --noEmit 2>&1 && npx jest --passWithNoTests 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/ExportScreen.tsx
git commit -m "feat: create ExportScreen with deck list and format picker"
```

---

### Task 5: Rewrite SettingsScreen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx:1-479` (full rewrite)

- [ ] **Step 1: Write new SettingsScreen.tsx**

Replace entire file with the new card-based layout.

```tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { getAiEnabled, setAiEnabled, getApiKey, setApiKey } from '../utils/settings';
import { useTranslation } from '../i18n/TranslationContext';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Settings'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [aiEnabled, setAiEnabledLocal] = useState(false);
  const [apiKey, setApiKeyLocal] = useState('');
  const [draftApiKey, setDraftApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [apiKeySheetVisible, setApiKeySheetVisible] = useState(false);

  useEffect(() => {
    getAiEnabled().then(setAiEnabledLocal);
    getApiKey().then((key) => {
      setApiKeyLocal(key);
      setDraftApiKey(key);
    });
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm + 2 },
    card: { padding: spacing.lg },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
    },
    sectionLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.semibold,
      marginBottom: spacing.xs,
    },
    chipRow: { flexDirection: 'row', gap: spacing.sm },
    themeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    themeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeChipText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
    },
    themeChipTextActive: { color: colors.surface },
    langChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 4,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceVariant,
    },
    langChipSelected: {
      backgroundColor: colors.primary,
    },
    langChipText: {
      fontSize: typography.fontSize.sm,
      color: colors.text,
    },
    langChipTextSelected: {
      color: colors.surface,
      fontWeight: typography.fontWeight.semibold,
    },
    toolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm + 2,
    },
    toolRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    toolRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    toolRowText: { fontSize: typography.fontSize.md, color: colors.text },
    toolRowSub: { fontSize: typography.fontSize.xs, color: colors.textSecondary },
    toolRowChevron: { color: colors.border, fontSize: typography.fontSize.md },
    aiToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginBottom: spacing.xs,
    },
    aiTitle: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
    },
    aiDescription: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    apiKeyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    apiKeyLabel: { fontSize: typography.fontSize.sm, color: colors.text },
    apiKeyValue: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
    version: {
      textAlign: 'center',
      fontSize: typography.fontSize.xs,
      color: colors.border,
      paddingVertical: spacing.md,
    },
    sheetContent: { gap: spacing.md },
    testRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
  }), [colors]);

  const themeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    system: 'phone-portrait',
    light: 'sunny',
    dark: 'moon',
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── APPEARANCE CARD ── */}
        <Card variant="elevated">
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('settings.appearance')}</Text>
            </View>
            <Text style={styles.sectionLabel}>{t('settings.themeLabel').toUpperCase()}</Text>
            <View style={styles.chipRow}>
              {(['system', 'light', 'dark'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.themeChip, mode === m && styles.themeChipActive]}
                  onPress={() => setMode(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: mode === m }}
                >
                  <Ionicons
                    name={themeIcons[m]}
                    size={14}
                    color={mode === m ? colors.surface : colors.textSecondary}
                  />
                  <Text style={[styles.themeChipText, mode === m && styles.themeChipTextActive]}>
                    {m === 'system' ? t('settings.themeSystem') : m === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: spacing.md }} />
            <Text style={styles.sectionLabel}>{t('settings.languageLabel').toUpperCase()}</Text>
            <View style={styles.chipRow}>
              {availableLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langChip, language === lang.code && styles.langChipSelected]}
                  onPress={() => setLanguage(lang.code)}
                  accessibilityRole="button"
                  accessibilityLabel={lang.label}
                >
                  <Text style={[styles.langChipText, language === lang.code && styles.langChipTextSelected]}>
                    {lang.nativeLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* ── DATA & TOOLS CARD ── */}
        <Card variant="elevated">
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="construct-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('settings.dataTools')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toolRow, styles.toolRowBorder]}
              onPress={() => navigation.navigate('Stats')}
              accessibilityRole="button"
            >
              <View style={styles.toolRowLeft}>
                <Ionicons name="stats-chart-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.toolRowText}>{t('settings.stats')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolRow, styles.toolRowBorder]}
              onPress={() => navigation.navigate('Import')}
              accessibilityRole="button"
            >
              <View style={styles.toolRowLeft}>
                <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.toolRowText}>{t('settings.import')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolRow, styles.toolRowBorder]}
              onPress={() => navigation.navigate('TemplateList')}
              accessibilityRole="button"
            >
              <View style={styles.toolRowLeft}>
                <Ionicons name="layers-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.toolRowText}>{t('settings.templates')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolRow}
              onPress={() => navigation.navigate('Export')}
              accessibilityRole="button"
            >
              <View style={styles.toolRowLeft}>
                <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.toolRowText}>{t('settings.export')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── AI ASSISTANT CARD ── */}
        <Card variant="elevated">
          <View style={styles.card}>
            <View style={styles.aiToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>{t('settings.aiTitle')}</Text>
              </View>
              <Switch
                value={aiEnabled}
                onValueChange={(v) => {
                  setAiEnabledLocal(v);
                  setAiEnabled(v);
                }}
                trackColor={{ false: colors.border, true: withAlpha(colors.primary, 0.4) }}
                thumbColor={aiEnabled ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={styles.aiDescription}>{t('settings.aiDescription')}</Text>

            {aiEnabled && (
              <TouchableOpacity
                style={styles.apiKeyRow}
                onPress={() => setApiKeySheetVisible(true)}
                accessibilityRole="button"
              >
                <Text style={styles.apiKeyLabel}>{t('settings.apiKeyRow')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={styles.apiKeyValue}>
                    {apiKey ? `sk-${'•'.repeat(4)}${apiKey.slice(-4)}` : t('settings.configureApiKey')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* ── VERSION ── */}
        <Text style={styles.version}>
          {t('settings.version')} v1.0.0 · Expo SDK 56
        </Text>
      </ScrollView>

      {/* ── API KEY BOTTOM SHEET ── */}
      <Modal
        visible={apiKeySheetVisible}
        onClose={() => setApiKeySheetVisible(false)}
        title={t('settings.configureApiKey')}
      >
        <View style={styles.sheetContent}>
          <Input
            label={t('settings.apiKey')}
            placeholder={t('settings.apiKeyPlaceholder')}
            value={draftApiKey}
            onChangeText={setDraftApiKey}
            secureTextEntry={!apiKeyVisible}
          />
          <TouchableOpacity
            onPress={() => setApiKeyVisible(!apiKeyVisible)}
            style={{
              position: 'absolute',
              right: spacing.sm + 4,
              top: spacing.lg + spacing.sm + 29,
            }}
          >
            <Ionicons
              name={apiKeyVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <Button
            title={t('common.save')}
            onPress={() => {
              setApiKeyLocal(draftApiKey);
              setApiKey(draftApiKey);
              setTestStatus('idle');
            }}
            variant={draftApiKey !== apiKey ? 'primary' : 'ghost'}
            disabled={draftApiKey === apiKey}
            fullWidth
          />
          {apiKey !== '' && (
            <View style={styles.testRow}>
              <Button
                title={testing ? t('common.loading') : t('settings.testConnection')}
                onPress={async () => {
                  setTesting(true);
                  setTestStatus('idle');
                  try {
                    const res = await fetch('https://api.deepseek.com/v1/models', {
                      headers: { 'Authorization': `Bearer ${apiKey}` },
                    });
                    setTestStatus(res.ok ? 'success' : 'fail');
                  } catch {
                    setTestStatus('fail');
                  }
                  setTesting(false);
                }}
                variant="secondary"
                size="sm"
                disabled={testing}
              />
              {testStatus === 'success' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.success }}>
                    {t('settings.connectionOk')}
                  </Text>
                </View>
              )}
              {testStatus === 'fail' && (
                <Ionicons name="close-circle" size={18} color={colors.danger} />
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 2: Run typecheck + tests**

```bash
npx tsc --noEmit 2>&1 && npx jest --passWithNoTests 2>&1 | tail -5
```
Expected: TypeScript clean, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: redesign SettingsScreen with card-based layout"
```

---

### Task 6: Final Gate

- [ ] **Step 1: Full typecheck + all tests**

```bash
npx tsc --noEmit 2>&1 && npx jest --passWithNoTests 2>&1 | tail -5
```

- [ ] **Step 2: Check no hardcoded English remains**

```bash
grep -rn 'title="[A-Z][a-z]' src/screens/SettingsScreen.tsx src/screens/StatsScreen.tsx src/screens/ExportScreen.tsx | grep -v 't('
```
Expected: no output.

- [ ] **Step 3: Final commit if any lint fixes needed**
