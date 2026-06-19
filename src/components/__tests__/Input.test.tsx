import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../../testHelpers/render';
import { Input } from '../Input';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

type AnyProps = Record<string, unknown>;

function renderInput(overrides: AnyProps = {}) {
  return renderWithTheme(
    React.createElement(Input, {
      label: overrides.label as string | undefined,
      error: overrides.error as string | undefined,
      multiline: (overrides.multiline as boolean) ?? false,
      placeholder: overrides.placeholder as string | undefined,
      onFocus: overrides.onFocus as (() => void) | undefined,
      onBlur: overrides.onBlur as (() => void) | undefined,
      testID: 'input',
      ...overrides,
    })
  );
}

describe('Input', () => {
  it('renders label when provided', async () => {
    const { getByText } = await renderInput({ label: 'Email' });
    expect(getByText('Email')).toBeTruthy();
  });

  it('does not render label when not provided', async () => {
    const { queryByText } = await renderInput();
    expect(queryByText('Email')).toBeNull();
  });

  it('renders error message when provided', async () => {
    const { getByText } = await renderInput({ error: 'Required field' });
    expect(getByText('Required field')).toBeTruthy();
  });

  it('does not render error when not provided', async () => {
    const { queryByText } = await renderInput();
    expect(queryByText('Required field')).toBeNull();
  });

  it('renders with placeholder', async () => {
    const { getByPlaceholderText } = await renderInput({ placeholder: 'Enter text' });
    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('renders multiline input', async () => {
    const { getByTestId } = await renderInput({ multiline: true });
    const input = getByTestId('input');
    expect(input.props.multiline).toBe(true);
  });

  it('calls onFocus when input focused', async () => {
    const onFocus = jest.fn();
    const { getByTestId } = await renderInput({ onFocus });
    fireEvent(getByTestId('input'), 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('calls onBlur when input blurred', async () => {
    const onBlur = jest.fn();
    const { getByTestId } = await renderInput({ onBlur });
    fireEvent(getByTestId('input'), 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
