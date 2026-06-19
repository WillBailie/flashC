import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import TemplateListScreen from '../../screens/TemplateListScreen';

jest.mock('../../storage/database', () => ({
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
    useFocusEffect: (fn: () => unknown) => { require('react').useEffect(fn, []); },
  };
});

describe('TemplateListScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(TemplateListScreen, {})
    );
    expect(toJSON()).toBeTruthy();
  });
});
