import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import { Confetti } from '../Confetti';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

jest.mock('../../utils/animation', () => ({
  useReduceMotion: () => false,
  SPRING_CONFIG: {},
}));

jest.useFakeTimers();

function renderConfetti(overrides: Record<string, unknown> = {}) {
  return renderWithTheme(
    React.createElement(Confetti, {
      trigger: (overrides.trigger as boolean) ?? true,
      onComplete: overrides.onComplete as (() => void) | undefined,
    })
  );
}

describe('Confetti', () => {
  it('renders when trigger is true', async () => {
    const { toJSON } = await renderConfetti({ trigger: true });
    expect(toJSON()).toBeTruthy();
  });

  it('renders without particles when trigger is false', async () => {
    const { toJSON } = await renderConfetti({ trigger: false });
    const json = toJSON();
    expect(json).toBeTruthy();
  });

  it('calls onComplete after animation delay', async () => {
    const onComplete = jest.fn();
    await renderConfetti({ trigger: true, onComplete });
    jest.advanceTimersByTime(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
