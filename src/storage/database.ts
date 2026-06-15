import * as SQLite from 'expo-sqlite';
import { Deck, Card, Review, Template, TemplateField } from '../models/types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('flashcards.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS template_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      side TEXT NOT NULL CHECK(side IN ('front', 'back')),
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL,
      template_id INTEGER,
      front_text TEXT NOT NULL DEFAULT '',
      back_text TEXT NOT NULL DEFAULT '',
      field_values TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL UNIQUE,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_date TEXT NOT NULL DEFAULT '1970-01-01',
      last_review_date TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_cards_template_id ON cards(template_id);
    CREATE INDEX IF NOT EXISTS idx_template_fields_template ON template_fields(template_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_card_id ON reviews(card_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_next_review ON reviews(next_review_date);
  `);

  await seedDefaultTemplate(database);
}

async function seedDefaultTemplate(database: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM templates'
  );
  if (existing && existing.count === 0) {
    const result = await database.runAsync(
      'INSERT INTO templates (name) VALUES (?)',
      ['Basic']
    );
    const templateId = result.lastInsertRowId;
    await database.runAsync(
      'INSERT INTO template_fields (template_id, name, side, position) VALUES (?, ?, ?, ?)',
      [templateId, 'Front', 'front', 0]
    );
    await database.runAsync(
      'INSERT INTO template_fields (template_id, name, side, position) VALUES (?, ?, ?, ?)',
      [templateId, 'Back', 'back', 0]
    );
  }
}

export async function getDefaultTemplate(): Promise<Template> {
  const database = await getDatabase();
  const template = await database.getFirstAsync<Template>(
    'SELECT * FROM templates ORDER BY id ASC LIMIT 1'
  );
  return template!;
}

export async function getDefaultTemplateId(): Promise<number> {
  const template = await getDefaultTemplate();
  return template.id;
}

// ========== Deck operations ==========

export async function createDeck(name: string, description: string = ''): Promise<Deck> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO decks (name, description) VALUES (?, ?)',
    [name, description]
  );
  const deck = await database.getFirstAsync<Deck>(
    'SELECT * FROM decks WHERE id = ?',
    [result.lastInsertRowId]
  );
  return deck!;
}

export async function getAllDecks(): Promise<Deck[]> {
  const database = await getDatabase();
  return database.getAllAsync<Deck>('SELECT * FROM decks ORDER BY created_at DESC');
}

export async function getDeckById(id: number): Promise<Deck | null> {
  const database = await getDatabase();
  return database.getFirstAsync<Deck>('SELECT * FROM decks WHERE id = ?', [id]);
}

export async function updateDeck(id: number, name: string, description: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE decks SET name = ?, description = ? WHERE id = ?',
    [name, description, id]
  );
}

export async function deleteDeck(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM decks WHERE id = ?', [id]);
}

// ========== Template operations ==========

export async function createTemplate(name: string): Promise<Template> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO templates (name) VALUES (?)',
    [name]
  );
  const template = await database.getFirstAsync<Template>(
    'SELECT * FROM templates WHERE id = ?',
    [result.lastInsertRowId]
  );
  return template!;
}

export async function getAllTemplates(): Promise<Template[]> {
  const database = await getDatabase();
  return database.getAllAsync<Template>('SELECT * FROM templates ORDER BY id ASC');
}

export async function getTemplateById(id: number): Promise<Template | null> {
  const database = await getDatabase();
  return database.getFirstAsync<Template>('SELECT * FROM templates WHERE id = ?', [id]);
}

export async function getTemplateFields(templateId: number): Promise<TemplateField[]> {
  const database = await getDatabase();
  return database.getAllAsync<TemplateField>(
    'SELECT * FROM template_fields WHERE template_id = ? ORDER BY side, position',
    [templateId]
  );
}

export async function addTemplateField(
  templateId: number,
  name: string,
  side: 'front' | 'back',
  position: number
): Promise<TemplateField> {
  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO template_fields (template_id, name, side, position) VALUES (?, ?, ?, ?)',
    [templateId, name, side, position]
  );
  const field = await database.getFirstAsync<TemplateField>(
    'SELECT * FROM template_fields WHERE id = ?',
    [result.lastInsertRowId]
  );
  return field!;
}

export async function deleteTemplateField(fieldId: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM template_fields WHERE id = ?', [fieldId]);
}

export async function deleteTemplate(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM templates WHERE id = ?', [id]);
}

// ========== Card operations ==========

export async function createCard(
  deckId: number,
  frontText: string,
  backText: string,
  templateId?: number,
  fieldValues?: Record<string, string>
): Promise<Card> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const tid = templateId ?? (await getDefaultTemplateId());
  const fv = fieldValues ? JSON.stringify(fieldValues) : null;

  const result = await database.runAsync(
    `INSERT INTO cards (deck_id, template_id, front_text, back_text, field_values, created_at, modified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [deckId, tid, frontText, backText, fv, now, now]
  );
  await database.runAsync(
    'INSERT OR IGNORE INTO reviews (card_id) VALUES (?)',
    [result.lastInsertRowId]
  );
  const card = await database.getFirstAsync<Card>(
    'SELECT * FROM cards WHERE id = ?',
    [result.lastInsertRowId]
  );
  return card!;
}

export async function updateCard(
  id: number,
  frontText: string,
  backText: string,
  templateId?: number,
  fieldValues?: Record<string, string>
): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const tid = templateId ?? null;
  const fv = fieldValues ? JSON.stringify(fieldValues) : null;

  await database.runAsync(
    `UPDATE cards SET front_text = ?, back_text = ?, template_id = ?, field_values = ?, modified_at = ? WHERE id = ?`,
    [frontText, backText, tid, fv, now, id]
  );
}

