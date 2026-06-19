import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import ExportScreen from '../../screens/ExportScreen';

jest.mock('../../storage/database', () => ({
  getAllDecks: jest.fn().mockResolvedValue([
    { id: 1, name: 'French', language: 'fr', card_count: 20, new_count: 5, learning_count: 3, review_count: 12, mastered_count: 5 },
  ]),
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
    useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn() }),
    useFocusEffect: (fn: () => unknown) => { require('react').useEffect(fn, []); },
  };
});

describe('ExportScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(ExportScreen, {})
    );
    expect(toJSON()).toBeTruthy();
  });
});
