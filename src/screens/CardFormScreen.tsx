import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius, withAlpha, typography } from '../constants/theme';
import {
  createCard,
  deleteCard,
  getCardById,
  getReviewByCardId,
  updateCard,
  getAllTemplates,
  getTemplateFields,
  getDefaultTemplateId,
} from '../storage/database';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useTranslation } from '../i18n/TranslationContext';
import { Template, TemplateField, Review } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CardForm'>;

export default function CardFormScreen({ navigation, route }: Props) {
  const { deckId, cardId } = route.params;
  const isEditing = cardId !== undefined;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const loadTemplates = useCallback(async () => {
    const allTemplates = await getAllTemplates();
    setTemplates(allTemplates);
    const defaultId = await getDefaultTemplateId();
    setSelectedTemplateId((prev) => prev ?? defaultId);
  }, []);

  const loadTemplateFields = useCallback(async (templateId: number) => {
    const fields = await getTemplateFields(templateId);
    setTemplateFields(fields);
  }, []);

  useEffect(() => {
    loadTemplates();
    if (isEditing) {
      loadExistingCard();
    }
  }, [cardId]);

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateFields(selectedTemplateId);
    }
  }, [selectedTemplateId, loadTemplateFields]);

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadExistingCard = async () => {
    const card = await getCardById(cardId!);
    if (card) {
      setFrontText(card.front_text);
      setBackText(card.back_text);
      if (card.template_id) {
        setSelectedTemplateId(card.template_id);
      }
      if (card.field_values) {
        try {
          const parsed = JSON.parse(card.field_values);
          setFieldValues(parsed);
        } catch {
          setFieldValues({});
        }
      }
    }
    const rev = await getReviewByCardId(cardId!);
    setReview(rev);
  };

  const handleTemplateSelect = (templateId: number) => {
    if (templateId === selectedTemplateId) return;
    setSelectedTemplateId(templateId);
    setFieldValues({});
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
    const frontFields = templateFields.filter((f) => f.side === 'front');
    const backFields = templateFields.filter((f) => f.side === 'back');
    if (frontFields.length > 0 && frontFields[0].name === fieldName) {
      setFrontText(value);
    }
    if (backFields.length > 0 && backFields[0].name === fieldName) {
      setBackText(value);
    }
  };

  const handleSave = async () => {
    const frontFields = templateFields.filter((f) => f.side === 'front');
    const backFields = templateFields.filter((f) => f.side === 'back');

    const autoFront =
      frontFields.length > 0 ? fieldValues[frontFields[0].name] ?? '' : '';
    const autoBack =
      backFields.length > 0 ? fieldValues[backFields[0].name] ?? '' : '';

    const finalFront = frontText || autoFront || '';
    const finalBack = backText || autoBack || '';

    if (!finalFront.trim() || !finalBack.trim()) {
      Alert.alert('Error', 'Front and back text cannot be empty.');
      return;
    }

    const hasTemplateFields = Object.keys(fieldValues).length > 0;

    if (isEditing) {
      await updateCard(
        cardId!,
        finalFront,
        finalBack,
        selectedTemplateId ?? undefined,
        hasTemplateFields ? fieldValues : undefined
      );
    } else {
      await createCard(
        deckId,
        finalFront,
        finalBack,
        selectedTemplateId ?? undefined,
        hasTemplateFields ? fieldValues : undefined
      );
    }

    navigation.goBack();
  };

  const handleDeleteConfirmed = () => {
    setDeleteConfirmVisible(false);
    setDeleting(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      await deleteCard(cardId!);
      navigation.goBack();
    });
  };

  const frontFields = templateFields.filter((f) => f.side === 'front');
  const backFields = templateFields.filter((f) => f.side === 'back');
  const hasTemplateFields = templateFields.length > 0;
  const isBasicTemplate =
    templateFields.length === 2 &&
    templateFields.some((f) => f.name === 'Front') &&
    templateFields.some((f) => f.name === 'Back');

  const renderField = (field: TemplateField) => (
    <View key={field.name} style={styles.templateFieldRow}>
      <Text style={styles.templateFieldLabel}>{field.name}</Text>
      <TextInput
        style={styles.templateFieldInput}
        placeholder={t('cardForm.fieldPlaceholder', { name: field.name.toLowerCase() })}
        placeholderTextColor={colors.textSecondary}
        value={fieldValues[field.name] ?? ''}
        onChangeText={(text) => handleFieldChange(field.name, text)}
      />
    </View>
  );

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
      paddingTop: spacing.xxl + spacing.sm + 44 + spacing.sm,
    },
    contentScroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
    },
    bottomBar: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    templateSelector: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    templateChips: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    templateChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    templateChipSelected: {
      borderColor: colors.primary,
      backgroundColor: withAlpha(colors.primary, 0.08),
    },
    templateChipText: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: '600',
    },
    templateChipTextSelected: {
      color: colors.primary,
    },
    templateChipNew: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    templateChipNewText: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: '600',
    },
    sideSection: {
      marginBottom: spacing.md,
    },
    sideLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    templateFieldRow: {
      marginBottom: spacing.sm,
    },
    templateFieldLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    templateFieldInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      padding: 10,
      fontSize: fontSize.md,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      padding: 12,
      fontSize: fontSize.md,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: spacing.lg,
    },
    preview: {
      marginBottom: spacing.lg,
    },
    previewLabel: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: withAlpha(colors.primary, 0.18),
      padding: spacing.md,
    },
    previewSideLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    previewText: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      paddingVertical: spacing.sm,
    },
    previewFieldRow: {
      marginBottom: spacing.sm,
    },
    previewFieldLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    previewFieldValue: {
      fontSize: fontSize.md,
      color: colors.text,
    },
    previewDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    reviewSection: {
      marginBottom: spacing.lg,
    },
    reviewSectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    reviewCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    reviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    reviewRowIcon: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.sm,
      backgroundColor: withAlpha(colors.primary, 0.1),
      justifyContent: 'center',
      alignItems: 'center',
    },
    reviewRowLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      flex: 1,
    },
    reviewRowValue: {
      fontSize: fontSize.md,
      fontWeight: '600',
      color: colors.text,
    },
  }), [colors]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
            <Text style={styles.floatingPillText} numberOfLines={1}>
              {isEditing ? t('cardForm.editTitle') : t('cardForm.newTitle')}
            </Text>
          </View>
        </View>
        <View style={styles.floatingSpacer} />
      </View>
    <Animated.View
      style={[
        styles.contentScroll,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents={deleting ? 'none' : 'auto'}
    >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.templateSelector}>
        <Text style={styles.label}>{t('cardForm.template')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.templateChips}>
            {templates.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.templateChip,
                  selectedTemplateId === t.id && styles.templateChipSelected,
                ]}
                onPress={() => handleTemplateSelect(t.id)}
              >
                <Text
                  style={[
                    styles.templateChipText,
                    selectedTemplateId === t.id && styles.templateChipTextSelected,
                  ]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.templateChipNew}
              onPress={() => navigation.navigate('TemplateEditor', {})}
            >
              <Text style={styles.templateChipNewText}>+ New</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {isBasicTemplate || !hasTemplateFields ? (
        <>
          <Text style={styles.label}>{t('cardForm.frontText')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('cardForm.frontTextPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={frontText}
            onChangeText={setFrontText}
            multiline
            autoFocus={!isEditing}
          />
          <Text style={styles.label}>{t('cardForm.backText')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('cardForm.backTextPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={backText}
            onChangeText={setBackText}
            multiline
          />
        </>
      ) : (
        <>
          <View style={styles.sideSection}>
            <Text style={styles.sideLabel}>{t('cardForm.sideFront')}</Text>
            {frontFields.map(renderField)}
          </View>
          <View style={styles.sideSection}>
            <Text style={styles.sideLabel}>{t('cardForm.sideBack')}</Text>
            {backFields.map(renderField)}
          </View>
        </>
      )}

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>{t('cardForm.preview')}</Text>
        <View style={styles.previewCard}>
          <Text style={styles.previewSideLabel}>{t('cardForm.sideFront')}</Text>
          {frontFields.length > 0 && !isBasicTemplate ? (
            frontFields.map((f) => (
              <View key={f.name} style={styles.previewFieldRow}>
                <Text style={styles.previewFieldLabel}>{f.name}</Text>
                <Text style={styles.previewFieldValue}>
                  {fieldValues[f.name] || '—'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.previewText}>
              {frontText || t('cardForm.frontSidePlaceholder')}
            </Text>
          )}
          <View style={styles.previewDivider} />
          <Text style={styles.previewSideLabel}>{t('cardForm.sideBack')}</Text>
          {backFields.length > 0 && !isBasicTemplate ? (
            backFields.map((f) => (
              <View key={f.name} style={styles.previewFieldRow}>
                <Text style={styles.previewFieldLabel}>{f.name}</Text>
                <Text style={styles.previewFieldValue}>
                  {fieldValues[f.name] || '—'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.previewText}>
              {backText || t('cardForm.backSidePlaceholder')}
            </Text>
          )}
        </View>
      </View>

      {isEditing && review && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>{t('cardForm.schedule')}</Text>
          <View style={styles.reviewCard}>
            <View style={styles.reviewRow}>
              <View style={styles.reviewRowIcon}>
                <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.reviewRowLabel}>{t('cardForm.easeFactor')}</Text>
              <Text style={styles.reviewRowValue}>{review.ease_factor.toFixed(2)}</Text>
            </View>
            <View style={styles.reviewRow}>
              <View style={styles.reviewRowIcon}>
                <Ionicons name="repeat-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.reviewRowLabel}>{t('cardForm.interval')}</Text>
              <Text style={styles.reviewRowValue}>
                {review.interval === 0 ? 'New' : `${review.interval} day${review.interval !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <View style={styles.reviewRowIcon}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.reviewRowLabel}>{t('cardForm.nextReview')}</Text>
              <Text style={styles.reviewRowValue}>
                {review.next_review_date.startsWith('1970-01-01')
                  ? 'Pending'
                  : new Date(review.next_review_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
      )}

    </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title={isEditing ? t('cardForm.updateCard') : t('cardForm.createCard')}
          onPress={handleSave}
          fullWidth
        />
        {isEditing && (
          <Button
            title={t('cardForm.deleteTitle')}
            variant="danger"
            onPress={() => setDeleteConfirmVisible(true)}
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
        )}
      </View>

      </Animated.View>

      <Modal
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title={t('cardForm.deleteTitle')}
      >
        <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          Are you sure you want to delete this card?
        </Text>
        <Button
           title={t('common.delete')}
          variant="danger"
          onPress={handleDeleteConfirmed}
          fullWidth
        />
        <Button
           title={t('common.cancel')}
          variant="ghost"
          onPress={() => setDeleteConfirmVisible(false)}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}
