import { TemplateField } from '../models/types';

/**
 * Applies reverse-mode swap to template fields:
 * - Flips front↔back for all fields
 * - Forces any field named "Pinyin" (case-insensitive) to stay on back
 * - Sorts by position, with original front-side fields taking priority at equal positions
 */
export function applyReverseSwap(
  fields: TemplateField[],
  reverse: boolean
): TemplateField[] {
  if (!reverse) return fields;

  return fields
    .map((f) => {
      const isPinyin = f.name.toLowerCase() === 'pinyin';
      const swappedSide = f.side === 'front' ? 'back' : 'front';
      return {
        ...f,
        _originalSide: f.side,
        side: isPinyin ? ('back' as TemplateField['side']) : (swappedSide as TemplateField['side']),
      };
    })
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      if (a._originalSide === 'front' && b._originalSide !== 'front') return -1;
      if (a._originalSide !== 'front' && b._originalSide === 'front') return 1;
      return 0;
    }) as TemplateField[];
}

/**
 * Returns the swapped front/back text for cards without template fields.
 */
export function applyReverseTextSwap(
  frontText: string,
  backText: string,
  reverse: boolean
): { frontText: string; backText: string } {
  if (!reverse) return { frontText, backText };
  return { frontText: backText, backText: frontText };
}
