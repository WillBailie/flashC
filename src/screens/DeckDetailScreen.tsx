import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Share,
  Switch,
  Pressable,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, fontSize, borderRadius, withAlpha, typography } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Modal as ThemedModal } from '../components/Modal';
import {
  getCardsByDeckId,
  deleteCard,
  getTemplateFields,
  updateDeck,
  getDeckById,
  deleteDeck,
} from '../storage/database';
import { Card, TemplateField } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { exportDeckToCSV, exportDeckToJSON } from '../utils/exportCards';
import { getReverseMode, setReverseMode } from '../utils/settings';
import { parseFieldValues } from '../utils/cards';
import { emit } from '../utils/eventBus';
import { useTranslation } from '../i18n/TranslationContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DeckDetail'>;

const commonLanguages = ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Russian', 'Arabic'];

export default function DeckDetailScreen({ navigation, route }: Props) {
  const { deckId, deckName } = route.params;
  const [cards, setCards] = useState<Card[]>([]);
  const [templateFieldsMap, setTemplateFieldsMap] = useState<
    Record<number, TemplateField[]>
  >({});
  const [modeModalVisible, setModeModalVisible] = useState(false);
  const [freeflowCount, setFreeflowCount] = useState('10');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [reverseMode, setReverseModeState] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [displayName, setDisplayName] = useState(deckName);
  const [deckLanguage, setDeckLanguage] = useState('');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [editingLang, setEditingLang] = useState('');
  const [editingCustomLang, setEditingCustomLang] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const titleInputRef = React.useRef<TextInput>(null);
  const searchInputRef = React.useRef<TextInput>(null);
  const { t } = useTranslation();
  const { colors } = useTheme();

  const loadCards = useCallback(async () => {
    const cardList = await getCardsByDeckId(deckId);
    setCards(cardList);

    const templateIds = new Set(
      cardList.filter((c) => c.template_id != null).map((c) => c.template_id!)
    );
    const map: Record<number, TemplateField[]> = {};
    for (const tid of templateIds) {
      map[tid] = await getTemplateFields(tid);
    }
    setTemplateFieldsMap(map);
  }, [deckId]);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase().trim();
    return cards.filter((card) => {
      if (card.front_text.toLowerCase().includes(q)) return true;
      if (card.back_text.toLowerCase().includes(q)) return true;
      if (card.field_values) {
        try {
          const vals = JSON.parse(card.field_values);
          for (const v of Object.values(vals)) {
            if (String(v).toLowerCase().includes(q)) return true;
          }
        } catch {}
      }
      return false;
    });
  }, [cards, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadCards();
      getReverseMode().then(setReverseModeState);
      getDeckById(deckId).then((deck) => {
        if (deck) setDeckLanguage(deck.language);
      });
    }, [loadCards, deckId])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSaveTitle = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setDisplayName(deckName);
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateDeck(deckId, trimmed, '');
      setDisplayName(trimmed);
    } catch {
      Alert.alert('Error', 'Failed to update deck name.');
    }
    setIsEditingTitle(false);
  };

  const handleOpenLanguageEditor = () => {
    setEditingLang(deckLanguage);
    setEditingCustomLang('');
    setLanguageModalVisible(true);
  };

  const handleSaveLanguage = async () => {
    setLanguageModalVisible(false);
    const lang = editingLang.trim();
    if (lang === deckLanguage) return;
    try {
      await updateDeck(deckId, displayName, '', lang);
      setDeckLanguage(lang);
    } catch {
      Alert.alert('Error', 'Failed to update language.');
    }
  };

  const handleDeleteCard = (card: Card) => {
    Alert.alert('Delete Card', 'Are you sure you want to delete this card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(card.id);
          await loadCards();
        },
      },
    ]);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExportModalVisible(false);
    try {
      const content = format === 'csv'
        ? await exportDeckToCSV(deckId)
        : await exportDeckToJSON(deckId);

      const ext = format === 'csv' ? 'csv' : 'json';
      const fileName = `${deckName.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, content);
      await Share.share({ title: fileName, url: filePath });
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Export Failed', error?.message || 'Could not export deck.');
      }
    }
  };

  const handleReverseToggle = useCallback(async (value: boolean) => {
    setReverseModeState(value);
    await setReverseMode(value);
  }, []);

  const renderCard = ({ item, index }: { item: Card; index: number }) => {
    const fields = item.template_id
      ? templateFieldsMap[item.template_id] ?? []
      : [];
    const values = parseFieldValues(item.field_values);
    const frontFields = fields.filter((f) => f.side === 'front');
    const backFields = fields.filter((f) => f.side === 'back');

    const hasCustomTemplate =
      frontFields.length > 1 ||
      backFields.length > 1 ||
      (fields.length >= 2 &&
        !(frontFields.length === 1 && frontFields[0].name === 'Front'));

    return (
      <Animated.View
        entering={FadeInUp.duration(250).delay(index * 50)}
      >
      <TouchableOpacity
        style={styles.cardItem}
        onPress={() =>
          navigation.navigate('CardForm', { deckId, cardId: item.id })
        }
        onLongPress={() => handleDeleteCard(item)}
      >
        {hasCustomTemplate ? (
          <>
            <Text style={styles.sideLabel}>FRONT</Text>
            {frontFields.map((f) => (
              <View key={f.name} style={styles.fieldRow}>
                <Text style={styles.fieldName}>{f.name}</Text>
                <Text style={styles.fieldValue} numberOfLines={2}>
                  {values[f.name] || '—'}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <Text style={styles.sideLabel}>BACK</Text>
            {backFields.map((f) => (
              <View key={f.name} style={styles.fieldRow}>
                <Text style={styles.fieldName}>{f.name}</Text>
                <Text style={styles.fieldValue} numberOfLines={2}>
                  {values[f.name] || '—'}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Front</Text>
              <Text style={styles.cardText} numberOfLines={2}>
                {item.front_text}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Back</Text>
              <Text style={styles.cardText} numberOfLines={2}>
                {item.back_text}
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>
      </Animated.View>
    );
  };

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
    deckTitleInput: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.primary,
      textAlign: 'center',
      minWidth: 120,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingBottom: 80,
    },
    listContent: {
      padding: spacing.md,
      paddingTop: 0,
    },
    emptyContainer: {
      flexGrow: 1,
      paddingTop: 0,
    },
    cardItem: {
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
    sideLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    fieldRow: {
      marginBottom: spacing.sm,
    },
    fieldName: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    fieldValue: {
      fontSize: fontSize.md,
      color: colors.text,
    },
    cardContent: {
      marginBottom: 4,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    cardText: {
      fontSize: fontSize.md,
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    practiceButton: {
      backgroundColor: colors.secondary,
      paddingVertical: 14,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
    },
    practiceButtonText: {
      color: colors.surface,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    addButton: {
      paddingVertical: 10,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      flex: 1,
    },
    addButtonText: {
      color: colors.primary,
      fontSize: fontSize.md,
      fontWeight: '600',
    },
    exportButton: {
      paddingVertical: 10,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      flex: 1,
    },
    exportButtonText: {
      color: colors.primary,
      fontSize: fontSize.md,
      fontWeight: '600',
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
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    modeOption: {
      flexDirection: 'row',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    modeOptionExpanded: {
      backgroundColor: colors.background,
      paddingBottom: spacing.sm,
    },
    modeIcon: {
      fontSize: 28,
      marginRight: spacing.md,
      marginTop: 2,
    },
    modeInfo: {
      flex: 1,
    },
    modeTitle: {
      fontSize: fontSize.md,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    modeDesc: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    modeDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    freeflowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    freeflowLabel: {
      fontSize: fontSize.sm,
      color: colors.text,
    },
    freeflowInput: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: borderRadius.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: fontSize.md,
      color: colors.text,
      textAlign: 'center',
      minWidth: 48,
      backgroundColor: colors.surface,
    },
    freeflowStart: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
    },
    freeflowStartText: {
      color: colors.surface,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    modalCancel: {
      marginTop: spacing.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    reverseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    reverseModalLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    searchContainer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxl + spacing.xl + spacing.sm + 44 + spacing.sm,
      paddingBottom: spacing.sm,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      height: 44,
    },
    searchInput: {
      flex: 1,
      fontSize: fontSize.md,
      color: colors.text,
      paddingVertical: 0,
    },
    searchClear: {
      padding: spacing.xs,
    },
    searchCount: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    languageRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    languageChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      backgroundColor: withAlpha(colors.primary, 0.08),
    },
    languageChipText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary,
    },
    langChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    langChipSelected: {
      borderColor: colors.primary,
      backgroundColor: withAlpha(colors.primary, 0.1),
    },
    langChipText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: colors.text,
    },
    langChipTextSelected: {
      color: colors.primary,
    },
    langChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    menuItemText: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: '600',
    },
    menuItemDanger: {
      color: colors.danger,
    },
    menuBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    menuSheet: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 320,
    },
    menuTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
  }), [colors]);

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
          {isEditingTitle ? (
            <TextInput
              ref={titleInputRef}
              style={[styles.floatingPillInner, styles.deckTitleInput]}
              value={displayName}
              onChangeText={setDisplayName}
              onSubmitEditing={handleSaveTitle}
              onBlur={handleSaveTitle}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
            />
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditingTitle(true)}
              accessibilityRole="button"
              accessibilityLabel={`Edit deck name: ${displayName}`}
            >
              <View style={styles.floatingPillInner}>
                <Text style={styles.floatingPillText} numberOfLines={1}>{displayName}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('deckDetail.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchClear}
              onPress={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.trim().length > 0 && (
          <Text style={styles.searchCount}>
            {filteredCards.length} of {cards.length} cards
          </Text>
        )}
      </View>
      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={
          cards.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <EmptyState
            title={t('deckDetail.emptyTitle')}
            subtitle={t('deckDetail.emptySubtitle')}
          />
        }
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.practiceButton}
          onPress={() => navigation.navigate('CardForm', { deckId })}
        >
          <Text style={styles.practiceButtonText}>+ {t('deckDetail.addCard')}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModeModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('deckDetail.practiceTitle')}</Text>

            <View style={styles.reverseRow}>
              <Text style={styles.reverseModalLabel}>Reverse</Text>
              <Switch
                value={reverseMode}
                onValueChange={handleReverseToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                accessibilityLabel="Reverse practice mode"
              />
            </View>

            <TouchableOpacity
              style={styles.modeOption}
              onPress={() => {
                setModeModalVisible(false);
                navigation.navigate('Practice', { deckId, deckName, mode: 'daily', reverse: reverseMode });
              }}
            >
              <Text style={styles.modeIcon}><Ionicons name="calendar" size={28} color={colors.primary} /></Text>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Daily Review</Text>
                <Text style={styles.modeDesc}>
                  Review cards that are due based on your spaced repetition schedule
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.modeDivider} />

            <TouchableOpacity
              style={[styles.modeOption, styles.modeOptionExpanded]}
              activeOpacity={0.7}
            >
              <Text style={styles.modeIcon}><Ionicons name="shuffle" size={28} color={colors.secondary} /></Text>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>Freeflow</Text>
                <Text style={styles.modeDesc}>
                  Pick random cards to practice regardless of schedule
                </Text>
                <View style={styles.freeflowRow}>
                  <Text style={styles.freeflowLabel}>{t('deckDetail.freeflowCount')}:</Text>
                  <TextInput
                    style={styles.freeflowInput}
                    keyboardType="numeric"
                    value={freeflowCount}
                    onChangeText={setFreeflowCount}
                    maxLength={3}
                    selectTextOnFocus
                  />
                </View>
                <TouchableOpacity
                  style={styles.freeflowStart}
                  onPress={() => {
                    const count = Math.max(1, Math.min(parseInt(freeflowCount) || 10, cards.length, 99));
                    if (cards.length === 0) {
                      Alert.alert('No Cards', 'Add cards to this deck first.');
                      return;
                    }
                    setModeModalVisible(false);
                    setFreeflowCount('10');
                    navigation.navigate('Practice', { deckId, deckName, mode: 'freeflow', cardCount: count, reverse: reverseMode });
                  }}
                >
                  <Text style={styles.freeflowStartText}>Start Freeflow</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setModeModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ThemedModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        title={t('deckDetail.exportTitle')}
      >
        <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          Choose a format to export {deckName}
        </Text>
        <Button
          title={t('deckDetail.exportCSV')}
          onPress={() => handleExport('csv')}
          fullWidth
        />
        <Button
          title={t('deckDetail.exportJSON')}
          variant="secondary"
          onPress={() => handleExport('json')}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
        <Button
          title={t('common.cancel')}
          variant="ghost"
          onPress={() => setExportModalVisible(false)}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </ThemedModal>

      <ThemedModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        title={t('deckDetail.languageTitle')}
      >
        <View style={styles.langChipRow}>
          {commonLanguages.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langChip,
                editingLang === lang && styles.langChipSelected,
              ]}
              onPress={() => {
                setEditingLang(editingLang === lang ? '' : lang);
                setEditingCustomLang('');
              }}
            >
              <Text
                style={[
                  styles.langChipText,
                  editingLang === lang && styles.langChipTextSelected,
                ]}
              >
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius.sm,
            padding: spacing.sm + 2,
            fontSize: fontSize.md,
            color: colors.text,
            backgroundColor: colors.background,
          }}
          placeholder="Or enter custom language..."
          placeholderTextColor={colors.textSecondary}
          value={editingCustomLang}
          onChangeText={(text) => {
            setEditingCustomLang(text);
            setEditingLang(text);
          }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => setLanguageModalVisible(false)}
            style={{ flex: 1 }}
          />
          <Button
            title={t('common.save')}
            onPress={handleSaveLanguage}
            style={{ flex: 1 }}
          />
        </View>
      </ThemedModal>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle}>{t('deckDetail.menuTitle')}</Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setTimeout(() => setModeModalVisible(true), 200);
              }}
            >
              <Ionicons name="play" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>{t('deckDetail.menuPractice')}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setTimeout(() => handleOpenLanguageEditor(), 200);
              }}
            >
              <Ionicons name="language" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>{t('deckDetail.menuLanguage')}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setTimeout(() => setExportModalVisible(true), 200);
              }}
            >
              <Ionicons name="share-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>{t('deckDetail.menuExport')}</Text>
            </Pressable>
            <View style={styles.modeDivider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setTimeout(() => setDeleteConfirmVisible(true), 300);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>{t('deckDetail.deleteTitle')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ThemedModal
        visible={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title={t('deckDetail.deleteTitle')}
      >
        <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          Delete "{displayName}" and all its cards?
        </Text>
        <Button
          title={t('common.delete')}
          variant="danger"
          onPress={async () => {
            setDeleteConfirmVisible(false);
            try {
              await deleteDeck(deckId);
              emit('decks-changed');
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete deck.');
            }
          }}
          fullWidth
        />
        <Button
          title={t('common.cancel')}
          variant="ghost"
          onPress={() => setDeleteConfirmVisible(false)}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </ThemedModal>
    </View>
  );
}
