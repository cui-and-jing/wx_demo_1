import { createInterstitialAd, createRewardedVideoAd } from './ads';
import { Board } from './board';
import { InputManager } from './input';
import { Renderer } from './renderer';
import { SlotManager } from './slot';
import { UIManager } from './ui';
import { buildShareContent, copyShareText } from './share';
import { track } from './analytics';
import { generateLevel } from './level';
import { getDifficultyState, loadSnapshot, saveBestScore, saveDifficultySeed, saveWinCount } from './storage';
import { CardInstance, CardType, GamePhase, LevelConfig, TouchPoint } from './types';
import { formatTime, now } from './utils';

const LOGICAL_WIDTH = 750;
const LOGICAL_HEIGHT = 1334;
const COMBO_WINDOW = 1200; // ms

const CARD_TYPES: CardType[] = [
  { id: 1, name: 'sheep', label: '羊', color: '#ffca28' },
  { id: 2, name: 'leaf', label: '叶', color: '#66bb6a' },
  { id: 3, name: 'tree', label: '木', color: '#8d6e63' },
  { id: 4, name: 'sun', label: '光', color: '#ff8f00' },
  { id: 5, name: 'gem', label: '晶', color: '#26a69a' },
  { id: 6, name: 'fire', label: '焰', color: '#ef5350' }
];

interface ButtonConfig {
  id: string;
  label: string;
  rect: { x: number; y: number; width: number; height: number };
}

const BUTTONS: ButtonConfig[] = [
  { id: 'start', label: '开始挑战', rect: { x: 225, y: 860, width: 300, height: 96 } },
  { id: 'restart', label: '再次挑战', rect: { x: 225, y: 860, width: 300, height: 96 } },
  { id: 'share', label: '复制文案', rect: { x: 225, y: 980, width: 300, height: 96 } },
  { id: 'pause', label: '暂停', rect: { x: LOGICAL_WIDTH - 180, y: 60, width: 120, height: 64 } },
  { id: 'resume', label: '继续', rect: { x: 225, y: 780, width: 300, height: 96 } },
  { id: 'home', label: '返回首页', rect: { x: 225, y: 1080, width: 300, height: 96 } }
];

export class Game {
  private phase: GamePhase = 'LOADING';
  private readonly board: Board;
  private readonly slot: SlotManager;
  private readonly ui: UIManager = new UIManager();
  private readonly cardTypeMap: Map<number, CardType> = new Map();
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly interstitial = createInterstitialAd('demo-interstitial');
  private readonly rewarded = createRewardedVideoAd('demo-rewarded');
  private levelConfig: LevelConfig | null = null;
  private lastTimestamp = 0;
  private score = 0;
  private combo = 0;
  private lastMatchTime = 0;
  private bestScore = 0;
  private wins = 0;
  private startTime = 0;
  private pausedAt = 0;
  private pausedDuration = 0;
  private finalElapsed = 0;

  constructor(renderer: Renderer, input: InputManager) {
    this.renderer = renderer;
    this.input = input;
    CARD_TYPES.forEach((type) => this.cardTypeMap.set(type.id, type));
    this.board = new Board();
    this.slot = new SlotManager(7);
    this.slot.setLayout(LOGICAL_WIDTH / 2 - ((7 - 1) * 98) / 2, LOGICAL_HEIGHT - 150, 98);

    const snapshot = loadSnapshot();
    this.bestScore = snapshot.bestScore;
    this.wins = snapshot.winCount;

    BUTTONS.forEach((config) => {
      this.ui.registerButton({
        id: config.id,
        label: config.label,
        rect: config.rect,
        visible: false,
        enabled: true
      });
    });

    this.input.setConverter((x, y) => this.renderer.screenToWorld(x, y));
    this.input.addListener({
      onTap: (point) => this.handleTap(point)
    });

    Promise.resolve(this.rewarded?.load?.()).catch((err) => console.warn('rewarded load failed', err));

    this.renderer
      .preload(CARD_TYPES)
      .then(() => {
        this.phase = 'HOME';
      })
      .catch((err) => {
        console.error('Texture preload failed', err);
        this.phase = 'HOME';
      });
  }

