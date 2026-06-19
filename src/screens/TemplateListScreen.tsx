import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/TranslationContext';
import { useTheme, spacing, fontSize, borderRadius, typography, withAlpha } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import * as Haptics from 'expo-haptics';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';
import {
  getAllTemplates,
  deleteTemplate,
  getDefaultTemplateId,
  getTemplateFields,
} from '../storage/database';
import { Template, TemplateField } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TemplateList'>;

export default function TemplateListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [fieldCounts, setFieldCounts] = useState<Record<number, number>>({});
  const [defaultId, setDefaultId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadTemplates = useCallback(async () => {
    const allTemplates = await getAllTemplates();
    setTemplates(allTemplates);
    const defId = await getDefaultTemplateId();
    setDefaultId(defId);

    const counts: Record<number, number> = {};
    for (const t of allTemplates) {
      const fields = await getTemplateFields(t.id);
      counts[t.id] = fields.length;
    }
    setFieldCounts(counts);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTemplates();
    setRefreshing(false);
  }, [loadTemplates]);

  const handleDelete = (template: Template) => {
    if (template.id === defaultId) {
      Alert.alert('Cannot Delete', 'The Basic template cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? Cards using this template will be unaffected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(template.id);
            await loadTemplates();
          },
        },
      ]
    );
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        listContent: {
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + 44 + spacing.sm + spacing.md + spacing.sm,
          paddingBottom: 80,
        },
        emptyContainer: {
          flexGrow: 1,
        },
        floatingHeader: {
          position: 'absolute',
          top: 0, left: 0, right: 0,
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
        },
        floatingBackButton: {
          width: 44, height: 44,
          borderRadius: borderRadius.full,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        },
        floatingSpacer: { width: 44 },
        floatingPill: {
          flex: 1,
          alignItems: 'center',
        },
        floatingPillInner: {
          backgroundColor: withAlpha(colors.primary, 0.12),
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm + 2,
          borderRadius: borderRadius.full,
        },
        floatingPillText: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.primary,
        },
        templateItem: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        },
        templateInfo: {
          flex: 1,
        },
        templateHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: 4,
        },
        templateName: {
          fontSize: fontSize.lg,
          fontWeight: '700',
          color: colors.text,
        },
        defaultBadge: {
          backgroundColor: withAlpha(colors.success, 0.12),
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 10,
        },
        defaultBadgeText: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.success,
        },
        templateMeta: {
          fontSize: fontSize.sm,
          color: colors.textSecondary,
        },
        fab: {
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        },
      }),
    [colors, insets.top]
  );

  const renderTemplate = ({ item, index }: { item: Template; index: number }) => (
    <Animated.View
      entering={FadeInUp.duration(250).delay(index * 50)}
    >
    <TouchableOpacity
      style={styles.templateItem}
      onPress={() => navigation.navigate('TemplateEditor', { templateId: item.id })}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.templateInfo}>
        <View style={styles.templateHeader}>
          <Text style={styles.templateName}>{item.name}</Text>
          {item.id === defaultId && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <Text style={styles.templateMeta}>
          {fieldCounts[item.id] ?? 0} field{(fieldCounts[item.id] ?? 0) !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
    </Animated.View>
  );

  const reduceMotion = useReduceMotion();
  const fabScale = useSharedValue(reduceMotion ? 1 : 0);
  const fabPressScale = useSharedValue(1);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value * fabPressScale.value }],
  }));

  React.useEffect(() => {
    if (!reduceMotion) {
      fabScale.value = withSpring(1, SPRING_CONFIG);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.floatingPill}>
          <View style={styles.floatingPillInner}>
            <Text style={styles.floatingPillText} numberOfLines={2}>{t('settings.templates')}</Text>
          </View>
        </View>
        <View style={styles.floatingSpacer} />
      </View>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTemplate}
        contentContainerStyle={
          templates.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <EmptyState
            title={t('template.emptyTitle')}
            subtitle={t('template.emptySubtitle')}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
      <Animated.View style={[styles.fab, fabAnimatedStyle]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('TemplateEditor', {})}
          onPressIn={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!reduceMotion) fabPressScale.value = withSpring(0.95, SPRING_CONFIG);
          }}
          onPressOut={() => {
            if (!reduceMotion) fabPressScale.value = withSpring(1, SPRING_CONFIG);
          }}
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
