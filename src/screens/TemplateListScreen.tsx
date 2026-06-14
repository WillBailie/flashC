import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius, withAlpha } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import {
  getAllTemplates,
  deleteTemplate,
  getDefaultTemplateId,
  getTemplateFields,
} from '../storage/database';
import { Template, TemplateField } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TemplateListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [fieldCounts, setFieldCounts] = useState<Record<number, number>>({});
  const [defaultId, setDefaultId] = useState<number | null>(null);
  const { colors } = useTheme();

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
          padding: spacing.md,
          paddingBottom: 80,
        },
        emptyContainer: {
          flexGrow: 1,
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
        fabText: {
          fontSize: 28,
          color: colors.surface,
          lineHeight: 30,
        },
      }),
    [colors]
  );

  const renderTemplate = ({ item }: { item: Template }) => (
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
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTemplate}
        contentContainerStyle={
          templates.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <EmptyState
            title="No Templates"
            subtitle="Create a template to define custom fields for your flashcards."
          />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TemplateEditor', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
