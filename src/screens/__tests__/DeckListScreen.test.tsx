import React from 'react';
import { renderWithTheme } from '../../testHelpers/render';
import DeckListScreen from '../../screens/DeckListScreen';

const mockDecks = [
  { id: 1, name: 'French Basics', language: 'fr', description: '', created_at: '' },
];

let mockOrphanCount = 0;

jest.mock('../../storage/database', () => ({
  getAllDecks: async () => mockDecks,
  getDeckStats: async () => ({ totalCards: 20, newCards: 5, dueCards: 3 }),
  createDeck: async () => 1,
  deleteDeck: async () => undefined,
  getOrphanCardCount: async () => mockOrphanCount,
  getOrphanCards: async () => [],
  moveCardsToDeck: async () => undefined,
  deleteOrphanCards: async () => 0,
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
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (fn: () => unknown) => { require('react').useEffect(fn, []); },
  };
});

describe('DeckListScreen', () => {
  beforeEach(() => {
    mockOrphanCount = 0;
  });

  it('renders without crashing when no orphans', async () => {
    const { toJSON } = await renderWithTheme(
      React.createElement(DeckListScreen, {})
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders orphan card section when orphans exist', async () => {
    mockOrphanCount = 3;
    const { getByText } = await renderWithTheme(
      React.createElement(DeckListScreen, {})
    );
    // The orphan section should render the orphan title text
    expect(getByText('deckList.orphanTitle')).toBeTruthy();
    // And the count text
    expect(getByText('deckList.orphanCount')).toBeTruthy();
  });

  it('does not render orphan section when orphan count is 0', async () => {
    mockOrphanCount = 0;
    const { queryByText } = await renderWithTheme(
      React.createElement(DeckListScreen, {})
    );
    expect(queryByText('deckList.orphanTitle')).toBeNull();
  });

  it('renders deck list items alongside orphan section', async () => {
    mockOrphanCount = 1;
    const { getByText } = await renderWithTheme(
      React.createElement(DeckListScreen, {})
    );
    // Orphan section visible
    expect(getByText('deckList.orphanTitle')).toBeTruthy();
    // Regular deck also visible
    expect(getByText('French Basics')).toBeTruthy();
  });
});
