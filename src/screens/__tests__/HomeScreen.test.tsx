import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import HomeScreen from '../../screens/HomeScreen';

jest.mock('../../storage/database', () => ({
  getGlobalStats: jest.fn().mockResolvedValue({ totalCards: 42, totalDecks: 3, dueCards: 7, reviewsToday: 12, avgEaseFactor: 2.5, masteredCards: 10 }),
  getStreak: jest.fn().mockResolvedValue(5),
  getAllDecks: jest.fn().mockResolvedValue([]),
  importCards: jest.fn().mockResolvedValue(0),
  createDeck: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../utils/dailyWords', () => ({
  generateDailyWords: jest.fn().mockResolvedValue([]),
  DAILY_WORD_POOL_SIZE: 10,
  DAILY_WORDS_PER_SET: 5,
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
    useNavigation: () => ({ navigate: jest.fn(), addListener: jest.fn().mockReturnValue(jest.fn()) }),
    useFocusEffect: (fn: () => unknown) => { require('react').useEffect(fn, []); },
  };
});

describe('HomeScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(HomeScreen, {})
    );
    expect(toJSON()).toBeTruthy();
  });
});
