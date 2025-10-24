import { CardInstance, CardType, SlotClearEffect, SlotEntry, UIButton } from './types';

interface ScreenPoint {
  x: number;
  y: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private logicalWidth: number;
  private logicalHeight: number;
  private pixelRatio = 1;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private viewWidth = 0;
  private viewHeight = 0;
  private backgroundGradient: CanvasGradient | null = null;
  private cardColors: Map<number, string> = new Map();
  private cardTypeMap: Map<number, CardType> = new Map();
  private ready = false;

  constructor(private readonly canvas: any, logicalWidth: number, logicalHeight: number) {
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to acquire 2d context');
    }
    this.ctx = ctx;
    this.updateTransform();
    if (typeof wx !== 'undefined' && wx?.onWindowResize) {
      wx.onWindowResize(() => this.updateTransform());
    } else {
      const globalWindow = (globalThis as any);
      if (globalWindow?.addEventListener) {
        globalWindow.addEventListener('resize', () => this.updateTransform());
      }
    }
  }

  async preload(cardTypes: CardType[]): Promise<void> {
    this.cardTypeMap.clear();
    this.cardColors.clear();
    cardTypes.forEach((type) => {
      this.cardTypeMap.set(type.id, type);
      this.cardColors.set(type.id, type.color);
    });
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  beginFrame(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    if (!this.backgroundGradient) {
      this.backgroundGradient = ctx.createLinearGradient(0, 0, 0, this.viewHeight);
      this.backgroundGradient.addColorStop(0, '#182848');
      this.backgroundGradient.addColorStop(1, '#4b6cb7');
    }
    ctx.fillStyle = this.backgroundGradient;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
  }

  endFrame(): void {
    this.ctx.restore();
  }

  drawCard(card: CardInstance): void {
    const ctx = this.ctx;
    const type = this.cardTypeMap.get(card.typeId);
    const fillColor = type?.color ?? '#cccccc';
    const cx = card.position.x + (card.size.x / 2);
    const cy = card.position.y + (card.size.y / 2);
    ctx.save();
    ctx.globalAlpha = card.alpha;
    ctx.translate(cx, cy);
    ctx.scale(card.scale, card.scale);
    ctx.rotate((card.rotation * Math.PI) / 180);
    const w = card.size.x;
    const h = card.size.y;
    ctx.fillStyle = '#ffffff';
    const radius = 12;
    roundRect(ctx, -w / 2, -h / 2, w, h, radius);
    ctx.fill();
    ctx.lineWidth = card.highlight > 0 ? 4 : 2;
    ctx.strokeStyle = card.highlight > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.15)';
    ctx.stroke();
    roundRect(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, radius - 4);
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (type) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(type.label, 0, 12);
    }
    ctx.restore();
  }

  drawSlot(entries: SlotEntry[], effects: SlotClearEffect[], width: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 4;
    const height = 140;
    const startX = (this.logicalWidth - width) / 2;
    roundRect(ctx, startX, this.logicalHeight - height - 40, width, height, 20);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    for (const entry of entries) {
      ctx.save();
      ctx.translate(entry.x, entry.y);
      ctx.scale(entry.scale, entry.scale);
      ctx.globalAlpha = 1;
      this.drawSlotChip(entry.typeId, entry.label);
      ctx.restore();
    }

    for (const effect of effects) {
      const alpha = 1 - effect.timer / effect.duration;
      if (alpha <= 0) {
        continue;
      }
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.scale(1 + effect.timer / effect.duration, 1 + effect.timer / effect.duration);
      ctx.globalAlpha = alpha;
      this.drawSlotChip(effect.typeId, effect.label);
      ctx.restore();
    }
  }

  private drawSlotChip(typeId: number, label: string): void {
    const ctx = this.ctx;
    const type = this.cardTypeMap.get(typeId);
    const color = type?.color ?? '#cccccc';
    const radius = 12;
    const size = { w: 92, h: 110 };
    roundRect(ctx, -size.w / 2, -size.h / 2, size.w, size.h, radius);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRect(ctx, -size.w / 2 + 8, -size.h / 2 + 8, size.w - 16, size.h - 16, radius - 4);
    ctx.fillStyle = color;
    ctx.fill();
    const text = label || type?.label || '';
    if (text) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 10);
    }
  }

  drawText(text: string, x: number, y: number, options: { size?: number; color?: string; align?: CanvasTextAlign } = {}): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = options.color || '#ffffff';
    ctx.font = `bold ${options.size || 32}px sans-serif`;
    ctx.textAlign = options.align || 'left';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawButton(button: UIButton, highlighted: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = button.enabled ? 1 : 0.6;
    ctx.translate(button.rect.x, button.rect.y);
    const width = button.rect.width;
    const height = button.rect.height;
    const radius = 16;
    roundRect(ctx, 0, 0, width, height, radius);
    ctx.fillStyle = highlighted ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0a2143';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(button.label, width / 2, height / 2);
    ctx.restore();
  }

  screenToWorld(x: number, y: number): ScreenPoint {
    const worldX = (x - this.offsetX) / this.scale;
    const worldY = (y - this.offsetY) / this.scale;
    return { x: worldX, y: worldY };
  }

  private updateTransform(): void {
    let width = 750;
    let height = 1334;
    let pixelRatio = 1;
    if (typeof wx !== 'undefined' && wx?.getSystemInfoSync) {
      const info = wx.getSystemInfoSync();
      width = info.windowWidth;
      height = info.windowHeight;
      pixelRatio = info.pixelRatio || 1;
    } else {
      const globalWindow = (globalThis as any);
      if (globalWindow?.innerWidth) {
        width = globalWindow.innerWidth;
        height = globalWindow.innerHeight;
        pixelRatio = globalWindow.devicePixelRatio || 1;
      }
    }
    this.pixelRatio = pixelRatio;
    this.viewWidth = width;
    this.viewHeight = height;
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    const scale = Math.min(width / this.logicalWidth, height / this.logicalHeight);
    this.scale = scale;
    this.offsetX = (width - this.logicalWidth * scale) / 2;
    this.offsetY = (height - this.logicalHeight * scale) / 2;
    this.backgroundGradient = null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
