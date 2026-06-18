import { advanceOnFlip, SessionSnapshot } from '../practiceSession';
import { CardWithReview } from '../../storage/database';

function makeCard(id: number): CardWithReview {
  return {
    id, deck_id: 1, front_text: `front${id}`, back_text: `back${id}`,
    template_id: null, field_values: null, created_at: '', modified_at: '',
    ease_factor: 2.5, interval: 0, repetitions: 0,
    next_review_date: '', last_review_date: null,
  };
}

function snap(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    cards: [makeCard(1), makeCard(2)],
    currentIndex: 0,
    isFlipped: false,
    stats: { reviewed: 0 },
    ...overrides,
  };
}

describe('advanceOnFlip', () => {
  test('daily mode, front → flips to back, index unchanged', () => {
    const result = advanceOnFlip(snap({ isFlipped: false }), 'daily');
    expect(result.isFlipped).toBe(true);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  test('daily mode, back → no-op (waits for rating button)', () => {
    const result = advanceOnFlip(snap({ isFlipped: true }), 'daily');
    expect(result.isFlipped).toBe(true);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  test('freeflow, front → flips to back', () => {
    const result = advanceOnFlip(snap({ isFlipped: false }), 'freeflow');
    expect(result.isFlipped).toBe(true);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  test('freeflow, back → advances to next card, increments reviewed', () => {
    const result = advanceOnFlip(snap({ isFlipped: true }), 'freeflow');
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(1);
    expect(result.stats.reviewed).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  test('freeflow, back on last card → session complete', () => {
    const result = advanceOnFlip(
      snap({ isFlipped: true, currentIndex: 1 }),
      'freeflow'
    );
    expect(result.isComplete).toBe(true);
    expect(result.stats.reviewed).toBe(1);
    expect(result.isFlipped).toBe(false);
  });
});
