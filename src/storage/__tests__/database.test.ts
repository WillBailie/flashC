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
});

