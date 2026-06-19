import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import CardFormScreen from '../../screens/CardFormScreen';

jest.mock('../../storage/database', () => ({
  getDeckById: jest.fn().mockResolvedValue({ id: 1, name: 'French', language: 'fr', card_count: 0, new_count: 0, learning_count: 0, review_count: 0, mastered_count: 0 }),
  createCard: jest.fn().mockResolvedValue(1),
  updateCard: jest.fn().mockResolvedValue(undefined),
  getReviewByCardId: jest.fn().mockResolvedValue(null),
  getAllTemplates: jest.fn().mockResolvedValue([]),
  getTemplateFields: jest.fn().mockResolvedValue([]),
  getDefaultTemplateId: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../utils/ai', () => ({
  callDeepSeek: jest.fn().mockResolvedValue(''),
  isDeepSeekAvailable: jest.fn().mockResolvedValue(false),
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

describe('CardFormScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(CardFormScreen, {
        route: { params: { deckId: 1 }, key: 'CardForm', name: 'CardForm' },
        navigation: { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() },
      })
    );
    expect(toJSON()).toBeTruthy();
  });
});
