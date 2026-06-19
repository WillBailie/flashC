import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithTheme } from '../../testHelpers/render';
import { Button } from '../Button';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

jest.mock('../../utils/animation', () => ({
  useReduceMotion: () => false,
  SPRING_CONFIG: {},
}));

type AnyProps = Record<string, unknown>;

function btn(overrides: AnyProps = {}) {
  return renderWithTheme(
    React.createElement(Button, {
      title: overrides.title ?? 'Press Me',
      onPress: overrides.onPress ?? (() => {}),
      variant: overrides.variant as AnyProps['variant'],
      size: overrides.size as AnyProps['size'],
      loading: (overrides.loading as boolean) ?? false,
      disabled: (overrides.disabled as boolean) ?? false,
      fullWidth: (overrides.fullWidth as boolean) ?? false,
      ...overrides,
    })
  );
}

describe('Button', () => {
  it('renders title text', async () => {
    const { getByText } = await btn();
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders primary variant by default', async () => {
    const { getByText } = await btn();
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders secondary variant', async () => {
    const { getByText } = await btn({ variant: 'secondary' });
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders ghost variant', async () => {
    const { getByText } = await btn({ variant: 'ghost' });
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders danger variant', async () => {
    const { getByText } = await btn({ variant: 'danger' });
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders sm size', async () => {
    const { getByText } = await btn({ size: 'sm' });
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders md size', async () => {
    const { getByText } = await btn({ size: 'md' });
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders lg size', async () => {
    const { getByText } = await btn({ size: 'lg' });
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('renders custom title', async () => {
    const { getByText } = await btn({ title: 'Submit' });
    expect(getByText('Submit')).toBeTruthy();
  });

  it('fires onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await btn({ onPress });
    fireEvent.press(getByText('Press Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await btn({ onPress, disabled: true });
    fireEvent.press(getByText('Press Me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire onPress when loading', async () => {
    const onPress = jest.fn();
    const { getByText } = await btn({ onPress, loading: true });
    fireEvent.press(getByText('Press Me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders with loading spinner', async () => {
    const { getByRole, getByText } = await btn({ loading: true });
    expect(getByText('Press Me')).toBeTruthy();
    const button = getByRole('button');
    expect(button.props.accessibilityState.busy).toBe(true);
  });
});
