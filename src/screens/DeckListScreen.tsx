import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
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
import { createDeck, deleteDeck, getAllDecks, getDeckStats } from '../storage/database';
import { on, emit } from '../utils/eventBus';
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
  const { colors } = useTheme();
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');

  const loadDecks = useCallback(async () => {
    setLoading(true);
    const allDecks = await getAllDecks();
    const decksWithStats: DeckWithStats[] = [];
    for (const deck of allDecks) {
      const stats = await getDeckStats(deck.id);
      decksWithStats.push({ ...deck, ...stats });
    }
    setDecks(decksWithStats);
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
      }),
    [colors]
  );

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) {
      Alert.alert('Error', 'Please enter a deck name');
      return;
    }
    try {
      await createDeck(newDeckName.trim(), newDeckDesc.trim());
      setNewDeckName('');
      setNewDeckDesc('');
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
        <Badge text={`${item.newCards} new`} color={colors.success} />
        {item.dueCards > 0 && <Badge text={`${item.dueCards} due`} color={colors.warning} />}
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
          contentContainerStyle={decks.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No Decks Yet"
              subtitle="Create your first deck to start learning."
            />
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
          <Ionicons name="add" size={28} color={colors.surface} />
        </Pressable>
      </Animated.View>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Create New Deck"
      >
        <Input
          label="Deck Name"
          placeholder="e.g., Spanish Verbs"
          value={newDeckName}
          onChangeText={setNewDeckName}
          autoFocus
        />
        <Input
          label="Description"
          placeholder="Optional"
          value={newDeckDesc}
          onChangeText={setNewDeckDesc}
          multiline
        />
        <View style={styles.modalButtons}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => setModalVisible(false)}
            style={{ flex: 1 }}
          />
          <Button
            title="Create"
            onPress={handleCreateDeck}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </View>
  );
}
