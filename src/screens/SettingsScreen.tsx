import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getGlobalStats } from '../storage/database';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { Input } from '../components/Input';
import { getAiEnabled, setAiEnabled, getApiKey, setApiKey } from '../utils/settings';
import ImportScreen from './ImportScreen';
import TemplateListScreen from './TemplateListScreen';

type Section = 'import' | 'stats' | 'templates';

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

function StatsView() {
  const { colors } = useTheme();
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
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    row: { flexDirection: 'row', marginHorizontal: -spacing.xs },
    loading: { flex: 1, alignItems: 'center', padding: spacing.xl, gap: spacing.md },
    loadingText: { color: colors.textSecondary, fontSize: typography.fontSize.md },
  }), [colors]);

  if (!stats) {
    return (
      <View style={containerStyles.loading}>
        <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
        <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
        <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
        <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
      </View>
    );
  }

  const statRows = [
    [
      { label: 'Total Cards', value: stats.totalCards, icon: 'albums', color: colors.primary },
      { label: 'Decks', value: stats.totalDecks, icon: 'book', color: colors.textSecondary },
    ],
    [
      { label: 'Due for Review', value: stats.dueCards, icon: 'alarm', color: stats.dueCards > 0 ? colors.danger : colors.primary },
      { label: 'Reviews Today', value: stats.reviewsToday, icon: 'checkmark-done', color: colors.success },
    ],
    [
      { label: 'New Cards', value: stats.newCards, icon: 'sparkles', color: colors.secondary },
      { label: 'Mastered', value: stats.masteredCards, icon: 'star', color: colors.warning },
    ],
    [
      { label: 'Templates', value: stats.totalTemplates, icon: 'layers', color: colors.primary },
      { label: 'Avg Ease', value: stats.avgEaseFactor.toFixed(2), icon: 'trending-up', color: colors.easy },
    ],
  ] as const;

  return (
    <ScrollView style={containerStyles.scroll} contentContainerStyle={containerStyles.content}>
      {statRows.map((row, i) => (
        <View key={i} style={containerStyles.row}>
          {row.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

export default function SettingsScreen() {
  const [section, setSection] = useState<Section>('import');
  const { colors, mode, setMode } = useTheme();
  const [aiEnabled, setAiEnabledLocal] = useState(false);
  const [apiKey, setApiKeyLocal] = useState('');
  const [draftApiKey, setDraftApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'fail'>('idle');

  useEffect(() => {
    getAiEnabled().then(setAiEnabledLocal);
    getApiKey().then((key) => {
      setApiKeyLocal(key);
      setDraftApiKey(key);
    });
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    segmentRow: {
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      backgroundColor: colors.border,
      borderRadius: borderRadius.md,
      padding: 4,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: borderRadius.sm,
    },
    segmentActive: { backgroundColor: colors.surface },
    segmentText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.semibold,
    },
    segmentTextActive: {
      color: colors.primary,
      fontWeight: typography.fontWeight.bold,
    },
    themeRow: {
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.xs,
      alignItems: 'center',
    },
    themeIcon: {
      marginRight: spacing.xs,
    },
    themeOption: {
      flex: 1,
      paddingVertical: spacing.xs + 2,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 4,
    },
    themeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeOptionText: {
      fontSize: typography.fontSize.xs,
      color: colors.text,
      fontWeight: typography.fontWeight.semibold,
    },
    themeOptionTextActive: { color: colors.surface },
    aiSection: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    aiToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    aiTitle: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
    },
    aiDescription: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 1,
    },
  }), [colors]);

  const themeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    system: 'phone-portrait',
    light: 'sunny',
    dark: 'moon',
  };

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        {(['import', 'stats', 'templates'] as Section[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.segmentButton, section === s && styles.segmentActive]}
            onPress={() => setSection(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === s }}
            accessibilityLabel={`${s} tab`}
          >
            <Text style={[styles.segmentText, section === s && styles.segmentTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.themeRow}>
        <Ionicons name={themeIcons[mode]} size={18} color={colors.textSecondary} style={styles.themeIcon} />
        {(['system', 'light', 'dark'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.themeOption, mode === m && styles.themeOptionActive]}
            onPress={() => setMode(m)}
            accessibilityRole="radio"
            accessibilityState={{ selected: mode === m }}
            accessibilityLabel={`${m} theme`}
          >
            <Ionicons
              name={
                m === 'system' ? 'phone-portrait' :
                m === 'light' ? 'sunny' : 'moon'
              }
              size={14}
              color={mode === m ? colors.surface : colors.textSecondary}
            />
            <Text style={[styles.themeOptionText, mode === m && styles.themeOptionTextActive]}>
              {m === 'system' ? 'Auto' : m === 'light' ? 'Light' : 'Dark'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.aiSection}>
        <View style={styles.aiToggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>AI Example Generation</Text>
            <Text style={styles.aiDescription}>Generate example sentences during practice</Text>
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
        {aiEnabled && (
          <View>
            <Input
              label="DeepSeek API Key"
              placeholder="Enter your API key"
              value={draftApiKey}
              onChangeText={setDraftApiKey}
              secureTextEntry={!apiKeyVisible}
            />
            <TouchableOpacity
              onPress={() => setApiKeyVisible(!apiKeyVisible)}
              style={{ position: 'absolute', right: spacing.sm + 4, top: 28 }}
            >
              <Ionicons
                name={apiKeyVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setApiKeyLocal(draftApiKey);
                setApiKey(draftApiKey);
                setTestStatus('idle');
              }}
              style={{
                marginTop: spacing.xs,
                alignSelf: 'flex-end',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 2,
                borderRadius: borderRadius.sm,
                backgroundColor: draftApiKey !== apiKey ? colors.primary : colors.border,
              }}
              disabled={draftApiKey === apiKey}
            >
              <Text style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: draftApiKey !== apiKey ? colors.surface : colors.textSecondary,
              }}>
                Save
              </Text>
            </TouchableOpacity>
            {apiKey !== '' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                <TouchableOpacity
                  onPress={async () => {
                    setTesting(true);
                    setTestStatus('idle');
                    try {
                      const res = await fetch(
                        'https://api.deepseek.com/v1/models',
                        {
                          headers: { 'Authorization': `Bearer ${apiKey}` },
                        }
                      );
                      setTestStatus(res.ok ? 'success' : 'fail');
                    } catch {
                      setTestStatus('fail');
                    }
                    setTesting(false);
                  }}
                  disabled={testing}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 2,
                    borderRadius: borderRadius.sm,
                    backgroundColor: withAlpha(colors.primary, 0.1),
                  }}
                >
                  <Text style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.primary,
                  }}>
                    {testing ? 'Testing...' : 'Test Key'}
                  </Text>
                </TouchableOpacity>
                {testStatus === 'success' && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                )}
                {testStatus === 'fail' && (
                  <Ionicons name="close-circle" size={18} color={colors.danger} />
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {section === 'import' && <ImportScreen />}
      {section === 'stats' && <StatsView />}
      {section === 'templates' && <TemplateListScreen />}
    </View>
  );
}
