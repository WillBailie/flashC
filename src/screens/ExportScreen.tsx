import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getAllDecks } from '../storage/database';
import { exportDeckToCSV, exportDeckToJSON } from '../utils/exportCards';
import { Card as CardComponent } from '../components/Card';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useTranslation } from '../i18n/TranslationContext';
import { Deck } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';

export default function ExportScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Export'>>();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getAllDecks().then(setDecks);
    }, [])
  );

  const handleExport = async (format: 'csv' | 'json') => {
    if (!selectedDeck) return;
    setModalVisible(false);
    try {
      const content = format === 'csv'
        ? await exportDeckToCSV(selectedDeck.id)
        : await exportDeckToJSON(selectedDeck.id);

      const ext = format === 'csv' ? 'csv' : 'json';
      const fileName = `${selectedDeck.name.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, content);
      await Sharing.shareAsync(filePath);
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert(t('import.error'), error?.message || t('import.error'));
      }
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingTop: insets.top + 44 + spacing.sm + spacing.md + spacing.sm, paddingBottom: spacing.xl, gap: spacing.sm },
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
    deckRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    deckInfo: { flex: 1 },
    deckName: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
    },
    deckLang: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalText: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    buttonGroup: { gap: spacing.sm },
  }), [colors, insets.top]);

  if (decks === null) {
    return (
      <View style={[styles.container, { padding: spacing.lg }]}>
        <Skeleton width="100%" height={60} borderRadius={borderRadius.md} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={60} borderRadius={borderRadius.md} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={60} borderRadius={borderRadius.md} />
      </View>
    );
  }

  if (decks.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="document-outline"
          title={t('settings.export')}
          subtitle={t('import.noDecks')}
        />
      </View>
    );
  }

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
            <Text style={styles.floatingPillText} numberOfLines={2}>{t('settings.export')}</Text>
          </View>
        </View>
        <View style={styles.floatingSpacer} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {decks.map((deck) => (
          <CardComponent key={deck.id} variant="outlined" interactive onPress={() => {
            setSelectedDeck(deck);
            setModalVisible(true);
          }}>
            <View style={styles.deckRow}>
              <View style={styles.deckInfo}>
                <Text style={styles.deckName}>{deck.name}</Text>
                {deck.language ? <Text style={styles.deckLang}>{deck.language}</Text> : null}
              </View>
              <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
            </View>
          </CardComponent>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={t('deckDetail.exportTitle')}
      >
        <Text style={styles.modalText}>
          {selectedDeck?.name}
        </Text>
        <View style={styles.buttonGroup}>
          <Button
            title={t('deckDetail.exportCSV')}
            onPress={() => handleExport('csv')}
            variant="primary"
            fullWidth
          />
          <Button
            title={t('deckDetail.exportJSON')}
            onPress={() => handleExport('json')}
            variant="secondary"
            fullWidth
          />
          <Button
            title={t('common.cancel')}
            onPress={() => setModalVisible(false)}
            variant="ghost"
            fullWidth
          />
        </View>
      </Modal>
    </View>
  );
}
