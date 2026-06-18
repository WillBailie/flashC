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
  const { cards, currentIndex, isFlipped, stats } = snapshot;

  if (!isFlipped) {
    return { cards, currentIndex, isFlipped: true, stats, isComplete: false };
  }

  if (mode === 'daily') {
    return { cards, currentIndex, isFlipped: true, stats, isComplete: false };
  }

  const newStats = { reviewed: stats.reviewed + 1 };
  const nextIndex = currentIndex + 1;
  if (nextIndex >= cards.length) {
    return { cards, currentIndex, isFlipped: false, stats: newStats, isComplete: true };
  }
  return { cards, currentIndex: nextIndex, isFlipped: false, stats: newStats, isComplete: false };
}

export function advanceOnSwipeLeft(
  snapshot: SessionSnapshot,
  mode: Mode
): AdvanceResult {
  const { cards, currentIndex, isFlipped, stats } = snapshot;

  if (!isFlipped) {
    return { cards, currentIndex, isFlipped, stats, isComplete: false };
  }

  const newStats = { reviewed: stats.reviewed + 1 };
  const nextIndex = currentIndex + 1;
  if (nextIndex >= cards.length) {
    return { cards, currentIndex, isFlipped: false, stats: newStats, isComplete: true };
  }
  return { cards, currentIndex: nextIndex, isFlipped: false, stats: newStats, isComplete: false };
}

export function advanceOnSwipeRight(
  snapshot: SessionSnapshot
): AdvanceResult {
  const { cards, currentIndex, isFlipped, stats } = snapshot;

  if (!isFlipped) {
    return { cards, currentIndex, isFlipped, stats, isComplete: false };
  }

  return { cards, currentIndex, isFlipped: false, stats, isComplete: false };
}

export function advanceOnRate(
  snapshot: SessionSnapshot,
  quality: Quality
): AdvanceResult {
  const { cards, currentIndex, isFlipped, stats } = snapshot;

  if (quality === 0) {
    const newCards = [...cards];
    const [card] = newCards.splice(currentIndex, 1);
    newCards.push(card);
    const wasLast = currentIndex >= cards.length - 1;
    return {
      cards: newCards,
      currentIndex: wasLast ? 0 : currentIndex,
      isFlipped: false,
      stats,
      isComplete: false,
    };
  }

  const newStats = { reviewed: stats.reviewed + 1 };
  const nextIndex = currentIndex + 1;
  if (nextIndex >= cards.length) {
    return { cards, currentIndex, isFlipped: false, stats: newStats, isComplete: true };
  }
  return { cards, currentIndex: nextIndex, isFlipped: false, stats: newStats, isComplete: false };
}
