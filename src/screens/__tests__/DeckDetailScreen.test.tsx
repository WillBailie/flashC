import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import DeckDetailScreen from '../../screens/DeckDetailScreen';

const mockCards = [
  { id: 1, front_text: 'Bonjour', back_text: 'Hello', deck_id: 1, ease_factor: 2.5, interval: 1, repetitions: 0, next_review_date: '2026-06-19', field_values: null, template_id: null, created_at: '', modified_at: '' },
];

jest.mock('../../storage/database', () => ({
  getCardsByDeckId: async () => mockCards,
  getDeckById: async () => ({ id: 1, name: 'French', language: 'fr', card_count: 1, new_count: 1, learning_count: 0, review_count: 0, mastered_count: 0 }),
  getTemplateFields: async () => [],
  deleteCard: async () => undefined,
  updateDeck: async () => undefined,
  deleteDeck: async () => undefined,
}));

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

jest.mock('../../utils/animation', () => ({
  useReduceMotion: () => true,
  SPRING_CONFIG: {},
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (fn: () => unknown) => { require('react').useEffect(fn, []); },
  };
});

describe('DeckDetailScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(DeckDetailScreen, {
        route: { params: { deckId: 1, deckName: 'French' }, key: 'DeckDetail', name: 'DeckDetail' },
        navigation: { navigate: jest.fn(), setOptions: jest.fn() },
      })
    );
    expect(toJSON()).toBeTruthy();
  });
});