  update(timestamp: number): void {
    const dt = this.lastTimestamp ? timestamp - this.lastTimestamp : 16;
    this.lastTimestamp = timestamp;

    if (this.phase === 'IN_GAME') {
      this.board.update(dt);
      this.slot.update(dt);
      const currentTime = now();
      const elapsed = currentTime - this.startTime - this.pausedDuration;
      this.updateUI();
      if (this.board.remainingCount() === 0 && this.slot.getEntries().length === 0) {
        this.finishWin(elapsed);
      }
    } else if (this.phase === 'PAUSED') {
      this.slot.update(dt);
    } else {
      this.board.update(dt);
      this.slot.update(dt);
    }
  }

  render(): void {
    this.updateUI();
    this.renderer.beginFrame();

    if (this.phase === 'HOME') {
      this.renderHome();
    } else {
      this.renderGameScene();
    }

    const buttons = this.ui.visibleButtons();
    buttons.forEach((btn) => {
      this.renderer.drawButton(btn, false);
    });

    this.renderer.endFrame();
  }

  private renderGameScene(): void {
    this.renderer.drawText(`得分 ${this.score}`, 40, 70, { size: 48 });
    this.renderer.drawText(`最佳 ${this.bestScore}`, 40, 120, { size: 28, color: 'rgba(255,255,255,0.8)' });
    const elapsed = this.getElapsedTime();
    this.renderer.drawText(`用时 ${formatTime(elapsed)}`, LOGICAL_WIDTH - 40, 70, { size: 32, align: 'right' });
    if (this.combo > 1 && this.phase === 'IN_GAME') {
      this.renderer.drawText(`连击 x${this.combo}`, LOGICAL_WIDTH - 40, 120, { size: 32, align: 'right', color: '#ffe082' });
    }

    const cards = this.board.getCards().filter((card) => !card.removed);
    cards.sort((a, b) => {
      if (a.layer === b.layer) {
        return a.id - b.id;
      }
      return a.layer - b.layer;
    });
    cards.forEach((card) => this.renderer.drawCard(card));

    const slotEntries = this.slot.getEntries();
    const slotEffects = this.slot.getEffects();
    const slotCapacity = this.levelConfig?.slotSize ?? 7;
    const slotWidth = (slotCapacity - 1) * 98 + 160;
    this.renderer.drawSlot(slotEntries, slotEffects, Math.max(640, slotWidth));

    if (this.phase === 'PAUSED') {
      this.renderer.drawText('暂停中', LOGICAL_WIDTH / 2, 520, { size: 56, align: 'center' });
    }
    if (this.phase === 'WIN') {
      this.renderResultPanel(true);
    } else if (this.phase === 'FAIL') {
      this.renderResultPanel(false);
    }
  }

  private renderResultPanel(win: boolean): void {
    const title = win ? '通关成功！' : '挑战失败';
    this.renderer.drawText(title, LOGICAL_WIDTH / 2, 520, { size: 60, align: 'center' });
    this.renderer.drawText(`本局得分 ${this.score}`, LOGICAL_WIDTH / 2, 580, { size: 36, align: 'center' });
    this.renderer.drawText(`用时 ${formatTime(this.getElapsedTime())}`, LOGICAL_WIDTH / 2, 630, { size: 32, align: 'center' });
  }

  private renderHome(): void {
    this.renderer.drawText('羊了个羊·叠层挑战', LOGICAL_WIDTH / 2, 320, { size: 60, align: 'center' });
    this.renderer.drawText(`最佳得分 ${this.bestScore}`, LOGICAL_WIDTH / 2, 400, { size: 32, align: 'center' });
    this.renderer.drawText(`累计胜场 ${this.wins}`, LOGICAL_WIDTH / 2, 450, { size: 28, align: 'center' });
    this.renderer.drawText('规则简介：点选未被覆盖的牌，底部槽位收集三张即可消除。', LOGICAL_WIDTH / 2, 560, {
      size: 26,
      align: 'center'
    });
    this.renderer.drawText('槽位最多 7 格，填满即失败。', LOGICAL_WIDTH / 2, 600, { size: 26, align: 'center' });
  }

  private handleTap(point: TouchPoint): void {
    const button = this.ui.hitTest(point);
    if (button) {
      this.handleButton(button.id);
      return;
    }
    if (this.phase !== 'IN_GAME') {
      return;
    }
    const card = this.board.hitTest(point);
    if (card) {
      this.onCardSelected(card);
    }
  }

  private handleButton(id: string): void {
    switch (id) {
      case 'start':
        this.startGame();
        break;
      case 'restart':
        track('restart', { from: this.phase });
        this.startGame();
        break;
      case 'pause':
        this.pauseGame();
        break;
      case 'resume':
        this.resumeGame();
        break;
      case 'share':
        this.copyShare();
        break;
      case 'home':
        this.phase = 'HOME';
        this.updateUI();
        break;
    }
  }

