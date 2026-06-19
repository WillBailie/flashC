import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import TemplateEditorScreen from '../../screens/TemplateEditorScreen';

jest.mock('../../storage/database', () => ({
  getAllTemplates: jest.fn().mockResolvedValue([]),
  getTemplateFields: jest.fn().mockResolvedValue([]),
  getDefaultTemplateId: jest.fn().mockResolvedValue(null),
  addTemplateField: jest.fn().mockResolvedValue(1),
  deleteTemplateField: jest.fn().mockResolvedValue(undefined),
  deleteTemplate: jest.fn().mockResolvedValue(undefined),
  createTemplate: jest.fn().mockResolvedValue(1),
  updateTemplate: jest.fn().mockResolvedValue(undefined),
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

describe('TemplateEditorScreen', () => {
  it('renders without crashing in create mode', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(TemplateEditorScreen, {
        route: { params: {}, key: 'TemplateEditor', name: 'TemplateEditor' },
        navigation: { navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn() },
      })
    );
    expect(toJSON()).toBeTruthy();
  });
});
