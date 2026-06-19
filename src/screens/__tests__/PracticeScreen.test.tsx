import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme/ThemeContext';
import PracticeScreen from '../../screens/PracticeScreen';

const mockCards = [
  { id: 1, front_text: 'Bonjour', back_text: 'Hello', deck_id: 1, ease_factor: 2.5, interval: 1, repetitions: 0, next_review_date: '2026-06-19', field_values: null, created_at: '', modified_at: '' },
];

jest.mock('../../storage/database', () => ({
  getRandomCardsForReview: async () => mockCards,
  updateReview: async () => undefined,
  getTemplateFields: async () => [],
  getDeckById: async () => ({ id: 1, name: 'French', language: 'fr', card_count: 1, new_count: 1, learning_count: 0, review_count: 0, mastered_count: 0 }),
}));

jest.mock('../../utils/spacedRepetition', () => ({
  calculateSM2: () => ({ easeFactor: 2.5, interval: 1, repetitions: 1, nextReviewDate: new Date() }),
}));

jest.mock('../../utils/practiceSession', () => ({
  advanceOnRate: () => ({ cards: mockCards, currentIndex: 0, isFlipped: false, isComplete: false }),
  advanceOnSwipeLeft: () => ({ cards: mockCards, currentIndex: 0, isFlipped: false }),
  advanceOnSwipeRight: () => ({ cards: mockCards, currentIndex: 0, isFlipped: true }),
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

describe('PracticeScreen', () => {
  it('renders without crashing', async () => {
    const result = await render(
      React.createElement(SafeAreaProvider, null,
        React.createElement(ThemeProvider, null,
          React.createElement(PracticeScreen, {
            route: { params: { deckId: 1, deckName: 'French', mode: 'daily' }, key: 'Practice', name: 'Practice' },
            navigation: { navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn() },
          })
        )
      )
    );
    expect(result).toBeTruthy();
  });
});
