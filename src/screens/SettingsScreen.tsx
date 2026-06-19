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
import { getAiEnabled, setAiEnabled, getApiKey, setApiKey, getDailyLanguage, setDailyLanguage } from '../utils/settings';
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
  const [dailyLanguage, setDailyLanguageState] = useState('');

  useEffect(() => {
    getAiEnabled().then(setAiEnabledLocal);
    getApiKey().then((key) => {
      setApiKeyLocal(key);
      setDraftApiKey(key);
    });
    getDailyLanguage().then(setDailyLanguageState);
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
    themeChipTextActive: { color: colors.textInverse },
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
      color: colors.textInverse,
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
      paddingTop: spacing.sm + 2,
      marginTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    apiKeyLabel: { fontSize: typography.fontSize.sm, color: colors.text },
    apiKeyValue: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginRight: spacing.xs,
    },
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

        {/* APPEARANCE CARD */}
        <Card variant="elevated">
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>{t('settings.appearance')}</Text>
            </View>
            <Text style={styles.sectionLabel}>{t('settings.themeLabel')}</Text>
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
                    color={mode === m ? colors.textInverse : colors.textSecondary}
                  />
                  <Text style={[styles.themeChipText, mode === m && styles.themeChipTextActive]}>
                    {m === 'system' ? t('settings.themeSystem') : m === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: spacing.md }} />
            <Text style={styles.sectionLabel}>{t('settings.languageLabel')}</Text>
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

        {/* DATA & TOOLS CARD */}
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

        {/* AI ASSISTANT CARD */}
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
              <View style={{ paddingTop: spacing.sm + 2, marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={styles.sectionLabel}>{t('settings.dailyLanguage')}</Text>
                <Text style={[styles.aiDescription, { marginBottom: spacing.sm }]}>
                  {t('settings.dailyLanguageDescription')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {(['', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Russian'] as const).map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.langChip,
                        dailyLanguage === lang && styles.langChipSelected,
                      ]}
                      onPress={() => {
                        setDailyLanguageState(lang);
                        setDailyLanguage(lang);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: dailyLanguage === lang }}
                    >
                      <Text style={[
                        styles.langChipText,
                        dailyLanguage === lang && styles.langChipTextSelected,
                      ]}>
                        {lang === '' ? t('common.none') || 'None' : lang}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {dailyLanguage === '' && (
                  <Text style={[styles.aiDescription, { marginTop: spacing.sm }]}>
                    {t('dailyWords.setLanguage')}
                  </Text>
                )}
              </View>
            )}

            {aiEnabled && (
              <TouchableOpacity
                style={styles.apiKeyRow}
                onPress={() => setApiKeySheetVisible(true)}
                accessibilityRole="button"
              >
                <Text style={styles.apiKeyLabel}>{t('settings.apiKeyRow')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.apiKeyValue}>
                    {apiKey ? `sk-${'•'.repeat(4)}${apiKey.slice(-4)}` : t('settings.configureApiKey')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* VERSION */}
        <Text style={styles.version}>
          {t('settings.version')} v1.0.0 · Expo SDK 56
        </Text>
      </ScrollView>

      {/* API KEY BOTTOM SHEET */}
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
              top: spacing.md + spacing.sm,
            }}
          >
            <Ionicons
              name={apiKeyVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title={t('common.save')}
              onPress={() => {
                setApiKeyLocal(draftApiKey);
                setApiKey(draftApiKey);
                setTestStatus('idle');
              }}
              variant={draftApiKey !== apiKey ? 'primary' : 'secondary'}
              disabled={draftApiKey === apiKey}
              fullWidth
            />
          </View>
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
