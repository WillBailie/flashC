import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';
import { useFocusEffect, CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { SkeletonCard } from '../components/Skeleton';
import { createDeck, deleteDeck, getAllDecks, getDeckStats, getOrphanCardCount, getOrphanCards, moveCardsToDeck, deleteOrphanCards } from '../storage/database';
import { on, emit } from '../utils/eventBus';
import { useTranslation } from '../i18n/TranslationContext';
import { Deck } from '../models/types';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'DeckList'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface DeckWithStats extends Deck {
  totalCards: number;
  newCards: number;
  dueCards: number;
}

export default function DeckListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckLanguage, setNewDeckLanguage] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [orphanCount, setOrphanCount] = useState(0);
  const [orphanModalVisible, setOrphanModalVisible] = useState(false);
  const [showDeckPicker, setShowDeckPicker] = useState(false);

  const commonLanguages = ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Russian', 'Arabic'];

  const loadDecks = useCallback(async () => {
    setLoading(true);
    const allDecks = await getAllDecks();
    const decksWithStats: DeckWithStats[] = [];
    for (const deck of allDecks) {
      const stats = await getDeckStats(deck.id);
      decksWithStats.push({ ...deck, ...stats });
    }
    setDecks(decksWithStats);
    const count = await getOrphanCardCount();
    setOrphanCount(count);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDecks();
    }, [loadDecks])
  );

  useEffect(() => {
    return on('decks-changed', loadDecks);
  }, [loadDecks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDecks();
    setRefreshing(false);
  }, [loadDecks]);

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
        deckHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          marginBottom: spacing.sm,
        },
        deckIcon: {
          width: 44,
          height: 44,
          borderRadius: borderRadius.md,
          backgroundColor: withAlpha(colors.primary, 0.1),
          justifyContent: 'center',
          alignItems: 'center',
        },
        deckName: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          flex: 1,
        },
        deckDesc: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
        },
        statsRow: {
          flexDirection: 'row',
          gap: spacing.sm,
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
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 6,
        },
        modalButtons: {
          flexDirection: 'row',
          gap: spacing.sm,
          marginTop: spacing.md,
        },
        languageLabel: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
        },
        languageChips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
          marginBottom: spacing.sm,
        },
        languageChip: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        languageChipSelected: {
          borderColor: colors.primary,
          backgroundColor: withAlpha(colors.primary, 0.1),
        },
        languageChipText: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
          color: colors.text,
        },
        languageChipTextSelected: {
          color: colors.primary,
        },
        orphanHeader: {
          marginBottom: spacing.md,
        },
        orphanIcon: {
          width: 44,
          height: 44,
          borderRadius: borderRadius.md,
          backgroundColor: withAlpha(colors.warning, 0.12),
          justifyContent: 'center',
          alignItems: 'center',
        },
        orphanCount: {
          fontSize: typography.fontSize.sm,
          color: colors.warning,
          fontWeight: typography.fontWeight.semibold,
        },
        deckPickerItem: {
          paddingVertical: 14,
          paddingHorizontal: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        deckPickerName: {
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.medium,
          color: colors.text,
        },
      }),
    [colors]
  );

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) {
      Alert.alert('Error', 'Please enter a deck name');
      return;
    }
    try {
      await createDeck(newDeckName.trim(), newDeckDesc.trim(), newDeckLanguage.trim());
      setNewDeckName('');
      setNewDeckDesc('');
      setNewDeckLanguage('');
      setCustomLanguage('');
      setModalVisible(false);
      emit('decks-changed');
      await loadDecks();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create deck.');
    }
  };

  const handleDeleteDeck = (deck: DeckWithStats) => {
    Alert.alert(
      'Delete Deck',
      `Delete "${deck.name}" and all its cards?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDeck(deck.id);
            emit('decks-changed');
            await loadDecks();
          },
        },
      ]
    );
  };

  const handleMoveOrphans = async (deckId: number, deckName: string) => {
    const orphans = await getOrphanCards();
    const ids = orphans.map((c) => c.id);
    if (ids.length > 0) {
      await moveCardsToDeck(ids, deckId);
      const count = ids.length;
      const s = count !== 1 ? 's' : '';
      Alert.alert('', t('deckList.orphanMoved', { count: String(count), deck: deckName, s }));
      emit('decks-changed');
      await loadDecks();
      setShowDeckPicker(false);
      setOrphanModalVisible(false);
    }
  };

  const handleDeleteOrphans = () => {
    Alert.alert(
      t('common.delete'),
      t('deckList.orphanDeleteConfirm', { count: String(orphanCount), s: orphanCount !== 1 ? 's' : '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const deleted = await deleteOrphanCards();
            Alert.alert('', t('deckList.orphanDeleted', { count: String(deleted), s: deleted !== 1 ? 's' : '' }));
            emit('decks-changed');
            await loadDecks();
            setOrphanModalVisible(false);
          },
        },
      ]
    );
  };

  const renderDeck = ({ item, index }: { item: DeckWithStats; index: number }) => (
    <Animated.View
      entering={FadeInUp.duration(250).delay(index * 50)}
      style={{ marginBottom: spacing.sm }}
    >
    <Card
      variant="elevated"
      interactive
      onPress={() => navigation.navigate('DeckDetail', { deckId: item.id, deckName: item.name })}
      onLongPress={() => handleDeleteDeck(item)}
      delayLongPress={500}
    >
      <View style={styles.deckHeader}>
        <View style={styles.deckIcon}>
          <Ionicons name="book-outline" size={22} color={colors.primary} />
        </View>
        <Text style={styles.deckName}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      {item.description ? (
        <Text style={styles.deckDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.statsRow}>
        <Badge text={`${item.totalCards} total`} color={colors.primary} />
        <Badge text={`${item.newCards} ${t('deckList.new')}`} color={colors.success} />
        {item.dueCards > 0 && <Badge text={`${item.dueCards} ${t('deckList.due')}`} color={colors.warning} />}
      </View>
    </Card>
    </Animated.View>
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
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
      {loading && decks.length === 0 ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDeck}
          contentContainerStyle={decks.length === 0 && orphanCount === 0 ? styles.emptyContainer : styles.listContent}
          ListHeaderComponent={
            orphanCount > 0 ? (
              <Animated.View
                entering={FadeInUp.duration(250)}
                style={styles.orphanHeader}
              >
                <Card
                  variant="outlined"
                  interactive
                  onPress={() => {
                    setShowDeckPicker(false);
                    setOrphanModalVisible(true);
                  }}
                  style={{ borderColor: colors.warning, borderWidth: 1.5 }}
                >
                  <View style={styles.deckHeader}>
                    <View style={styles.orphanIcon}>
                      <Ionicons name="warning-outline" size={22} color={colors.warning} />
                    </View>
                    <Text style={styles.deckName}>{t('deckList.orphanTitle')}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </View>
                  <Text style={styles.orphanCount}>
                    {t('deckList.orphanCount', { count: String(orphanCount), s: orphanCount !== 1 ? 's' : '' })}
                  </Text>
                </Card>
              </Animated.View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title={t('deckList.emptyTitle')}
              subtitle={t('deckList.emptySubtitle')}
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        />
      )}

      <Animated.View style={[styles.fab, fabAnimatedStyle]}>
        <Pressable
          onPress={() => setModalVisible(true)}
          onPressIn={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!reduceMotion) fabPressScale.value = withSpring(0.95, SPRING_CONFIG);
          }}
          onPressOut={() => {
            if (!reduceMotion) fabPressScale.value = withSpring(1, SPRING_CONFIG);
          }}
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Create new deck"
        >
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </Pressable>
      </Animated.View>

      <Modal
        visible={orphanModalVisible}
        onClose={() => {
          setOrphanModalVisible(false);
          setShowDeckPicker(false);
        }}
        title={showDeckPicker ? t('deckList.orphanMoveToDeck') : t('deckList.orphanTitle')}
      >
        {showDeckPicker ? (
          <>
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md }}>
              {t('deckList.orphanSelectDeck')}
            </Text>
            {decks.length === 0 ? (
              <EmptyState
                title={t('deckList.emptyTitle')}
                subtitle={t('deckList.emptySubtitle')}
              />
            ) : (
              decks.map((deck) => (
                <Pressable
                  key={deck.id}
                  style={styles.deckPickerItem}
                  onPress={() => handleMoveOrphans(deck.id, deck.name)}
                >
                  <Text style={styles.deckPickerName}>{deck.name}</Text>
                </Pressable>
              ))
            )}
            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setShowDeckPicker(false)}
                style={{ flex: 1 }}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md }}>
              {t('deckList.orphanCount', { count: String(orphanCount), s: orphanCount !== 1 ? 's' : '' })}
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title={t('deckList.orphanMoveToDeck')}
                onPress={() => setShowDeckPicker(true)}
                style={{ flex: 1 }}
              />
              <Button
                title={t('deckList.orphanDeleteAll')}
                variant="danger"
                onPress={handleDeleteOrphans}
                style={{ flex: 1 }}
              />
            </View>
            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setOrphanModalVisible(false)}
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </Modal>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={t('deckList.newDeckTitle')}
      >
        <Input
          label={t('deckList.deckName')}
          placeholder={t('deckList.deckNamePlaceholder')}
          value={newDeckName}
          onChangeText={setNewDeckName}
          autoFocus
        />
        <Input
          label={t('deckList.description')}
          placeholder={t('deckList.descriptionPlaceholder')}
          value={newDeckDesc}
          onChangeText={setNewDeckDesc}
          multiline
        />
        <Text style={styles.languageLabel}>{t('deckList.language')}</Text>
        <View style={styles.languageChips}>
          {commonLanguages.map((lang) => (
            <Pressable
              key={lang}
              style={[
                styles.languageChip,
                newDeckLanguage === lang && styles.languageChipSelected,
              ]}
              onPress={() => {
                setNewDeckLanguage(newDeckLanguage === lang ? '' : lang);
                setCustomLanguage('');
              }}
            >
              <Text
                style={[
                  styles.languageChipText,
                  newDeckLanguage === lang && styles.languageChipTextSelected,
                ]}
              >
                {lang}
              </Text>
            </Pressable>
          ))}
        </View>
        <Input
          label={t('deckList.customLanguagePlaceholder')}
          placeholder={t('deckList.customLangPlaceholder')}
          value={customLanguage}
          onChangeText={(text) => {
            setCustomLanguage(text);
            setNewDeckLanguage(text);
          }}
        />
        <View style={styles.modalButtons}>
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => setModalVisible(false)}
            style={{ flex: 1 }}
          />
          <Button
            title={t('common.create')}
            onPress={handleCreateDeck}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </View>
  );
}
