import { exportDeckToCSV } from '../exportCards';
import * as database from '../../storage/database';

describe('exportDeckToCSV', () => {
  test('basic export with front/back fields (Basic template)', async () => {
    const deck = await database.createDeck('Export CSV', '');
    await database.createCard(deck.id, 'hello', 'hola', undefined, {
      Front: 'hello', Back: 'hola',
    });
    const csv = await exportDeckToCSV(deck.id);
    expect(csv).toBe('back:Back,front:Front\nhola,hello');
    await database.deleteDeck(deck.id);
  });

  test('empty deck returns empty string', async () => {
    const deck = await database.createDeck('Empty Export', '');
    const csv = await exportDeckToCSV(deck.id);
    expect(csv).toBe('');
    await database.deleteDeck(deck.id);
  });

  test('multiple cards return correct rows', async () => {
    const deck = await database.createDeck('Multi Export', '');
    await database.createCard(deck.id, 'one', 'uno', undefined, {
      Front: 'one', Back: 'uno',
    });
    await database.createCard(deck.id, 'two', 'dos', undefined, {
      Front: 'two', Back: 'dos',
    });
    const csv = await exportDeckToCSV(deck.id);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('back:Back,front:Front');
    expect(lines[1]).toBe('uno,one');
    expect(lines[2]).toBe('dos,two');
    await database.deleteDeck(deck.id);
  });

  test('fields containing commas are quoted', async () => {
    const deck = await database.createDeck('Comma Export', '');
    await database.createCard(deck.id, 'hello, world', 'hola', undefined, {
      Front: 'hello, world', Back: 'hola, mundo',
    });
    const csv = await exportDeckToCSV(deck.id);
    expect(csv).toContain('"hola, mundo","hello, world"');
    await database.deleteDeck(deck.id);
  });

  test('fields containing double quotes are escaped', async () => {
    const deck = await database.createDeck('Quote Export', '');
    await database.createCard(deck.id, 'say "hi"', 'di "hola"', undefined, {
      Front: 'say "hi"', Back: 'di "hola"',
    });
    const csv = await exportDeckToCSV(deck.id);
    expect(csv).toContain('"di ""hola""","say ""hi"""');
    await database.deleteDeck(deck.id);
  });

  test('template-aware columns with side:name prefix', async () => {
    const deck = await database.createDeck('Template CSV', '');
    const template = await database.createTemplate('Chinese');
    await database.addTemplateField(template.id, 'Hanzi', 'front', 0);
    await database.addTemplateField(template.id, 'Pinyin', 'back', 0);
    await database.createCard(deck.id, 'nihao', 'hello', template.id, {
      Hanzi: '你好', Pinyin: 'nǐ hǎo',
    });
    const csv = await exportDeckToCSV(deck.id);
    // Fields sorted alphabetically: back:Pinyin before front:Hanzi
    expect(csv).toBe('back:Pinyin,front:Hanzi\nnǐ hǎo,你好');
    await database.deleteDeck(deck.id);
  });

  test('template fields with no field_values produce empty cells', async () => {
    const deck = await database.createDeck('No Values', '');
    await database.createCard(deck.id, 'front text only', 'back text only');
    const csv = await exportDeckToCSV(deck.id);
    // All cards get Basic template (Front/Back fields) but no field_values
    expect(csv).toBe('back:Back,front:Front\n,');
    await database.deleteDeck(deck.id);
  });
});
