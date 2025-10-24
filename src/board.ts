import { CardInstance, LevelConfig, Vec2 } from './types';
import { clamp, easeOutQuad } from './utils';

const CARD_WIDTH = 96;
const CARD_HEIGHT = 120;

export class Board {
  private cards: CardInstance[] = [];
  private nextId = 1;
  private highlightCardId: number | null = null;

  constructor() {}

  setup(level: LevelConfig): void {
    this.nextId = 1;
    this.cards = level.cards.map((layout) => this.createCard(layout.x, layout.y, layout.layer, layout.typeId));
    this.cards.sort((a, b) => {
      if (a.layer === b.layer) {
        return a.id - b.id;
      }
      return a.layer - b.layer;
    });
    this.updateVisibility();
  }

  private createCard(x: number, y: number, layer: number, typeId: number): CardInstance {
    const card: CardInstance = {
      id: this.nextId++,
      typeId,
      layer,
      position: { x, y },
      size: { x: CARD_WIDTH, y: CARD_HEIGHT },
      rotation: 0,
      removed: false,
      visible: true,
      scale: 1,
      alpha: 1,
      highlight: 0
    };
    return card;
  }

  getCards(): CardInstance[] {
    return this.cards;
  }

  remainingCount(): number {
    return this.cards.filter((card) => !card.removed).length;
  }

  setHighlight(cardId: number | null): void {
    this.highlightCardId = cardId;
    this.cards.forEach((card) => {
      card.highlight = card.id === cardId ? 1 : 0;
    });
  }

  hitTest(point: Vec2): CardInstance | null {
    const sorted = [...this.cards].sort((a, b) => {
      if (a.layer === b.layer) {
        return b.id - a.id;
      }
      return b.layer - a.layer;
    });
    for (const card of sorted) {
      if (card.removed || !card.visible) {
        continue;
      }
      if (isPointInside(point, card.position, card.size)) {
        return card;
      }
    }
    return null;
  }

  selectCard(card: CardInstance): CardInstance | null {
    const stored = this.cards.find((item) => item.id === card.id);
    if (!stored || stored.removed || !stored.visible) {
      return null;
    }
    stored.removed = true;
    stored.visible = false;
    stored.alpha = 0;
    return {
      ...stored,
      removed: true,
      visible: false
    };
  }

  update(dt: number): void {
    const speed = clamp(dt / 120, 0, 1);
    for (const card of this.cards) {
      if (card.removed) {
        continue;
      }
      if (card.highlight > 0) {
        card.scale = 1 + 0.05 * easeOutQuad(card.highlight);
        card.highlight = clamp(card.highlight - speed * 0.5, 0, 1);
      } else {
        card.scale = 1;
      }
    }
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const sorted = [...this.cards].sort((a, b) => {
      if (a.layer === b.layer) {
        return a.id - b.id;
      }
      return a.layer - b.layer;
    });
    for (let i = 0; i < sorted.length; i++) {
      const card = sorted[i];
      if (card.removed) {
        card.visible = false;
        continue;
      }
      let visible = true;
      const centerX = card.position.x + card.size.x / 2;
      const centerY = card.position.y + card.size.y / 2;
      for (let j = i + 1; j < sorted.length; j++) {
        const blocker = sorted[j];
        if (blocker.removed) {
          continue;
        }
        if (blocker.layer < card.layer) {
          continue;
        }
        if (blocker.layer === card.layer && blocker.id === card.id) {
          continue;
        }
        if (isPointInside({ x: centerX, y: centerY }, blocker.position, blocker.size)) {
          visible = false;
          break;
        }
      }
      card.visible = visible;
    }
  }
}

function isPointInside(point: Vec2, position: Vec2, size: Vec2): boolean {
  return (
    point.x >= position.x &&
    point.x <= position.x + size.x &&
    point.y >= position.y &&
    point.y <= position.y + size.y
  );
}