export async function deleteCard(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}

export async function getCardsByDeckId(deckId: number): Promise<Card[]> {
  const database = await getDatabase();
  return database.getAllAsync<Card>(
    'SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC',
    [deckId]
  );
}

export async function getCardById(id: number): Promise<Card | null> {
  const database = await getDatabase();
  return database.getFirstAsync<Card>('SELECT * FROM cards WHERE id = ?', [id]);
}

export interface CardWithReview extends Card {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_review_date: string | null;
}

export async function getCardsDueForReview(deckId?: number): Promise<CardWithReview[]> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  let sql = `
    SELECT c.*, r.ease_factor, r.interval, r.repetitions, r.next_review_date, r.last_review_date
    FROM cards c
    INNER JOIN reviews r ON c.id = r.card_id
    WHERE r.next_review_date <= ?
  `;
  const params: (string | number)[] = [now];
  if (deckId !== undefined) {
    sql += ' AND c.deck_id = ?';
    params.push(deckId);
  }
  sql += ' ORDER BY r.next_review_date ASC LIMIT 50';
  return database.getAllAsync<CardWithReview>(sql, params);
}

export async function getExtraCardsForReview(
  deckId: number,
  excludeCardIds: number[],
  limit: number
): Promise<CardWithReview[]> {
  const database = await getDatabase();
  let sql = `
    SELECT c.*, r.ease_factor, r.interval, r.repetitions, r.next_review_date, r.last_review_date
    FROM cards c
    INNER JOIN reviews r ON c.id = r.card_id
    WHERE c.deck_id = ?
  `;
  const params: (string | number)[] = [deckId];

  if (excludeCardIds.length > 0) {
    const placeholders = excludeCardIds.map(() => '?').join(',');
    sql += ` AND c.id NOT IN (${placeholders})`;
    params.push(...excludeCardIds);
  }

  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(limit);
  return database.getAllAsync<CardWithReview>(sql, params);
}

export async function getRandomCardsForReview(
  deckId: number,
  count: number
): Promise<CardWithReview[]>;
export async function getRandomCardsForReview(
  deckId: number | undefined,
  count: number
): Promise<CardWithReview[]>;
export async function getRandomCardsForReview(
  deckId: number | undefined,
  count: number
): Promise<CardWithReview[]> {
  const database = await getDatabase();
  let sql = `
    SELECT c.*, r.ease_factor, r.interval, r.repetitions, r.next_review_date, r.last_review_date
    FROM cards c
    INNER JOIN reviews r ON c.id = r.card_id
  `;
  const params: (string | number)[] = [];

  if (deckId !== undefined) {
    sql += ' WHERE c.deck_id = ?';
    params.push(deckId);
  }

  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(count);
  return database.getAllAsync<CardWithReview>(sql, params);
}

export async function getReviewByCardId(cardId: number): Promise<Review | null> {
  const database = await getDatabase();
  return database.getFirstAsync<Review>(
    'SELECT * FROM reviews WHERE card_id = ?',
    [cardId]
  );
}

export async function updateReview(
  cardId: number,
  easeFactor: number,
  interval: number,
  repetitions: number,
  nextReviewDate: string
): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `UPDATE reviews SET ease_factor = ?, interval = ?, repetitions = ?, next_review_date = ?, last_review_date = ? WHERE card_id = ?`,
    [easeFactor, interval, repetitions, nextReviewDate, now, cardId]
  );
}

