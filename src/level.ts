import { CardType, LevelConfig } from './types';
import { RNG, clamp, shuffleInPlace } from './utils';

const LOGICAL_WIDTH = 750;
const CARD_WIDTH = 96;
const CARD_HEIGHT = 120;

export function generateLevel(progressWins: number, baseSeed: number, cardTypes: CardType[]): LevelConfig {
  const difficultyBump = Math.min(4, Math.floor(progressWins / 2));
  const layerCount = clamp(4 + difficultyBump, 4, 6);
  const rng = new RNG(baseSeed + progressWins * 97 + layerCount * 31);
  const cards: LevelConfig['cards'] = [];

  for (let layer = 0; layer < layerCount; layer++) {
    const density = clamp(0.72 - layer * 0.08 + progressWins * 0.01, 0.35, 0.8);
    const rows = clamp(4 + Math.max(0, layerCount - layer - 2), 3, 7);
    const cols = clamp(4 + Math.max(0, Math.floor((layerCount - layer) / 2)), 3, 8);
    const spacingX = CARD_WIDTH * 0.85;
    const spacingY = CARD_HEIGHT * 0.75;
    const totalWidth = spacingX * (cols - 1) + CARD_WIDTH;
    const baseX = (LOGICAL_WIDTH - totalWidth) / 2 + rng.nextInt(-10, 10);
    const baseY = 180 + layer * 45;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (rng.next() > density) {
          continue;
        }
        const x = baseX + col * spacingX + rng.nextInt(-12, 13);
        const y = baseY + row * spacingY + rng.nextInt(-8, 9);
        cards.push({
          layer,
          x,
          y,
          typeId: -1
        });
      }
    }
  }

  if (cards.length < 9) {
    while (cards.length < 9) {
      cards.push({ layer: 0, x: 300 + rng.nextInt(-30, 30), y: 400 + rng.nextInt(-30, 30), typeId: -1 });
    }
  }

  const remainder = cards.length % 3;
  if (remainder !== 0) {
    cards.splice(cards.length - remainder, remainder);
  }

  const typeCount = clamp(Math.min(cardTypes.length, Math.floor(cards.length / 3)), 3, cardTypes.length);
  const pool: number[] = [];
  let typeCursor = 0;
  while (pool.length < cards.length) {
    const typeId = cardTypes[typeCursor % typeCount].id;
    pool.push(typeId, typeId, typeId);
    typeCursor++;
  }
  pool.length = cards.length;
  shuffleInPlace(pool, rng);

  for (let i = 0; i < cards.length; i++) {
    cards[i].typeId = pool[i];
  }

  return {
    cards,
    layerCount,
    slotSize: 7,
    seedUsed: baseSeed
  };
}
