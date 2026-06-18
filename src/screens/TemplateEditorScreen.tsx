import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/TranslationContext';
import { useTheme, spacing, fontSize, borderRadius, withAlpha, typography } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Modal as ThemedModal } from '../components/Modal';
import {
  createTemplate,
  getAllTemplates,
  getTemplateFields,
  addTemplateField,
  deleteTemplateField,
  deleteTemplate,
  getDefaultTemplateId,
} from '../storage/database';
import { TemplateField } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'TemplateEditor'>;

export default function TemplateEditorScreen({ route, navigation }: Props) {
  const editingTemplateId = route.params?.templateId;
  const isNew = !editingTemplateId;

  const [name, setName] = useState('');
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldSide, setNewFieldSide] = useState<'front' | 'back'>('front');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<TemplateField | null>(null);

  const { colors } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => StyleSheet.create({
    floatingHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.sm,
    },
    floatingBackButton: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingSpacer: {
      width: 44,
    },
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: spacing.xxl + spacing.xl + spacing.sm + 44 + spacing.sm,
    },
    nameSection: {
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    nameInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      padding: 12,
      fontSize: fontSize.md,
      color: colors.text,
      backgroundColor: colors.background,
    },
    saveNameButton: {
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
    },
    saveNameButtonText: {
      color: colors.surface,
      fontSize: fontSize.sm,
      fontWeight: '700',
    },
    fieldsSection: {
      flex: 1,
      padding: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.text,
    },
    addFieldButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
    },
    addFieldButtonText: {
      color: colors.surface,
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: withAlpha(colors.primary, 0.18),
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    previewSide: {
      paddingVertical: spacing.sm,
    },
    previewSideLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    previewField: {
      marginBottom: spacing.sm,
    },
    previewFieldLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2,
    },
    previewFieldPlaceholder: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    previewEmpty: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: spacing.sm,
    },
    previewDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    fieldItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.sm + 4,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs,
    },
    fieldInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    fieldName: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: '500',
    },
    sideBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    sideBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 420,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    modalLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      padding: 12,
      fontSize: fontSize.md,
      color: colors.text,
    },
    sideToggle: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    sideOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: borderRadius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
    },
    sideOptionActive: {
      borderColor: colors.primary,
      backgroundColor: withAlpha(colors.primary, 0.08),
    },
    sideOptionText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    sideOptionTextActive: {
      color: colors.primary,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    addButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: fontSize.md,
      color: colors.surface,
      fontWeight: '600',
    },
  }), [colors]);

  const loadTemplate = useCallback(async () => {
    if (editingTemplateId) {
      const templates = await getAllTemplates();
      const template = templates.find((t) => t.id === editingTemplateId);
      if (template) setName(template.name);
      const templateFields = await getTemplateFields(editingTemplateId);
      setFields(templateFields);
    }
  }, [editingTemplateId]);

  useFocusEffect(
    useCallback(() => {
      loadTemplate();
    }, [loadTemplate])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Template name is required.');
      return;
    }
    if (isNew) {
      const template = await createTemplate(name.trim());
      navigation.replace('TemplateEditor', { templateId: template.id });
    }
  };

  const handleAddField = async () => {
    if (!newFieldName.trim()) {
      Alert.alert('Error', 'Field name is required.');
      return;
    }
    if (!editingTemplateId) {
      Alert.alert('Error', 'Save the template first, then add fields.');
      return;
    }
    const nextPos = fields.filter((f) => f.side === newFieldSide).length;
    await addTemplateField(editingTemplateId, newFieldName.trim(), newFieldSide, nextPos);
    setNewFieldName('');
    setModalVisible(false);
    await loadTemplate();
  };

  const handleDeleteField = (field: TemplateField) => {
    setFieldToDelete(field);
    setDeleteModalVisible(true);
  };

  const confirmDeleteField = async () => {
    if (!fieldToDelete) return;
    try {
      await deleteTemplateField(fieldToDelete.id);
      setFields((prev) => prev.filter((f) => f.id !== fieldToDelete.id));
    } catch {
      Alert.alert('Error', 'Failed to delete field. Please try again.');
    } finally {
      setDeleteModalVisible(false);
      setFieldToDelete(null);
    }
  };

  const frontFields = fields.filter((f) => f.side === 'front');
  const backFields = fields.filter((f) => f.side === 'back');

  const renderField = ({ item }: { item: TemplateField }) => (
    <View style={styles.fieldItem}>
      <View style={styles.fieldInfo}>
        <Text style={styles.fieldName}>{item.name}</Text>
        <View
          style={[
            styles.sideBadge,
            { backgroundColor: item.side === 'front' ? withAlpha(colors.primary, 0.12) : withAlpha(colors.secondary, 0.12) },
          ]}
        >
          <Text
            style={[
              styles.sideBadgeText,
              { color: item.side === 'front' ? colors.primary : colors.secondary },
            ]}
          >
            {item.side}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteField(item)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={`Delete field ${item.name}`}
      >
        <Ionicons name="close" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

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
            <Text style={styles.floatingPillText} numberOfLines={1}>Edit Template</Text>
          </View>
        </View>
        <View style={styles.floatingSpacer} />
      </View>
      <View style={styles.nameSection}>
        <Text style={styles.label}>{t('template.templateName')}</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="e.g., Chinese Vocabulary"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />
        {isNew && (
          <TouchableOpacity style={styles.saveNameButton} onPress={handleSave}>
            <Text style={styles.saveNameButtonText}>Save Name</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fieldsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fields</Text>
          {editingTemplateId && (
            <TouchableOpacity
              style={styles.addFieldButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addFieldButtonText}>+ Add Field</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewSide}>
            <Text style={styles.previewSideLabel}>FRONT</Text>
            {frontFields.map((f) => (
              <View key={f.id} style={styles.previewField}>
                <Text style={styles.previewFieldLabel}>{f.name}</Text>
                <Text style={styles.previewFieldPlaceholder}>
                  {f.name} value...
                </Text>
              </View>
            ))}
            {frontFields.length === 0 && (
              <Text style={styles.previewEmpty}>No front fields</Text>
            )}
          </View>
          <View style={styles.previewDivider} />
          <View style={styles.previewSide}>
            <Text style={styles.previewSideLabel}>BACK</Text>
            {backFields.map((f) => (
              <View key={f.id} style={styles.previewField}>
                <Text style={styles.previewFieldLabel}>{f.name}</Text>
                <Text style={styles.previewFieldPlaceholder}>
                  {f.name} value...
                </Text>
              </View>
            ))}
            {backFields.length === 0 && (
              <Text style={styles.previewEmpty}>No back fields</Text>
            )}
          </View>
        </View>

        <FlatList
          data={fields}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderField}
          ListEmptyComponent={
            <EmptyState
              title="No Fields Yet"
              subtitle={isNew ? 'Save the template name first, then add fields.' : 'Add fields to define what appears on each side.'}
            />
          }
        />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('template.addField')}</Text>

            <Text style={styles.modalLabel}>{t('template.fieldName')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Hanzi, Pinyin, Translation"
              placeholderTextColor={colors.textSecondary}
              value={newFieldName}
              onChangeText={setNewFieldName}
              autoFocus
            />

            <Text style={styles.modalLabel}>Display On</Text>
            <View style={styles.sideToggle}>
              <TouchableOpacity
                style={[styles.sideOption, newFieldSide === 'front' && styles.sideOptionActive]}
                onPress={() => setNewFieldSide('front')}
              >
                <Text style={[styles.sideOptionText, newFieldSide === 'front' && styles.sideOptionTextActive]}>
                  {t('template.sideFront')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideOption, newFieldSide === 'back' && styles.sideOptionActive]}
                onPress={() => setNewFieldSide('back')}
              >
                <Text style={[styles.sideOptionText, newFieldSide === 'back' && styles.sideOptionTextActive]}>
                  {t('template.sideBack')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={handleAddField}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ThemedModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setFieldToDelete(null);
        }}
        title="Delete Field"
      >
        <Text style={{ fontSize: fontSize.md, color: colors.text, textAlign: 'center', marginBottom: spacing.lg }}>
          Remove "{fieldToDelete?.name}" from this template?
        </Text>
        <Button
          title="Delete"
          variant="danger"
          onPress={confirmDeleteField}
          fullWidth
        />
        <View style={{ height: spacing.sm }} />
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => {
            setDeleteModalVisible(false);
            setFieldToDelete(null);
          }}
          fullWidth
        />
      </ThemedModal>
    </View>
  );
}
