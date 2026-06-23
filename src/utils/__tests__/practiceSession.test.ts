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

describe('example data should survive front→back flip', () => {
  /** The rule: clear example data only when the card index changes OR session ends.
   *  A front→back flip keeps the same card — example must persist so the
   *  translation is visible on the back face. */
  function signalsClearExample(result: { currentIndex: number; isComplete: boolean }, previousIndex: number): boolean {
    return result.currentIndex !== previousIndex || result.isComplete;
  }

  test('daily mode, front→back flip: does NOT signal clear (same card)', () => {
    const s = snap({ isFlipped: false, currentIndex: 0 });
    const result = advanceOnFlip(s, 'daily');
    expect(signalsClearExample(result, s.currentIndex)).toBe(false);
    expect(result.isFlipped).toBe(true); // stayed on same card, just flipped
  });

  test('daily mode, back tap: does NOT signal clear (daily mode stays)', () => {
    const s = snap({ isFlipped: true, currentIndex: 0 });
    const result = advanceOnFlip(s, 'daily');
    expect(signalsClearExample(result, s.currentIndex)).toBe(false);
    expect(result.isFlipped).toBe(true); // waits for rating button
  });

  test('freeflow, front→back flip: does NOT signal clear (same card)', () => {
    const s = snap({ isFlipped: false, currentIndex: 0 });
    const result = advanceOnFlip(s, 'freeflow');
    expect(signalsClearExample(result, s.currentIndex)).toBe(false);
    expect(result.isFlipped).toBe(true);
  });

  test('freeflow, back tap: DOES signal clear (advances to next card)', () => {
    const s = snap({ isFlipped: true, currentIndex: 0 });
    const result = advanceOnFlip(s, 'freeflow');
    expect(signalsClearExample(result, s.currentIndex)).toBe(true);
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(1);
  });

  test('freeflow, last card back tap: DOES signal clear (session complete)', () => {
    const s = snap({ isFlipped: true, currentIndex: 1 });
    const result = advanceOnFlip(s, 'freeflow');
    expect(signalsClearExample(result, s.currentIndex)).toBe(true);
    expect(result.isComplete).toBe(true);
  });

  test('swipe-left on back: always signals clear (new card)', () => {
    const s = snap({ isFlipped: true, currentIndex: 0 });
    const result = advanceOnSwipeLeft(s, 'daily');
    expect(signalsClearExample(result, s.currentIndex)).toBe(true);
  });

  test('rate (not Again): always signals clear (new card)', () => {
    const s = snap({ isFlipped: true, currentIndex: 0 });
    const result = advanceOnRate(s, 3);
    expect(signalsClearExample(result, s.currentIndex)).toBe(true);
  });
});

describe('swipe-right peek → flip → advance flow', () => {
  test('peek (swipe-right on back) flips to front, stays on same card', () => {
    const s = snap({ isFlipped: true, currentIndex: 0, stats: { reviewed: 2 } });
    const result = advanceOnSwipeRight(s);
    expect(result.isFlipped).toBe(false);
    expect(result.currentIndex).toBe(0);
    expect(result.stats.reviewed).toBe(2);
    expect(result.isComplete).toBe(false);
  });

  test('after peek, flip to back keeps same card', () => {
    const s = snap({ isFlipped: false, currentIndex: 0 });
    const peekResult = advanceOnSwipeRight(s);
    expect(peekResult.isFlipped).toBe(false); // already front, no-op

    const flipResult = advanceOnFlip(peekResult, 'freeflow');
    expect(flipResult.isFlipped).toBe(true);
    expect(flipResult.currentIndex).toBe(0);
  });

  test('after peek then flip, swipe-left advances in daily', () => {
    const s = snap({ isFlipped: true, currentIndex: 0, stats: { reviewed: 0 } });
    const afterPeek = advanceOnSwipeRight(s); // isFlipped: false
    const afterFlip = advanceOnFlip(afterPeek, 'daily'); // isFlipped: true
    expect(afterFlip.isFlipped).toBe(true);
    expect(afterFlip.currentIndex).toBe(0);

    const advance = advanceOnSwipeLeft(afterFlip, 'daily');
    expect(advance.isFlipped).toBe(false);
    expect(advance.currentIndex).toBe(1);
    expect(advance.stats.reviewed).toBe(1);
  });

  test('after peek then flip, tap advances in freeflow', () => {
    const s = snap({ isFlipped: true, currentIndex: 0, stats: { reviewed: 0 } });
    const afterPeek = advanceOnSwipeRight(s); // isFlipped: false
    const afterFlip = advanceOnFlip(afterPeek, 'freeflow'); // isFlipped: true
    expect(afterFlip.isFlipped).toBe(true);
    expect(afterFlip.currentIndex).toBe(0);

    const advance = advanceOnFlip(afterFlip, 'freeflow');
    expect(advance.isFlipped).toBe(false);
    expect(advance.currentIndex).toBe(1);
    expect(advance.stats.reviewed).toBe(1);
  });

  test('advanceOnSwipeRight does not increment stats even with high count', () => {
    const s = snap({ isFlipped: true, stats: { reviewed: 99 } });
    const result = advanceOnSwipeRight(s);
    expect(result.stats.reviewed).toBe(99);
  });

  test('advanceOnSwipeRight on last card does not complete session', () => {
    const s = snap({ isFlipped: true, currentIndex: 1, stats: { reviewed: 0 } });
    const result = advanceOnSwipeRight(s);
    expect(result.isComplete).toBe(false);
    expect(result.currentIndex).toBe(1);
    expect(result.isFlipped).toBe(false);
  });
});
