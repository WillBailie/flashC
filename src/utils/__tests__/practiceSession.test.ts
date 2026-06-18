import { advanceOnFlip, advanceOnSwipeLeft, advanceOnSwipeRight, advanceOnRate, SessionSnapshot } from '../practiceSession';
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

describe('advanceOnSwipeLeft', () => {
  test('daily, back → advances, isFlipped false, stats incremented', () => {
    const result = advanceOnSwipeLeft(snap({ isFlipped: true }), 'daily');
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(1);
    expect(result.stats.reviewed).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  test('freeflow, back → advances, stats incremented', () => {
    const result = advanceOnSwipeLeft(snap({ isFlipped: true }), 'freeflow');
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(1);
    expect(result.stats.reviewed).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  test('front → no-op', () => {
    const result = advanceOnSwipeLeft(snap({ isFlipped: false }), 'daily');
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  test('last card back → complete', () => {
    const result = advanceOnSwipeLeft(
      snap({ isFlipped: true, currentIndex: 1 }),
      'daily'
    );
    expect(result.isComplete).toBe(true);
    expect(result.stats.reviewed).toBe(1);
  });
});

describe('advanceOnSwipeRight', () => {
  test('back → flips to front, index unchanged, stats unchanged', () => {
    const result = advanceOnSwipeRight(snap({ isFlipped: true }));
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  test('front → no-op', () => {
    const result = advanceOnSwipeRight(snap({ isFlipped: false }));
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
  });

  test('stats never increment', () => {
    const result = advanceOnSwipeRight(snap({ isFlipped: true, stats: { reviewed: 5 } }));
    expect(result.stats.reviewed).toBe(5);
  });
});

describe('advanceOnRate', () => {
  test('quality>0: advances to next card, stats incremented', () => {
    const result = advanceOnRate(snap({ isFlipped: true }), 3);
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(1);
    expect(result.stats.reviewed).toBe(1);
    expect(result.isComplete).toBe(false);
  });

  test('quality=0 (Again): card re-spliced to end, index stays, stats NOT incremented', () => {
    const result = advanceOnRate(snap({ isFlipped: true }), 0);
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.cards.length).toBe(2);
    expect(result.cards[1].id).toBe(1); // card was moved to end
  });

  test('quality=0 on last card: re-splices, index wraps to 0, NOT complete', () => {
    const result = advanceOnRate(
      snap({ isFlipped: true, currentIndex: 1 }),
      0
    );
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.cards[1].id).toBe(2); // last card moved to end
  });

  test('quality>0 on last card: complete', () => {
    const result = advanceOnRate(
      snap({ isFlipped: true, currentIndex: 1 }),
      3
    );
    expect(result.isComplete).toBe(true);
    expect(result.stats.reviewed).toBe(1);
  });

  test('quality=0 with single card: stays at index 0, not complete', () => {
    const singleSnap = snap({ cards: [makeCard(1)], currentIndex: 0, isFlipped: true });
    const result = advanceOnRate(singleSnap, 0);
    expect(result.currentIndex).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.cards.length).toBe(1);
  });

  test('quality=0 re-splice preserves other cards order', () => {
    const s = snap({ cards: [makeCard(1), makeCard(2), makeCard(3)], currentIndex: 0, isFlipped: true });
    const result = advanceOnRate(s, 0);
    expect(result.cards.map(c => c.id)).toEqual([2, 3, 1]);
  });
});
