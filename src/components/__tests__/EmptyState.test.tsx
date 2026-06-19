import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import { EmptyState } from '../EmptyState';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

jest.mock('../../utils/animation', () => ({
  useReduceMotion: () => true,
  SPRING_CONFIG: {},
}));

function renderEmpty(overrides: Record<string, unknown> = {}) {
  return renderWithTheme(
    React.createElement(EmptyState, {
      title: (overrides.title as string) ?? 'No items',
      subtitle: (overrides.subtitle as string) ?? 'Nothing here yet',
      icon: overrides.icon as string | undefined,
    })
  );
}

describe('EmptyState', () => {
  it('renders title', async () => {
    const { getByText } = await renderEmpty();
    expect(getByText('No items')).toBeTruthy();
  });

  it('renders subtitle', async () => {
    const { getByText } = await renderEmpty();
    expect(getByText('Nothing here yet')).toBeTruthy();
  });

  it('renders custom title', async () => {
    const { getByText } = await renderEmpty({ title: 'Empty deck' });
    expect(getByText('Empty deck')).toBeTruthy();
  });

  it('renders custom subtitle', async () => {
    const { getByText } = await renderEmpty({ subtitle: 'Create one now' });
    expect(getByText('Create one now')).toBeTruthy();
  });
});
