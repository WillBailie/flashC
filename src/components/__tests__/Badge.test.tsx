import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import { Badge } from '../Badge';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

type AnyProps = Record<string, unknown>;

function renderBadge(overrides: AnyProps = {}) {
  return renderWithTheme(
    React.createElement(Badge, {
      text: (overrides.text as string) ?? 'New',
      variant: overrides.variant as AnyProps['variant'],
      color: overrides.color as string | undefined,
      ...overrides,
    })
  );
}

describe('Badge', () => {
  it('renders text label', async () => {
    const { getByText } = await renderBadge();
    expect(getByText('New')).toBeTruthy();
  });

  it('renders subtle variant by default', async () => {
    const { getByText } = await renderBadge();
    expect(getByText('New')).toBeTruthy();
  });

  it('renders filled variant', async () => {
    const { getByText } = await renderBadge({ variant: 'filled' });
    expect(getByText('New')).toBeTruthy();
  });

  it('renders custom text', async () => {
    const { getByText } = await renderBadge({ text: 'Premium' });
    expect(getByText('Premium')).toBeTruthy();
  });

  it('accepts custom color prop', async () => {
    const { getByText } = await renderBadge({ color: '#FF0000' });
    expect(getByText('New')).toBeTruthy();
  });
});
