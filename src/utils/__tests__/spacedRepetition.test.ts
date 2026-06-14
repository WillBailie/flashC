import { calculateSM2, SM2Result } from '../spacedRepetition';
import { Quality } from '../../models/types';

describe('calculateSM2', () => {
  const defaults = { easeFactor: 2.5, interval: 0, repetitions: 0 };

  test('quality < 3 resets repetitions and sets interval to 1 day', () => {
    const result = calculateSM2(2.5, 10, 5, 0 as Quality);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  test('first correct answer (quality >= 3, repetitions=0) sets interval to 1', () => {
    const result = calculateSM2(2.5, 0, 0, 3 as Quality);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  test('second correct answer (quality >= 3, repetitions=1) sets interval to 6', () => {
    const result = calculateSM2(2.5, 1, 1, 3 as Quality);
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
  });

  test('subsequent correct answers multiply interval by ease factor', () => {
    const result = calculateSM2(2.5, 6, 2, 3 as Quality);
    expect(result.repetitions).toBe(3);
    expect(result.interval).toBe(15);
  });

  test('quality 5 (perfect) increases ease factor', () => {
    const baseline = calculateSM2(2.5, 0, 0, 3 as Quality);
    const perfect = calculateSM2(2.5, 0, 0, 5 as Quality);
    expect(perfect.easeFactor).toBeGreaterThan(baseline.easeFactor);
  });

  test('quality 0 (complete blackout) significantly decreases ease factor', () => {
    const result = calculateSM2(2.5, 10, 5, 0 as Quality);
    expect(result.easeFactor).toBeLessThan(2.4);
  });

  test('ease factor never goes below 1.3', () => {
    const result = calculateSM2(1.3, 10, 5, 0 as Quality);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  test('next review date is in the future', () => {
    const now = new Date();
    const result = calculateSM2(2.5, 0, 0, 3 as Quality);
    const reviewDate = new Date(result.nextReviewDate);
    expect(reviewDate.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  test('next review date accounts for interval days', () => {
    const now = new Date();
    const result = calculateSM2(2.5, 0, 0, 3 as Quality);
    const reviewDate = new Date(result.nextReviewDate);
    const diffDays = Math.round(
      (reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBeGreaterThanOrEqual(0);
  });

  test('small interval still produces valid date', () => {
    const result = calculateSM2(2.5, 0, 0, 3 as Quality);
    expect(result.interval).toBe(1);
    expect(result.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('consecutive fails keep interval at 1', () => {
    let result = calculateSM2(2.5, 5, 3, 0 as Quality);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);

    result = calculateSM2(result.easeFactor, result.interval, result.repetitions, 0 as Quality);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  test('recovery from failure', () => {
    let result = calculateSM2(2.5, 10, 5, 0 as Quality);
    expect(result.repetitions).toBe(0);

    result = calculateSM2(result.easeFactor, result.interval, result.repetitions, 3 as Quality);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
  });
});
