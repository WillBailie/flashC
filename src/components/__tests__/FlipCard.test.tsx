import React from 'react';
import { render } from '@testing-library/react-native';
import { FlipCard } from '../FlipCard';
import { ThemeProvider } from '../../theme/ThemeContext';

jest.mock('../../i18n/TranslationContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en', setLanguage: jest.fn(), availableLanguages: [] }),
}));

jest.mock('../../utils/animation', () => ({
  useReduceMotion: () => false,
  SPRING_CONFIG: {},
}));

const TEST_FRONT = 'Bonjour';
const TEST_BACK = 'Hello';
const EXAMPLE_SENTENCE = 'Bonjour, comment allez-vous?';
const EXAMPLE_TRANSLATION = 'Hello, how are you?';
const EXAMPLE_PINYIN = 'Ni hao';

const NOOP = () => {};

async function renderFlip(overrides: Record<string, unknown> = {}) {
  return render(
    React.createElement(ThemeProvider, null,
      React.createElement(FlipCard, {
        frontText: TEST_FRONT,
        backText: TEST_BACK,
        isFlipped: overrides.isFlipped ?? false,
        onFlip: overrides.onFlip ?? NOOP,
        onSwipeLeft: overrides.onSwipeLeft,
        onSwipeRight: overrides.onSwipeRight,
        exampleSentence: overrides.exampleSentence,
        exampleTranslation: overrides.exampleTranslation,
        examplePinyin: overrides.examplePinyin,
        templateFields: overrides.templateFields,
        fieldValues: overrides.fieldValues,
      })
    )
  );
}

describe('FlipCard', () => {
  it('renders front text when not flipped', async () => {
    const { getByText } = await renderFlip({ isFlipped: false });
    expect(getByText(TEST_FRONT)).toBeTruthy();
  });

  it('renders back text when flipped', async () => {
    const { getByText } = await renderFlip({ isFlipped: true });
    expect(getByText(TEST_BACK)).toBeTruthy();
  });

  it('renders example sentence on front face when provided', async () => {
    const { getByText } = await renderFlip({ isFlipped: false, exampleSentence: EXAMPLE_SENTENCE });
    expect(getByText(EXAMPLE_SENTENCE)).toBeTruthy();
    expect(getByText('Example')).toBeTruthy();
  });

  it('renders example sentence in DOM when provided (on hidden front when flipped)', async () => {
    // Both faces are always in the DOM; backfaceVisibility hides one
    const { getByText } = await renderFlip({ isFlipped: true, exampleSentence: EXAMPLE_SENTENCE });
    expect(getByText(TEST_BACK)).toBeTruthy();
    // front face exists in DOM (hidden) — sentence is rendered
    expect(getByText(EXAMPLE_SENTENCE)).toBeTruthy();
  });

  it('renders example translation on back face when flipped and provided', async () => {
    const { getByText } = await renderFlip({ isFlipped: true, exampleTranslation: EXAMPLE_TRANSLATION });
    expect(getByText(EXAMPLE_TRANSLATION)).toBeTruthy();
    expect(getByText('Example')).toBeTruthy();
  });

  it('example translation exists in DOM even when isFlipped=false (on hidden back)', async () => {
    // Both faces are always in the DOM; back face renders with hidden visibility
    const { getByText } = await renderFlip({ isFlipped: false, exampleTranslation: EXAMPLE_TRANSLATION });
    expect(getByText(EXAMPLE_TRANSLATION)).toBeTruthy();
  });

  it('renders pinyin on back face when flipped and provided', async () => {
    const { getByText } = await renderFlip({ isFlipped: true, examplePinyin: EXAMPLE_PINYIN });
    expect(getByText(EXAMPLE_PINYIN)).toBeTruthy();
  });

  it('does NOT render example label when no example data provided', async () => {
    const { queryByText } = await renderFlip({ isFlipped: true });
    expect(queryByText('Example')).toBeNull();
  });

  it('shows front fallback text when no template fields and not flipped', async () => {
    const { getByText } = await renderFlip({ isFlipped: false, templateFields: undefined, fieldValues: undefined });
    expect(getByText(TEST_FRONT)).toBeTruthy();
  });

  it('shows back fallback text when no template fields and flipped', async () => {
    const { getByText } = await renderFlip({ isFlipped: true, templateFields: undefined, fieldValues: undefined });
    expect(getByText(TEST_BACK)).toBeTruthy();
  });
});
