import { parseCSV, parseJSON, ImportedCard } from '../importCards';

describe('parseCSV', () => {
  test('parses simple CSV with two columns', () => {
    const csv = 'hello,hola\nworld,mundo';
    const cards = parseCSV(csv);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({ front_text: 'hello', back_text: 'hola' });
    expect(cards[1]).toEqual({ front_text: 'world', back_text: 'mundo' });
  });

  test('handles empty lines', () => {
    const csv = 'hello,hola\n\nworld,mundo\n\n';
    const cards = parseCSV(csv);
    expect(cards).toHaveLength(2);
  });

  test('handles quoted values with commas inside', () => {
    const csv = '"hello, world","hola, mundo"';
    const cards = parseCSV(csv);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('hello, world');
    expect(cards[0].back_text).toBe('hola, mundo');
  });

  test('handles quoted values with escaped quotes', () => {
    const csv = '"say ""hello""","di ""hola"""';
    const cards = parseCSV(csv);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('say "hello"');
    expect(cards[0].back_text).toBe('di "hola"');
  });

  test('trims whitespace from values', () => {
    const csv = '  hello  ,  hola  ';
    const cards = parseCSV(csv);
    expect(cards[0].front_text).toBe('hello');
    expect(cards[0].back_text).toBe('hola');
  });

  test('returns empty array for empty input', () => {
    const cards = parseCSV('');
    expect(cards).toEqual([]);
  });

  test('handles single line', () => {
    const csv = 'cat,gato';
    const cards = parseCSV(csv);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({ front_text: 'cat', back_text: 'gato' });
  });

  test('handles multi-word values', () => {
    const csv = 'good morning,buenos días\ngood night,buenas noches';
    const cards = parseCSV(csv);
    expect(cards).toHaveLength(2);
    expect(cards[0].back_text).toBe('buenos días');
    expect(cards[1].front_text).toBe('good night');
  });

  test('handles lines with more than 2 columns (uses first two)', () => {
    const csv = 'hello,hola,extra';
    const cards = parseCSV(csv);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('hello');
    expect(cards[0].back_text).toBe('hola');
  });
});

describe('parseJSON', () => {
  test('parses array with front/back fields', () => {
    const json = JSON.stringify([
      { front: 'hello', back: 'hola' },
      { front: 'world', back: 'mundo' },
    ]);
    const cards = parseJSON(json);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({ front_text: 'hello', back_text: 'hola' });
    expect(cards[1]).toEqual({ front_text: 'world', back_text: 'mundo' });
  });

  test('parses array with front_text/back_text fields', () => {
    const json = JSON.stringify([
      { front_text: 'cat', back_text: 'gato' },
    ]);
    const cards = parseJSON(json);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({ front_text: 'cat', back_text: 'gato' });
  });

  test('parses array with question/answer fields', () => {
    const json = JSON.stringify([
      { question: 'What is water?', answer: 'Agua' },
    ]);
    const cards = parseJSON(json);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual({ front_text: 'What is water?', back_text: 'Agua' });
  });

  test('parses object with cards array', () => {
    const json = JSON.stringify({
      cards: [
        { front: 'one', back: 'uno' },
        { front: 'two', back: 'dos' },
      ],
    });
    const cards = parseJSON(json);
    expect(cards).toHaveLength(2);
  });

  test('throws on invalid format', () => {
    const json = JSON.stringify([{ invalid: 'data' }]);
    expect(() => parseJSON(json)).toThrow();
  });

  test('throws on non-array non-object', () => {
    const json = JSON.stringify('just a string');
    expect(() => parseJSON(json)).toThrow();
  });

  test('throws on invalid JSON string', () => {
    expect(() => parseJSON('not json')).toThrow();
  });

  test('handles empty array', () => {
    const json = JSON.stringify([]);
    const cards = parseJSON(json);
    expect(cards).toEqual([]);
  });

  test('generic keys work with custom template (fallback to front/back)', () => {
    const json = JSON.stringify([
      { front: 'hello', back: 'hola' },
    ]);
    const fields = [
      { id: 1, template_id: 1, name: '汉字', side: 'front' as const, position: 0 },
      { id: 2, template_id: 1, name: '翻译', side: 'back' as const, position: 0 },
    ];
    const cards = parseJSON(json, fields);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('hello');
    expect(cards[0].back_text).toBe('hola');
  });

  test('matching field names extract to field_values', () => {
    const json = JSON.stringify([
      { 汉字: '爱', 翻译: 'to love', 拼音: 'ài' },
    ]);
    const fields = [
      { id: 1, template_id: 1, name: '汉字', side: 'front' as const, position: 0 },
      { id: 2, template_id: 1, name: '拼音', side: 'back' as const, position: 0 },
      { id: 3, template_id: 1, name: '翻译', side: 'back' as const, position: 1 },
    ];
    const cards = parseJSON(json, fields);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('爱');
    expect(cards[0].back_text).toBe('ài');
    expect(cards[0].field_values).toEqual({ 汉字: '爱', 拼音: 'ài', 翻译: 'to love' });
  });

  test('side:name prefixed keys are parsed (app export format)', () => {
    const json = JSON.stringify([
      { 'front:Vocab': 'hola', 'back:Translation': 'hello' },
    ]);
    const fields = [
      { id: 1, template_id: 1, name: 'Vocab', side: 'front' as const, position: 0 },
      { id: 2, template_id: 1, name: 'Translation', side: 'back' as const, position: 0 },
    ];
    const cards = parseJSON(json, fields);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('hola');
    expect(cards[0].back_text).toBe('hello');
    expect(cards[0].field_values).toEqual({ Vocab: 'hola', Translation: 'hello' });
  });

  test('prefixed keys override raw field names when both present', () => {
    const json = JSON.stringify([
      { 'front:Vocab': 'hola', Vocab: 'adios' },
    ]);
    const fields = [
      { id: 1, template_id: 1, name: 'Vocab', side: 'front' as const, position: 0 },
    ];
    const cards = parseJSON(json, fields);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('hola');
    expect(cards[0].field_values).toEqual({ Vocab: 'hola' });
  });

  test('fallback through generic keys when field value not found', () => {
    const json = JSON.stringify([
      { front_text: 'hello', back_text: 'hola' },
    ]);
    const fields = [
      { id: 1, template_id: 1, name: 'Vocab', side: 'front' as const, position: 0 },
      { id: 2, template_id: 1, name: 'Translation', side: 'back' as const, position: 0 },
    ];
    const cards = parseJSON(json, fields);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('hello');
    expect(cards[0].back_text).toBe('hola');
  });

  test('uses first two string keys as front/back when no pattern matches', () => {
    const json = JSON.stringify([
      { 汉字: '爱', 翻译: 'to love', 拼音: 'ài' },
    ]);
    const cards = parseJSON(json);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('爱');
    expect(cards[0].back_text).toBe('to love');
  });

  test('uses first two string keys with custom template too', () => {
    const json = JSON.stringify([
      { foo: 'hello', bar: 'world' },
    ]);
    const fields = [
      { id: 1, template_id: 1, name: 'Vocab', side: 'front' as const, position: 0 },
      { id: 2, template_id: 1, name: 'Translation', side: 'back' as const, position: 0 },
    ];
    const cards = parseJSON(json, fields);
    expect(cards).toHaveLength(1);
    expect(cards[0].front_text).toBe('hello');
    expect(cards[0].back_text).toBe('world');
    expect(cards[0].field_values).toEqual({});
  });
});