  private startGame(): void {
    const difficulty = getDifficultyState();
    const seed = difficulty.seed + Math.floor(Math.random() * 1000);
    this.levelConfig = generateLevel(difficulty.wins, seed, CARD_TYPES);
    saveDifficultySeed(seed);
    this.board.setup(this.levelConfig);
    this.slot.reset();
    const slotSpacing = 98;
    const slotBase = LOGICAL_WIDTH / 2 - ((this.levelConfig.slotSize - 1) * slotSpacing) / 2;
    this.slot.setLayout(slotBase, LOGICAL_HEIGHT - 150, slotSpacing);
    this.score = 0;
    this.combo = 0;
    this.lastMatchTime = 0;
    this.pausedDuration = 0;
    this.startTime = now();
    this.finalElapsed = 0;
    this.phase = 'IN_GAME';
    track('game_start', { seed, wins: difficulty.wins });
    this.updateUI();
  }

  private pauseGame(): void {
    if (this.phase !== 'IN_GAME') {
      return;
    }
    this.phase = 'PAUSED';
    this.pausedAt = now();
    this.updateUI();
  }

  private resumeGame(): void {
    if (this.phase !== 'PAUSED') {
      return;
    }
    this.phase = 'IN_GAME';
    const nowTime = now();
    this.pausedDuration += nowTime - this.pausedAt;
    this.updateUI();
  }

  private onCardSelected(card: CardInstance): void {
    this.board.setHighlight(card.id);
    const selected = this.board.selectCard(card);
    if (!selected) {
      return;
    }
    const type = this.cardTypeMap.get(selected.typeId);
    track('select_card', { cardType: type?.name || selected.typeId });
    this.score += 1;
    const result = this.slot.addCard(selected.id, selected.typeId, type?.label || '');
    if (!result.accepted) {
      if (result.overflow) {
        this.failGame();
        track('fail_full_slots');
      }
      return;
    }
    if (result.matched) {
      const currentTime = now();
      if (currentTime - this.lastMatchTime <= COMBO_WINDOW) {
        this.combo += 1;
      } else {
        this.combo = 1;
      }
      this.lastMatchTime = currentTime;
      const comboBonus = this.combo * 5;
      this.score += 10 + comboBonus;
      track('triple_match', { combo: this.combo, cardType: type?.name || selected.typeId });
    }
  }

  private failGame(): void {
    this.finalElapsed = this.getElapsedTime();
    this.phase = 'FAIL';
    this.combo = 0;
    this.showInterstitial();
    this.updateUI();
  }

  private finishWin(elapsed: number): void {
    if (this.phase === 'WIN') {
      return;
    }
    this.phase = 'WIN';
    this.finalElapsed = elapsed;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      saveBestScore(this.bestScore);
    }
    this.wins += 1;
    saveWinCount(this.wins);
    track('win', { score: this.score, time: elapsed });
    this.showInterstitial();
    this.updateUI();
  }

  private copyShare(): void {
    const content = buildShareContent(this.score, this.phase === 'WIN', this.getElapsedTime());
    copyShareText(`${content.title}\n${content.text}`);
  }

  private showInterstitial(): void {
    Promise.resolve(this.interstitial?.show?.()).catch((err) => console.warn('interstitial show failed', err));
  }

  private getElapsedTime(): number {
    if (this.phase === 'IN_GAME') {
      return now() - this.startTime - this.pausedDuration;
    }
    if (this.phase === 'PAUSED') {
      return this.pausedAt - this.startTime - this.pausedDuration;
    }
    if (this.finalElapsed > 0) {
      return this.finalElapsed;
    }
    if (this.startTime === 0) {
      return 0;
    }
    return now() - this.startTime - this.pausedDuration;
  }

  private updateUI(): void {
    const buttonVisibility: Record<string, boolean> = {
      start: this.phase === 'HOME',
      pause: this.phase === 'IN_GAME',
      resume: this.phase === 'PAUSED',
      restart: this.phase === 'WIN' || this.phase === 'FAIL',
      share: this.phase === 'WIN' || this.phase === 'FAIL',
      home: this.phase === 'WIN' || this.phase === 'FAIL'
    };
    Object.keys(buttonVisibility).forEach((key) => {
      this.ui.updateButton(key, { visible: buttonVisibility[key] });
    });
  }
}
