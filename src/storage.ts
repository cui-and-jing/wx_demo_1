import { DifficultyState, StorageSnapshot } from './types';

const BEST_SCORE_KEY = 'ygoy_best_score';
const WIN_COUNT_KEY = 'ygoy_win_count';
const DIFFICULTY_SEED_KEY = 'ygoy_diff_seed';

function safeGet(key: string, defaultValue: number): number {
  if (typeof wx === 'undefined' || !wx?.getStorageSync) {
    return defaultValue;
  }
  try {
    const value = wx.getStorageSync(key);
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    }
  } catch (err) {
    console.warn('storage read failed', err);
  }
  return defaultValue;
}

function safeSet(key: string, value: number): void {
  if (typeof wx === 'undefined' || !wx?.setStorageSync) {
    return;
  }
  try {
    wx.setStorageSync(key, value);
  } catch (err) {
    console.warn('storage write failed', err);
  }
}

export function loadSnapshot(): StorageSnapshot {
  return {
    bestScore: safeGet(BEST_SCORE_KEY, 0),
    winCount: safeGet(WIN_COUNT_KEY, 0),
    seed: safeGet(DIFFICULTY_SEED_KEY, Math.floor(Math.random() * 1000000))
  };
}

export function saveBestScore(score: number): void {
  safeSet(BEST_SCORE_KEY, score);
}

export function saveWinCount(winCount: number): void {
  safeSet(WIN_COUNT_KEY, winCount);
}

export function saveDifficultySeed(seed: number): void {
  safeSet(DIFFICULTY_SEED_KEY, seed);
}

export function getDifficultyState(): DifficultyState {
  const snapshot = loadSnapshot();
  return {
    seed: snapshot.seed,
    wins: snapshot.winCount
  };
}
