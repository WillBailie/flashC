import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, fontSize, borderRadius, withAlpha } from '../constants/theme';
import {
  getAllDecks,
  importCards,
  getAllTemplates,
  getTemplateFields,
  getDefaultTemplateId,
} from '../storage/database';
import { parseCSV, parseJSON, ImportedCard } from '../utils/importCards';
import { Deck, Template, TemplateField } from '../models/types';

export default function ImportScreen() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [previewCards, setPreviewCards] = useState<ImportedCard[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const { colors } = useTheme();

  const loadData = React.useCallback(async () => {
    const [allDecks, allTemplates, defaultId] = await Promise.all([
      getAllDecks(),
      getAllTemplates(),
      getDefaultTemplateId(),
    ]);
    setDecks(allDecks);
    setTemplates(allTemplates);
    if (selectedTemplateId === null) {
      setSelectedTemplateId(defaultId);
      const fields = await getTemplateFields(defaultId);
      setTemplateFields(fields);
    }
  }, [selectedTemplateId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTemplateSelect = async (templateId: number) => {
    setSelectedTemplateId(templateId);
    setPreviewCards([]);
    setFileName('');
    const fields = await getTemplateFields(templateId);
    setTemplateFields(fields);
  };

  const sortedFields = React.useMemo(() => {
    const front = templateFields
      .filter((f) => f.side === 'front')
      .sort((a, b) => a.position - b.position);
    const back = templateFields
      .filter((f) => f.side === 'back')
      .sort((a, b) => a.position - b.position);
    return [...front, ...back];
  }, [templateFields]);

  const selectedTemplate = templates.find(
    (t) => t.id === selectedTemplateId
  );
  const isCustomTemplate =
    selectedTemplate &&
    !(
      templateFields.length === 2 &&
      templateFields.some((f) => f.name === 'Front') &&
      templateFields.some((f) => f.name === 'Back')
    );

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const clean = content.replace(/^\uFEFF/, '').trim();
      if (!clean) {
        Alert.alert('Error', 'The file is empty.');
        return;
      }

      setFileName(file.name);
      setFileContent(clean);
      setPreviewCards([]);
    } catch (error) {
      Alert.alert('Import Error', 'Could not read the file.');
    }
  };

  const handleParseFile = () => {
    if (!fileContent) return;

    const fields = isCustomTemplate ? templateFields : undefined;

    let cards: ImportedCard[] = [];
    try {
      cards = parseJSON(fileContent, fields);
    } catch (jsonErr) {
      try {
        cards = parseCSV(fileContent, fields);
      } catch (csvErr) {
        Alert.alert(
          'Parse Error',
          `Could not parse ${fileName}.\n\nJSON: ${(jsonErr as Error).message}\nCSV: ${(csvErr as Error).message}\n\nFirst 100 chars:\n${fileContent.substring(0, 100)}`
        );
        return;
      }
    }

    setPreviewCards(cards);

    if (cards.length === 0) {
      const fieldNames = fields ? fields.map((f) => f.name).join(', ') : 'none';
      Alert.alert(
        'No Cards Found',
        `File: ${fileName}\nTemplate fields: ${fieldNames}\nIs custom template: ${isCustomTemplate}\nFirst 100 chars:\n${fileContent.substring(0, 100)}\n\nMake sure the file keys match the template field names.`
      );
    }
  };

  const handleImport = async () => {
    if (selectedDeckId === null) {
      Alert.alert('Error', 'Please select a deck first.');
      return;
    }
    if (previewCards.length === 0) {
      Alert.alert('Error', 'No cards to import.');
      return;
    }

    setImporting(true);
    try {
      const tid = isCustomTemplate ? selectedTemplateId : undefined;
      const count = await importCards(selectedDeckId, previewCards, tid ?? undefined);
      Alert.alert(
        'Import Complete',
        `Successfully imported ${count} card${count !== 1 ? 's' : ''}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPreviewCards([]);
              setFileName('');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import cards.');
    } finally {
      setImporting(false);
    }
  };

  const renderPreview = () => {
    if (previewCards.length === 0) return null;

    return (
      <>
        <Text style={styles.sectionTitle}>Preview</Text>
        {isCustomTemplate ? (
          sortedFields.map((f) => {
            const values = previewCards.slice(0, 3).map((c) => c.field_values?.[f.name] ?? '—');
            return (
              <View key={f.name} style={styles.previewFieldRow}>
                <Text style={styles.previewFieldLabel}>
                  {f.name} ({f.side})
                </Text>
                <Text style={styles.previewFieldValues} numberOfLines={1}>
                  {values.join('  |  ')}
                </Text>
              </View>
            );
          })
        ) : (
          previewCards.slice(0, 5).map((card, index) => (
            <View key={index} style={styles.previewItem}>
              <Text style={styles.previewIndex}>#{index + 1}</Text>
              <View style={styles.previewContent}>
                <Text style={styles.previewFront} numberOfLines={1}>
                  {card.front_text}
                </Text>
                <Text style={styles.previewBack} numberOfLines={1}>
                  {card.back_text}
                </Text>
              </View>
            </View>
          ))
        )}
        {previewCards.length > 5 && (
          <Text style={styles.moreText}>
            ... and {previewCards.length - 5} more
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.importButton,
            (importing || selectedDeckId === null) && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={importing || selectedDeckId === null}
        >
          <Text style={styles.importButtonText}>
            {importing ? 'Importing...' : `Import ${previewCards.length} Cards`}
          </Text>
        </TouchableOpacity>
      </>
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: 4,
    },
    sectionDesc: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    chipScroll: {
      marginBottom: spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: withAlpha(colors.primary, 0.08),
    },
    chipText: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: '600',
    },
    chipTextSelected: {
      color: colors.primary,
    },
    emptyChips: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    templateHint: {
      backgroundColor: withAlpha(colors.secondary, 0.06),
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    templateHintTitle: {
      fontSize: fontSize.sm,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 4,
    },
    templateHintText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: 18,
    },
    pickFileButton: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      borderRadius: borderRadius.md,
      paddingVertical: 32,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    pickFileButtonText: {
      fontSize: fontSize.md,
      color: colors.primary,
      fontWeight: '600',
    },
    parseButton: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.sm + 4,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    parseButtonText: {
      fontSize: fontSize.md,
      color: colors.surface,
      fontWeight: '700',
    },
    previewItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    previewIndex: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontWeight: '700',
      marginRight: spacing.sm,
      minWidth: 30,
    },
    previewContent: {
      flex: 1,
    },
    previewFront: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: '600',
    },
    previewBack: {
      fontSize: fontSize.sm,
      color: colors.secondary,
    },
    previewFieldRow: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    previewFieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    previewFieldValues: {
      fontSize: fontSize.sm,
      color: colors.text,
    },
    moreText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    importButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    importButtonDisabled: {
      opacity: 0.5,
    },
    importButtonText: {
      color: colors.surface,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
  }), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>1. Select a Deck</Text>
      <Text style={styles.sectionDesc}>
        Choose the deck where imported cards will be added.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        <View style={styles.chipRow}>
          {decks.map((deck) => (
            <TouchableOpacity
              key={deck.id}
              style={[
                styles.chip,
                selectedDeckId === deck.id && styles.chipSelected,
              ]}
              onPress={() => setSelectedDeckId(deck.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedDeckId === deck.id && styles.chipTextSelected,
                ]}
              >
                {deck.name}
              </Text>
            </TouchableOpacity>
          ))}
          {decks.length === 0 && (
            <Text style={styles.emptyChips}>
              No decks available. Create a deck first.
            </Text>
          )}
        </View>
      </ScrollView>

      <Text style={styles.sectionTitle}>2. Select a Template</Text>
      <Text style={styles.sectionDesc}>
        Choose which template to use for the imported cards.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        <View style={styles.chipRow}>
          {templates.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.chip,
                selectedTemplateId === t.id && styles.chipSelected,
              ]}
              onPress={() => handleTemplateSelect(t.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedTemplateId === t.id && styles.chipTextSelected,
                ]}
              >
                {t.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {isCustomTemplate && (
        <View style={styles.templateHint}>
          <Text style={styles.templateHintTitle}>
            Fields in "{selectedTemplate?.name}"
          </Text>
          <Text style={styles.templateHintText}>
            CSV: columns should match field names in order.
          </Text>
          <Text style={styles.templateHintText}>
            {'JSON: {"' +
              sortedFields.map((f) => f.name).join('", "') +
              '"}'}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>3. Choose a File</Text>
      <Text style={styles.sectionDesc}>
        {'CSV: comma-separated values per line.\n'}
        {'JSON: array of objects with field names as keys.'}
      </Text>
      <TouchableOpacity style={styles.pickFileButton} onPress={handlePickFile}>
        <Text style={styles.pickFileButtonText}>
          {fileName ? (
            <><Ionicons name="document" size={16} color={colors.primary} /> {fileName}</>
          ) : (
            <><Ionicons name="folder-open" size={16} color={colors.primary} /> Select File</>
          )}
        </Text>
      </TouchableOpacity>

      {fileName && fileContent && previewCards.length === 0 && (
        <TouchableOpacity style={styles.parseButton} onPress={handleParseFile}>
          <Text style={styles.parseButtonText}>
            <Ionicons name="search" size={16} color={colors.surface} /> Parse &amp; Preview
          </Text>
        </TouchableOpacity>
      )}

      {renderPreview()}
    </ScrollView>
  );
}
