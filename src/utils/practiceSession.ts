import { CardWithReview } from '../storage/database';
import { Quality } from '../models/types';

export type Mode = 'daily' | 'freeflow';

export interface SessionSnapshot {
  cards: CardWithReview[];
  currentIndex: number;
  isFlipped: boolean;
  stats: { reviewed: number };
}

export interface AdvanceResult {
  cards: CardWithReview[];
  currentIndex: number;
  isFlipped: boolean;
  isComplete: boolean;
  stats: { reviewed: number };
}

export function advanceOnFlip(
  snapshot: SessionSnapshot,
  mode: Mode
): AdvanceResult {
  return { ...snapshot, isComplete: false };
}

export function advanceOnSwipeLeft(
  snapshot: SessionSnapshot,
  mode: Mode
): AdvanceResult {
  return { ...snapshot, isComplete: false };
}

export function advanceOnSwipeRight(
  snapshot: SessionSnapshot
): AdvanceResult {
  return { ...snapshot, isComplete: false };
}

export function advanceOnRate(
  snapshot: SessionSnapshot,
  quality: Quality
): AdvanceResult {
  return { ...snapshot, isComplete: false };
}
