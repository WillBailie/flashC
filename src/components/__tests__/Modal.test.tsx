import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../../testHelpers/render';
import { Modal } from '../Modal';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

jest.mock('../../utils/animation', () => ({
  useReduceMotion: () => false,
  SPRING_CONFIG: {},
}));

type AnyProps = Record<string, unknown>;

function renderModal(overrides: AnyProps = {}) {
  return renderWithTheme(
    React.createElement(Modal, {
      visible: (overrides.visible as boolean) ?? true,
      onClose: overrides.onClose ?? (() => {}),
      title: overrides.title as string | undefined,
      children: overrides.children ?? React.createElement(Text, null, 'Modal content'),
      ...overrides,
    })
  );
}

describe('Modal', () => {
  it('renders children when visible', async () => {
    const { getByText } = await renderModal({ visible: true });
    expect(getByText('Modal content')).toBeTruthy();
  });

  it('returns null when not visible', async () => {
    const { queryByText, toJSON } = await renderModal({ visible: false });
    expect(queryByText('Modal content')).toBeNull();
    expect(toJSON()).toBeNull();
  });

  it('renders title when provided', async () => {
    const { getByText } = await renderModal({ title: 'Confirm' });
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('does not render title when omitted', async () => {
    const { queryByText } = await renderModal();
    expect(queryByText('Confirm')).toBeNull();
  });

  it('renders nested View children', async () => {
    const { getByText } = await renderModal({
      children: React.createElement(View, null,
        React.createElement(Text, null, 'nested')
      ),
    });
    expect(getByText('nested')).toBeTruthy();
  });
});
