/**
 * Shared type definitions for the mini game.
 */

export type GamePhase = 'LOADING' | 'HOME' | 'IN_GAME' | 'PAUSED' | 'WIN' | 'FAIL';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardType {
  id: number;
  name: string;
  label: string;
  color: string;
}

export interface CardInstance {
  id: number;
  typeId: number;
  layer: number;
  position: Vec2;
  size: Vec2;
  rotation: number;
  removed: boolean;
  visible: boolean;
  scale: number;
  alpha: number;
  highlight: number;
}

export interface BoardLayoutCard {
  layer: number;
  x: number;
  y: number;
  typeId: number;
}

export interface LevelConfig {
  cards: BoardLayoutCard[];
  layerCount: number;
  slotSize: number;
  seedUsed: number;
}

export interface SlotEntry {
  id: number;
  typeId: number;
  label: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
}

export interface SlotClearEffect {
  id: number;
  typeId: number;
  label: string;
  x: number;
  y: number;
  timer: number;
  duration: number;
}

export interface SlotResult {
  accepted: boolean;
  overflow: boolean;
  matched: boolean;
  clearedTypeId?: number;
  removedIds?: number[];
}

export interface GameStats {
  score: number;
  bestScore: number;
  combo: number;
  timeElapsed: number;
  totalWins: number;
}

export interface TouchPoint {
  x: number;
  y: number;
}

export interface InputListener {
  onTap?(point: TouchPoint): void;
}

export interface RenderableCard {
  card: CardInstance;
  texture?: any;
}

export interface DifficultyState {
  seed: number;
  wins: number;
}

export interface StorageSnapshot {
  bestScore: number;
  winCount: number;
  seed: number;
}

declare const wx: any;
