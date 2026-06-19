import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../../testHelpers/render';
import { Card } from '../Card';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

type AnyProps = Record<string, unknown>;

function renderCard(overrides: AnyProps = {}) {
  return renderWithTheme(
    React.createElement(Card, {
      variant: overrides.variant as AnyProps['variant'],
      interactive: (overrides.interactive as boolean) ?? false,
      onPress: overrides.onPress as (() => void) | undefined,
      onLongPress: overrides.onLongPress as (() => void) | undefined,
      delayLongPress: overrides.delayLongPress as number | undefined,
      children: overrides.children ?? React.createElement(Text, null, 'card content'),
      ...overrides,
    })
  );
}

describe('Card', () => {
  it('renders children text', async () => {
    const { getByText } = await renderCard();
    expect(getByText('card content')).toBeTruthy();
  });

  it('renders elevated variant by default', async () => {
    const { getByText } = await renderCard();
    expect(getByText('card content')).toBeTruthy();
  });

  it('renders outlined variant', async () => {
    const { getByText } = await renderCard({ variant: 'outlined' });
    expect(getByText('card content')).toBeTruthy();
  });

  it('renders flat variant', async () => {
    const { getByText } = await renderCard({ variant: 'flat' });
    expect(getByText('card content')).toBeTruthy();
  });

  it('fires onPress when interactive', async () => {
    const onPress = jest.fn();
    const { getByRole } = await renderCard({ interactive: true, onPress });
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fires onLongPress when interactive', async () => {
    const onLongPress = jest.fn();
    const { getByRole } = await renderCard({ interactive: true, onLongPress });
    fireEvent(getByRole('button'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('does not have button role when non-interactive', async () => {
    const { queryByRole } = await renderCard({ interactive: false });
    expect(queryByRole('button')).toBeNull();
  });
});
