import { parseFieldValues } from '../cards';

describe('parseFieldValues', () => {
  test('parses valid JSON field_values', () => {
    const result = parseFieldValues('{"Front":"hello","Back":"hola"}');
    expect(result).toEqual({ Front: 'hello', Back: 'hola' });
  });

  test('returns empty object for null', () => {
    expect(parseFieldValues(null)).toEqual({});
  });

  test('returns empty object for malformed JSON', () => {
    expect(parseFieldValues('not json')).toEqual({});
  });

  test('returns empty object for empty string', () => {
    expect(parseFieldValues('')).toEqual({});
  });

  test('handles nested JSON objects', () => {
    const result = parseFieldValues('{"nested":{"key":"value"}}');
    expect(result).toEqual({ nested: { key: 'value' } });
  });
});
