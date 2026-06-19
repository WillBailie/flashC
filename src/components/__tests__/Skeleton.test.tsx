import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import { Skeleton, SkeletonCard } from '../Skeleton';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

describe('Skeleton', () => {
  it('renders without error', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(Skeleton, {})
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom width and height', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(Skeleton, { width: 200, height: 24 })
    );
    expect(toJSON()).toBeTruthy();
  });

  it('SkeletonCard renders without error', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(SkeletonCard, {})
    );
    expect(toJSON()).toBeTruthy();
  });
});
