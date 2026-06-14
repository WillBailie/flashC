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
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, fontSize, borderRadius } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Modal as ThemedModal } from '../components/Modal';
import {
  getCardsByDeckId,
  deleteCard,
  getTemplateFields,
} from '../storage/database';
import { Card, TemplateField } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { exportDeckToCSV, exportDeckToJSON } from '../utils/exportCards';
import { getReverseMode, setReverseMode } from '../utils/settings';
import { parseFieldValues } from '../utils/cards';

type Props = NativeStackScreenProps<RootStackParamList, 'DeckDetail'>;

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

  useFocusEffect(
    useCallback(() => {
      loadCards();
      getReverseMode().then(setReverseModeState);
    }, [loadCards])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: deckName });
  }, [navigation, deckName]);

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

  const renderCard = ({ item }: { item: Card }) => {
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
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: 100,
    },
    emptyContainer: {
      flexGrow: 1,
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
    freeflowMax: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
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
  }), [colors]);

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={
          cards.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <EmptyState
            title="No Cards Yet"
            subtitle="Add cards to this deck to start studying."
          />
        }
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.practiceButton}
          onPress={() => setModeModalVisible(true)}
        >
          <Text style={styles.practiceButtonText}>
            Practice ({cards.length} cards)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CardForm', { deckId })}
        >
          <Text style={styles.addButtonText}>+ Add Card</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setExportModalVisible(true)}
        >
          <Text style={styles.exportButtonText}>Export</Text>
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
            <Text style={styles.modalTitle}>Choose Practice Mode</Text>

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
                  <Text style={styles.freeflowLabel}>Cards to review:</Text>
                  <TextInput
                    style={styles.freeflowInput}
                    keyboardType="numeric"
                    value={freeflowCount}
                    onChangeText={setFreeflowCount}
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <Text style={styles.freeflowMax}>
                    / {Math.min(cards.length, 99)}
                  </Text>
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
        title="Export Deck"
      >
        <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          Choose a format to export {deckName}
        </Text>
        <Button
          title="Export as CSV"
          onPress={() => handleExport('csv')}
          fullWidth
        />
        <Button
          title="Export as JSON"
          variant="secondary"
          onPress={() => handleExport('json')}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => setExportModalVisible(false)}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </ThemedModal>
    </View>
  );
}