// ========== Import operations ==========

export async function importCards(
  deckId: number,
  cards: { front_text: string; back_text: string; field_values?: Record<string, string> }[],
  templateId?: number
): Promise<number> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const tid = templateId ?? (await getDefaultTemplateId());

  const insertCardStmt = await database.prepareAsync(
    `INSERT INTO cards (deck_id, template_id, front_text, back_text, field_values, created_at, modified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertReviewStmt = await database.prepareAsync(
    'INSERT OR IGNORE INTO reviews (card_id) VALUES (?)'
  );

  let count = 0;

  try {
    await database.withTransactionAsync(async () => {
      for (const card of cards) {
        const fv = card.field_values ? JSON.stringify(card.field_values) : null;
        const result = await insertCardStmt.executeAsync(
          [deckId, tid, card.front_text, card.back_text, fv, now, now]
        );
        await insertReviewStmt.executeAsync([result.lastInsertRowId]);
        count++;
      }
    });
  } finally {
    await insertCardStmt.finalizeAsync();
    await insertReviewStmt.finalizeAsync();
  }

  return count;
}

// ========== Stats ==========

export async function getDeckStats(deckId: number): Promise<{
  totalCards: number;
  newCards: number;
  dueCards: number;
}> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const totalResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards WHERE deck_id = ?',
    [deckId]
  );
  const newResult = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards c
     INNER JOIN reviews r ON c.id = r.card_id
     WHERE c.deck_id = ? AND r.last_review_date IS NULL`,
    [deckId]
  );
  const dueResult = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards c
     INNER JOIN reviews r ON c.id = r.card_id
     WHERE c.deck_id = ? AND r.next_review_date <= ?`,
    [deckId, now]
  );
  return {
    totalCards: totalResult?.count ?? 0,
    newCards: newResult?.count ?? 0,
    dueCards: dueResult?.count ?? 0,
  };
}

export async function getGlobalStats(): Promise<{
  totalCards: number;
  totalDecks: number;
  totalTemplates: number;
  newCards: number;
  dueCards: number;
  reviewsToday: number;
  avgEaseFactor: number;
  masteredCards: number;
}> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const totalCards = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards'
  );
  const totalDecks = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM decks'
  );
  const totalTemplates = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM templates'
  );
  const newCards = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reviews WHERE last_review_date IS NULL'
  );
  const dueCards = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reviews WHERE next_review_date <= ?',
    [now]
  );
  const reviewsToday = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reviews WHERE last_review_date >= ?',
    [todayISO]
  );
  const avgEase = await database.getFirstAsync<{ avg: number }>(
    'SELECT COALESCE(AVG(ease_factor), 2.5) as avg FROM reviews WHERE last_review_date IS NOT NULL'
  );
  const mastered = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reviews WHERE interval > 21'
  );

  return {
    totalCards: totalCards?.count ?? 0,
    totalDecks: totalDecks?.count ?? 0,
    totalTemplates: totalTemplates?.count ?? 0,
    newCards: newCards?.count ?? 0,
    dueCards: dueCards?.count ?? 0,
    reviewsToday: reviewsToday?.count ?? 0,
    avgEaseFactor: avgEase?.avg ?? 2.5,
    masteredCards: mastered?.count ?? 0,
  };
}

export async function getStreak(): Promise<{ streak: number; multiplier: number }> {
  const database = await getDatabase();
  const today = new Date();

  const rows = await database.getAllAsync<{ review_date: string }>(
    `SELECT DISTINCT last_review_date as review_date
     FROM reviews
     WHERE last_review_date IS NOT NULL
     ORDER BY last_review_date DESC
     LIMIT 400`
  );

  const localDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const reviewDates = new Set<string>();
  for (const row of rows) {
    reviewDates.add(localDate(new Date(row.review_date)));
  }

  let streak = 0;
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);

  for (let i = 0; i < 400; i++) {
    const dateStr = localDate(current);
    if (reviewDates.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else if (i === 0) {
      // No reviews today — check yesterday before breaking
      current.setDate(current.getDate() - 1);
      continue;
    } else {
      break;
    }
  }

  // Exponential multiplier: streak 1=1x, 3=2x, 7=3x, 14=4x, 30=5x
  let multiplier = 1;
  if (streak >= 30) multiplier = 5;
  else if (streak >= 14) multiplier = 4;
  else if (streak >= 7) multiplier = 3;
  else if (streak >= 3) multiplier = 2;
  else multiplier = 1;

  return { streak, multiplier };
}
