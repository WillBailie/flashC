import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import ImportScreen from '../../screens/ImportScreen';

jest.mock('../../storage/database', () => ({
  getAllDecks: jest.fn().mockResolvedValue([]),
  importCards: jest.fn().mockResolvedValue(5),
  createDeck: jest.fn().mockResolvedValue(1),
  getAllTemplates: jest.fn().mockResolvedValue([]),
  getDefaultTemplateId: jest.fn().mockResolvedValue(null),
  getTemplateFields: jest.fn().mockResolvedValue([]),
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
  };
});

describe('ImportScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(ImportScreen, {})
    );
    expect(toJSON()).toBeTruthy();
  });
});
