import * as database from '../database';
import { Deck, Card } from '../../models/types';

describe('Database Operations', () => {
  beforeAll(async () => {
    await database.getDatabase();
  });

  describe('Deck operations', () => {
    let deck: Deck;

    test('createDeck creates a new deck', async () => {
      deck = await database.createDeck('Test Deck', 'Test Description');
      expect(deck.id).toBeDefined();
      expect(deck.name).toBe('Test Deck');
      expect(deck.description).toBe('Test Description');
      expect(deck.created_at).toBeDefined();
    });

    test('getAllDecks returns all decks', async () => {
      const decks = await database.getAllDecks();
      expect(decks.length).toBeGreaterThanOrEqual(1);
      expect(decks.some((d) => d.id === deck.id)).toBe(true);
    });

    test('getDeckById returns correct deck', async () => {
      const found = await database.getDeckById(deck.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Test Deck');
    });

    test('getDeckById returns null for non-existent deck', async () => {
      const found = await database.getDeckById(99999);
      expect(found).toBeNull();
    });

    test('updateDeck updates deck fields', async () => {
      await database.updateDeck(deck.id, 'Updated Deck', 'Updated Desc');
      const updated = await database.getDeckById(deck.id);
      expect(updated!.name).toBe('Updated Deck');
      expect(updated!.description).toBe('Updated Desc');
      deck = updated!;
    });

    test('deleteDeck removes a deck', async () => {
      const tempDeck = await database.createDeck('To Delete', '');
      await database.deleteDeck(tempDeck.id);
      const found = await database.getDeckById(tempDeck.id);
      expect(found).toBeNull();
    });
  });

  describe('Card operations', () => {
    let deck: Deck;
    let card: Card;

    beforeAll(async () => {
      deck = await database.createDeck('Card Test Deck', '');
    });

    afterAll(async () => {
      await database.deleteDeck(deck.id);
    });

    test('createCard creates a new card with a review record', async () => {
      card = await database.createCard(deck.id, 'Front Text', 'Back Text');
      expect(card.id).toBeDefined();
      expect(card.deck_id).toBe(deck.id);
      expect(card.front_text).toBe('Front Text');
      expect(card.back_text).toBe('Back Text');

      const review = await database.getReviewByCardId(card.id);
      expect(review).not.toBeNull();
      expect(review!.ease_factor).toBe(2.5);
      expect(review!.interval).toBe(0);
      expect(review!.repetitions).toBe(0);
    });

    test('getCardsByDeckId returns cards for a deck', async () => {
      await database.createCard(deck.id, 'Card 2 Front', 'Card 2 Back');
      const cards = await database.getCardsByDeckId(deck.id);
      expect(cards.length).toBe(2);
    });

    test('getCardById returns correct card', async () => {
      const found = await database.getCardById(card.id);
      expect(found).not.toBeNull();
      expect(found!.front_text).toBe('Front Text');
    });

    test('updateCard modifies card text', async () => {
      await database.updateCard(card.id, 'Updated Front', 'Updated Back');
      const updated = await database.getCardById(card.id);
      expect(updated!.front_text).toBe('Updated Front');
      expect(updated!.back_text).toBe('Updated Back');
    });

    test('deleteCard removes a card', async () => {
      const tempCard = await database.createCard(deck.id, 'Temp', 'Temp');
      await database.deleteCard(tempCard.id);
      const found = await database.getCardById(tempCard.id);
      expect(found).toBeNull();
    });

    test('cascade delete: deleting a deck removes its cards', async () => {
      const cascadeDeck = await database.createDeck('Cascade', '');
      await database.createCard(cascadeDeck.id, 'F', 'B');
      await database.deleteDeck(cascadeDeck.id);
      const cards = await database.getCardsByDeckId(cascadeDeck.id);
      expect(cards.length).toBe(0);
    });
  });

  describe('Review operations', () => {
    let deck: Deck;
    let card: Card;
    let dueCard: Card;

    beforeAll(async () => {
      deck = await database.createDeck('Review Deck', '');
      card = await database.createCard(deck.id, 'Review Front', 'Review Back');
      dueCard = await database.createCard(deck.id, 'Due Front', 'Due Back');
    });

    afterAll(async () => {
      await database.deleteDeck(deck.id);
    });

    test('updateReview updates review stats', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      await database.updateReview(card.id, 2.6, 1, 1, tomorrow.toISOString());

      const review = await database.getReviewByCardId(card.id);
      expect(review!.ease_factor).toBe(2.6);
      expect(review!.interval).toBe(1);
      expect(review!.repetitions).toBe(1);
      expect(review!.next_review_date).toBe(tomorrow.toISOString());
      expect(review!.last_review_date).toBeDefined();
    });

    test('getCardsDueForReview returns cards past their review date', async () => {
      const cards = await database.getCardsDueForReview(deck.id);
      expect(cards.length).toBeGreaterThanOrEqual(1);
      expect(cards.some((c) => c.id === dueCard.id)).toBe(true);
    });

    test('getCardsDueForReview filters by deck', async () => {
      const otherDeck = await database.createDeck('Other', '');
      const otherCard = await database.createCard(otherDeck.id, 'OF', 'OB');
      try {
        const cards = await database.getCardsDueForReview(deck.id);
        expect(cards.some((c) => c.id === otherCard.id)).toBe(false);
      } finally {
        await database.deleteDeck(otherDeck.id);
      }
    });
  });

  describe('Import operations', () => {
    let deck: Deck;

    beforeAll(async () => {
      deck = await database.createDeck('Import Deck', '');
    });

    afterAll(async () => {
      await database.deleteDeck(deck.id);
    });

    test('importCards bulk imports cards', async () => {
      const count = await database.importCards(deck.id, [
        { front_text: 'one', back_text: 'uno' },
        { front_text: 'two', back_text: 'dos' },
        { front_text: 'three', back_text: 'tres' },
      ]);
      expect(count).toBe(3);

      const cards = await database.getCardsByDeckId(deck.id);
      expect(cards.length).toBe(3);
    });
  });

  describe('Deck stats', () => {
    let deck: Deck;

    beforeAll(async () => {
      deck = await database.createDeck('Stats Deck', '');
      await database.createCard(deck.id, 'F1', 'B1');
      await database.createCard(deck.id, 'F2', 'B2');
    });

    afterAll(async () => {
      await database.deleteDeck(deck.id);
    });

    test('getDeckStats returns correct counts', async () => {
      const stats = await database.getDeckStats(deck.id);
      expect(stats.totalCards).toBe(2);
      expect(stats.newCards).toBe(2);
    });

    test('getDeckStats returns zero for non-existent deck', async () => {
      const stats = await database.getDeckStats(99999);
      expect(stats.totalCards).toBe(0);
      expect(stats.newCards).toBe(0);
      expect(stats.dueCards).toBe(0);
    });
  });

  describe('Template operations', () => {
    test('getDefaultTemplateId returns the seeded Basic template', async () => {
      const id = await database.getDefaultTemplateId();
      expect(id).toBeGreaterThan(0);
    });

    test('getAllTemplates returns at least the Basic template', async () => {
      const templates = await database.getAllTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(1);
      expect(templates.some((t) => t.name === 'Basic')).toBe(true);
    });

    test('getTemplateFields returns fields for Basic template', async () => {
      const defaultId = await database.getDefaultTemplateId();
      const fields = await database.getTemplateFields(defaultId);
      expect(fields.length).toBe(2);
      expect(fields.some((f) => f.name === 'Front' && f.side === 'front')).toBe(true);
      expect(fields.some((f) => f.name === 'Back' && f.side === 'back')).toBe(true);
    });

    test('createTemplate creates a custom template', async () => {
      const template = await database.createTemplate('Chinese Vocab');
      expect(template.name).toBe('Chinese Vocab');
      expect(template.id).toBeGreaterThan(0);
    });

    test('addTemplateField adds a field to a template', async () => {
      const template = await database.createTemplate('Test Fields');
      const field = await database.addTemplateField(template.id, 'Hanzi', 'front', 0);
      expect(field.name).toBe('Hanzi');
      expect(field.side).toBe('front');
      expect(field.position).toBe(0);

      const field2 = await database.addTemplateField(template.id, 'Pinyin', 'back', 0);
      expect(field2.side).toBe('back');

      const fields = await database.getTemplateFields(template.id);
      expect(fields.length).toBe(2);
    });

    test('deleteTemplateField removes a field', async () => {
      const template = await database.createTemplate('Field Delete');
      const field = await database.addTemplateField(template.id, 'Extra', 'front', 0);
      await database.deleteTemplateField(field.id);
      const fields = await database.getTemplateFields(template.id);
      expect(fields.length).toBe(0);
    });

    test('deleteTemplate removes a template', async () => {
      const template = await database.createTemplate('To Delete');
      await database.deleteTemplate(template.id);
      const templates = await database.getAllTemplates();
      expect(templates.some((t) => t.id === template.id)).toBe(false);
    });
  });

  describe('Card with template', () => {
    test('createCard with template and field values', async () => {
      const deck = await database.createDeck('Template Deck', '');
      const defaultId = await database.getDefaultTemplateId();
      const fieldValues = { Front: 'hello', Back: 'hola' };

      const card = await database.createCard(
        deck.id, 'hello', 'hola', defaultId, fieldValues
      );

      expect(card.template_id).toBe(defaultId);
      expect(card.field_values).toBe(JSON.stringify(fieldValues));

      await database.deleteDeck(deck.id);
    });

    test('updateCard with template and field values', async () => {
      const deck = await database.createDeck('Update Template Deck', '');
      const defaultId = await database.getDefaultTemplateId();
      const card = await database.createCard(deck.id, 'hello', 'hola');

      const newValues = { Front: 'updated', Back: 'actualizado' };
      await database.updateCard(card.id, 'updated', 'actualizado', defaultId, newValues);

      const updated = await database.getCardById(card.id);
      expect(updated!.field_values).toBe(JSON.stringify(newValues));

      await database.deleteDeck(deck.id);
    });

    test('importCards with template id', async () => {
      const deck = await database.createDeck('Import Template Deck', '');
      const count = await database.importCards(
        deck.id,
        [{ front_text: 'cat', back_text: 'gato' }],
        undefined
      );
      expect(count).toBe(1);

      const cards = await database.getCardsByDeckId(deck.id);
      expect(cards[0].template_id).toBeGreaterThan(0);

      await database.deleteDeck(deck.id);
    });
  });

  describe('Global stats', () => {
    let deck: Deck;
    let card1: Card;
    let card2: Card;

    beforeAll(async () => {
      deck = await database.createDeck('Stats Deck', '');
      card1 = await database.createCard(deck.id, 'a', 'A');
      card2 = await database.createCard(deck.id, 'b', 'B');
      // Mark card1 as reviewed (not new, and with interval > 0)
      await database.updateReview(card1.id, 2.5, 30, 2, new Date(2099, 0, 1).toISOString());
    });

    afterAll(async () => {
      await database.deleteDeck(deck.id);
    });

    test('getGlobalStats returns correct counts', async () => {
      const stats = await database.getGlobalStats();
      expect(stats.totalCards).toBeGreaterThanOrEqual(2);
      expect(stats.totalDecks).toBeGreaterThanOrEqual(1);
      expect(stats.totalTemplates).toBeGreaterThanOrEqual(1);
      expect(stats.newCards).toBeGreaterThanOrEqual(1);
      expect(stats.masteredCards).toBeGreaterThanOrEqual(1);
    });

    test('getGlobalStats has sensible defaults', async () => {
      const stats = await database.getGlobalStats();
      expect(stats.avgEaseFactor).toBeGreaterThanOrEqual(2.0);
      expect(stats.reviewsToday).toBeGreaterThanOrEqual(0);
      expect(stats.dueCards).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRandomCardsForReview', () => {
    let deck: Deck;

    beforeAll(async () => {
      deck = await database.createDeck('Random Review Deck', '');
      await database.createCard(deck.id, 'A', 'AA');
      await database.createCard(deck.id, 'B', 'BB');
      await database.createCard(deck.id, 'C', 'CC');
    });

    afterAll(async () => {
      await database.deleteDeck(deck.id);
    });

    test('returns cards from specified deck', async () => {
      const cards = await database.getRandomCardsForReview(deck.id, 10);
      expect(cards.length).toBe(3);
      expect(cards.every((c) => c.deck_id === deck.id)).toBe(true);
    });

    test('respects count limit', async () => {
      const cards = await database.getRandomCardsForReview(deck.id, 2);
      expect(cards.length).toBe(2);
    });

    test('returns CardWithReview fields', async () => {
      const cards = await database.getRandomCardsForReview(deck.id, 1);
      const c = cards[0];
      expect(c).toHaveProperty('ease_factor');
      expect(c).toHaveProperty('interval');
      expect(c).toHaveProperty('repetitions');
      expect(c).toHaveProperty('next_review_date');
      expect(c).toHaveProperty('last_review_date');
    });

    test('returns empty array when no cards in deck', async () => {
      const emptyDeck = await database.createDeck('Empty Random', '');
      const cards = await database.getRandomCardsForReview(emptyDeck.id, 10);
      expect(cards).toEqual([]);
      await database.deleteDeck(emptyDeck.id);
    });

    test('without deckId, returns cards from all decks', async () => {
      const cards = await database.getRandomCardsForReview(undefined, 50);
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getStreak', () => {
    async function setReviewDate(cardId: number, dateStr: string) {
      const db = await database.getDatabase();
      await db.runAsync(
        'UPDATE reviews SET last_review_date = ? WHERE card_id = ?',
        [dateStr, cardId]
      );
    }

    function dateStr(daysAgo: number): string {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString();
    }

    async function createCardWithDate(deckId: number, front: string, back: string, daysAgo: number) {
      const card = await database.createCard(deckId, front, back);
      await setReviewDate(card.id, dateStr(daysAgo));
      return card;
    }

    test('no reviews → streak 0, multiplier 1', async () => {
      const { streak, multiplier } = await database.getStreak();
      expect(streak).toBeGreaterThanOrEqual(0);
      expect(multiplier).toBeGreaterThanOrEqual(1);
    });

    test('single review today → streak 1, multiplier 1', async () => {
      const deck = await database.createDeck('Streak Test 1', '');
      await createCardWithDate(deck.id, 'F', 'B', 0);
      const { streak, multiplier } = await database.getStreak();
      expect(streak).toBe(1);
      expect(multiplier).toBe(1);
      await database.deleteDeck(deck.id);
    });

    test('3 consecutive days → streak 3, multiplier 2', async () => {
      const deck = await database.createDeck('Streak Test 3', '');
      await createCardWithDate(deck.id, 'a', 'A', 0);
      await createCardWithDate(deck.id, 'b', 'B', 1);
      await createCardWithDate(deck.id, 'c', 'C', 2);
      const { streak, multiplier } = await database.getStreak();
      expect(streak).toBeGreaterThanOrEqual(3);
      expect(multiplier).toBeGreaterThanOrEqual(2);
      await database.deleteDeck(deck.id);
    });

    test('7 consecutive days → multiplier >= 3', async () => {
      const deck = await database.createDeck('Streak Test 7', '');
      for (let i = 0; i < 7; i++) {
        await createCardWithDate(deck.id, `d${i}`, `D${i}`, i);
      }
      const { streak, multiplier } = await database.getStreak();
      expect(streak).toBeGreaterThanOrEqual(7);
      expect(multiplier).toBeGreaterThanOrEqual(3);
      await database.deleteDeck(deck.id);
    });

    test('14 consecutive days → multiplier >= 4', async () => {
      const deck = await database.createDeck('Streak Test 14', '');
      for (let i = 0; i < 14; i++) {
        await createCardWithDate(deck.id, `e${i}`, `E${i}`, i);
      }
      const { streak, multiplier } = await database.getStreak();
      expect(streak).toBeGreaterThanOrEqual(14);
      expect(multiplier).toBeGreaterThanOrEqual(4);
      await database.deleteDeck(deck.id);
    });

    test('30 consecutive days → multiplier >= 5', async () => {
      const deck = await database.createDeck('Streak Test 30', '');
      for (let i = 0; i < 30; i++) {
        await createCardWithDate(deck.id, `f${i}`, `F${i}`, i);
      }
      const { streak, multiplier } = await database.getStreak();
      expect(streak).toBeGreaterThanOrEqual(30);
      expect(multiplier).toBeGreaterThanOrEqual(5);
      await database.deleteDeck(deck.id);
    });

    test('gap of one day breaks streak (today + 2 days ago only)', async () => {
      const deck = await database.createDeck('Streak Gap', '');
      await createCardWithDate(deck.id, 'g1', 'G1', 0);
      await createCardWithDate(deck.id, 'g2', 'G2', 2);
      const { streak } = await database.getStreak();
      expect(streak).toBeGreaterThanOrEqual(1);
      await database.deleteDeck(deck.id);
    });

    test('multiple reviews on same day do not double-count', async () => {
      const deck = await database.createDeck('Streak SameDay', '');
      const c1 = await database.createCard(deck.id, 'h1', 'H1');
      const c2 = await database.createCard(deck.id, 'h2', 'H2');
      const today = dateStr(0);
      await setReviewDate(c1.id, today);
      await setReviewDate(c2.id, today);
      const { streak } = await database.getStreak();
      expect(streak).toBeGreaterThanOrEqual(1);
      await database.deleteDeck(deck.id);
    });
  });
});

