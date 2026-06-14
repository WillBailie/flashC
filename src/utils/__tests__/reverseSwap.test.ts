import { applyReverseSwap, applyReverseTextSwap } from '../reverseSwap';
import { TemplateField } from '../../models/types';

function makeField(overrides: Partial<TemplateField> = {}): TemplateField {
  return {
    id: 1,
    template_id: 1,
    name: 'Test',
    side: 'front',
    position: 0,
    ...overrides,
  };
}

describe('reverseSwap', () => {
  describe('applyReverseSwap', () => {
    it('returns fields unchanged when reverse is false', () => {
      const fields = [makeField({ name: 'Chinese', side: 'front', position: 0 })];
      const result = applyReverseSwap(fields, false);
      expect(result).toEqual(fields);
    });

    it('returns empty array for empty input', () => {
      expect(applyReverseSwap([], true)).toEqual([]);
    });

    it('swaps front↔back for basic fields', () => {
      const fields = [
        makeField({ id: 1, name: 'Chinese', side: 'front', position: 0 }),
        makeField({ id: 2, name: 'Translation', side: 'back', position: 1 }),
      ];
      const result = applyReverseSwap(fields, true);
      expect(result[0].side).toBe('back');
      expect(result[1].side).toBe('front');
    });

    it('forces Pinyin field to back side regardless of swap', () => {
      const fields = [
        makeField({ id: 1, name: 'Pinyin', side: 'back', position: 0 }),
        makeField({ id: 2, name: 'Chinese', side: 'front', position: 1 }),
        makeField({ id: 3, name: 'Translation', side: 'back', position: 2 }),
      ];
      const result = applyReverseSwap(fields, true);
      const pinyin = result.find((f) => f.name === 'Pinyin')!;
      expect(pinyin.side).toBe('back');
    });

    it('forces pinyin (case-insensitive) to back', () => {
      const fields = [
        makeField({ id: 1, name: 'PINYIN', side: 'front', position: 0 }),
        makeField({ id: 2, name: 'English', side: 'back', position: 1 }),
      ];
      const result = applyReverseSwap(fields, true);
      const pinyin = result.find((f) => f.name === 'PINYIN')!;
      expect(pinyin.side).toBe('back');
    });

    it('sorts by position ascending', () => {
      const fields = [
        makeField({ id: 1, name: 'B', side: 'front', position: 2 }),
        makeField({ id: 2, name: 'A', side: 'front', position: 0 }),
        makeField({ id: 3, name: 'C', side: 'front', position: 1 }),
      ];
      const result = applyReverseSwap(fields, true);
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('C');
      expect(result[2].name).toBe('B');
    });

    it('prioritizes original-front fields at equal positions', () => {
      const fields = [
        makeField({ id: 1, name: 'Pinyin', side: 'back', position: 0 }),
        makeField({ id: 2, name: 'Chinese', side: 'front', position: 0 }),
        makeField({ id: 3, name: 'Translation', side: 'back', position: 1 }),
      ];
      const result = applyReverseSwap(fields, true);
      const backFields = result.filter((f) => f.side === 'back');
      expect(backFields[0].name).toBe('Chinese');
      expect(backFields[1].name).toBe('Pinyin');
    });

    it('keeps non-pinyin fields swapped normally', () => {
      const fields = [
        makeField({ id: 1, name: 'Word', side: 'front', position: 0 }),
        makeField({ id: 2, name: 'Definition', side: 'back', position: 1 }),
      ];
      const result = applyReverseSwap(fields, true);
      expect(result[0].side).toBe('back');
      expect(result[1].side).toBe('front');
    });
  });

  describe('applyReverseTextSwap', () => {
    it('returns original when reverse is false', () => {
      const result = applyReverseTextSwap('hello', 'world', false);
      expect(result).toEqual({ frontText: 'hello', backText: 'world' });
    });

    it('swaps when reverse is true', () => {
      const result = applyReverseTextSwap('你好', 'Hello', true);
      expect(result).toEqual({ frontText: 'Hello', backText: '你好' });
    });
  });
});
