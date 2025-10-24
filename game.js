(function () {
  const modules = {
    "./utils": function (module, exports, require) {
      class RNG {
        constructor(seed) {
          if (seed === 0) {
            seed = 1;
          }
          this.seed = seed >>> 0;
        }
        next() {
          this.seed += 0x6D2B79F5;
          let t = this.seed;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        nextInt(min, max) {
          return Math.floor(this.next() * (max - min)) + min;
        }
        pick(list) {
          return list[Math.floor(this.next() * list.length)];
        }
      }
      function shuffleInPlace(arr, rng) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rng.next() * (i + 1));
          const tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
      }
      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }
      function lerp(a, b, t) {
        return a + (b - a) * t;
      }
      function easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
      }
      function now() {
        if (typeof wx !== 'undefined' && wx?.getPerformance?.()) {
          const perf = wx.getPerformance();
          return perf.now();
        }
        return Date.now();
      }
      function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      exports.RNG = RNG;
      exports.shuffleInPlace = shuffleInPlace;
      exports.clamp = clamp;
      exports.lerp = lerp;
      exports.easeOutQuad = easeOutQuad;
      exports.now = now;
      exports.formatTime = formatTime;
    },
    "./analytics": function (module, exports, require) {
      function track(event, payload = {}) {
        const time = new Date().toISOString();
        console.log(`[analytics] ${time} ${event}`, payload);
      }
      exports.track = track;
    },
    "./ads": function (module, exports, require) {
      function createRewardedVideoAd(adUnitId) {
        if (typeof wx !== 'undefined' && wx?.createRewardedVideoAd) {
          try {
            const ad = wx.createRewardedVideoAd({ adUnitId });
            return ad;
          } catch (err) {
            console.warn('createRewardedVideoAd failed, fallback to no-op', err);
          }
        }
        console.log('[ads] RewardedVideoAd not available, using no-op');
        return {
          async show() {
            console.log('[ads] simulated rewarded video show');
          },
          onClose(handler) {
            handler({ isEnded: true });
          }
        };
      }
      function createInterstitialAd(adUnitId) {
        if (typeof wx !== 'undefined' && wx?.createInterstitialAd) {
          try {
            const ad = wx.createInterstitialAd({ adUnitId });
            return ad;
          } catch (err) {
            console.warn('createInterstitialAd failed, fallback to no-op', err);
          }
        }
        console.log('[ads] InterstitialAd not available, using no-op');
        return {
          async show() {
            console.log('[ads] simulated interstitial show');
          }
        };
      }
      exports.createRewardedVideoAd = createRewardedVideoAd;
      exports.createInterstitialAd = createInterstitialAd;
    },
    "./share": function (module, exports, require) {
      const { formatTime } = require('./utils');
      const SHARE_IMAGE_BASE64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAd0lEQVR4nO3PQQkAMAzAwMqu+03EHscgEAGX2T1fN1zQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1owWMXfc/xw5HnEbMAAAAASUVORK5CYII=';
      function ensureShareImage() {
        return SHARE_IMAGE_BASE64;
      }
      function buildShareContent(score, win, timeMs) {
        const imageUrl = ensureShareImage();
        const timeText = formatTime(timeMs);
        const title = win ? `我用了 ${timeText} 通关，得分 ${score}！` : `得分 ${score}，下次一定过！`;
        const text = `${title} #羊了个羊叠层挑战#`;
        return { title, imageUrl, text };
      }
      function copyShareText(text) {
        if (typeof wx !== 'undefined' && wx?.setClipboardData) {
          wx.setClipboardData({ data: text });
        } else {
          console.log('[share] clipboard copy fallback', text);
        }
      }
      exports.buildShareContent = buildShareContent;
      exports.copyShareText = copyShareText;
    },
    "./storage": function (module, exports, require) {
      const BEST_SCORE_KEY = 'ygoy_best_score';
      const WIN_COUNT_KEY = 'ygoy_win_count';
      const DIFFICULTY_SEED_KEY = 'ygoy_diff_seed';
      function safeGet(key, defaultValue) {
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
      function safeSet(key, value) {
        if (typeof wx === 'undefined' || !wx?.setStorageSync) {
          return;
        }
        try {
          wx.setStorageSync(key, value);
        } catch (err) {
          console.warn('storage write failed', err);
        }
      }
      function loadSnapshot() {
        return {
          bestScore: safeGet(BEST_SCORE_KEY, 0),
          winCount: safeGet(WIN_COUNT_KEY, 0),
          seed: safeGet(DIFFICULTY_SEED_KEY, Math.floor(Math.random() * 1000000))
        };
      }
      function saveBestScore(score) {
        safeSet(BEST_SCORE_KEY, score);
      }
      function saveWinCount(winCount) {
        safeSet(WIN_COUNT_KEY, winCount);
      }
      function saveDifficultySeed(seed) {
        safeSet(DIFFICULTY_SEED_KEY, seed);
      }
      function getDifficultyState() {
        const snapshot = loadSnapshot();
        return {
          seed: snapshot.seed,
          wins: snapshot.winCount
        };
      }
      exports.loadSnapshot = loadSnapshot;
      exports.saveBestScore = saveBestScore;
      exports.saveWinCount = saveWinCount;
      exports.saveDifficultySeed = saveDifficultySeed;
      exports.getDifficultyState = getDifficultyState;
    },
    "./level": function (module, exports, require) {
      const { RNG, clamp, shuffleInPlace } = require('./utils');
      const LOGICAL_WIDTH = 750;
      const CARD_WIDTH = 96;
      const CARD_HEIGHT = 120;
      function generateLevel(progressWins, baseSeed, cardTypes) {
        const difficultyBump = Math.min(4, Math.floor(progressWins / 2));
        const layerCount = clamp(4 + difficultyBump, 4, 6);
        const rng = new RNG(baseSeed + progressWins * 97 + layerCount * 31);
        const cards = [];
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
        const pool = [];
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
      exports.generateLevel = generateLevel;
    },
    "./board": function (module, exports, require) {
      const { clamp, easeOutQuad } = require('./utils');
      const CARD_WIDTH = 96;
      const CARD_HEIGHT = 120;
      class Board {
        constructor() {
          this.cards = [];
          this.nextId = 1;
          this.highlightCardId = null;
        }
        setup(level) {
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
        createCard(x, y, layer, typeId) {
          return {
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
        }
        getCards() {
          return this.cards;
        }
        remainingCount() {
          return this.cards.filter((card) => !card.removed).length;
        }
        setHighlight(cardId) {
          this.highlightCardId = cardId;
          this.cards.forEach((card) => {
            card.highlight = card.id === cardId ? 1 : 0;
          });
        }
        hitTest(point) {
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
        selectCard(card) {
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
        update(dt) {
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
        updateVisibility() {
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
      function isPointInside(point, position, size) {
        return (
          point.x >= position.x &&
          point.x <= position.x + size.x &&
          point.y >= position.y &&
          point.y <= position.y + size.y
        );
      }
      exports.Board = Board;
    },
    "./slot": function (module, exports, require) {
      const { clamp, lerp } = require('./utils');
      class SlotManager {
        constructor(maxSlots) {
          this.entries = [];
          this.effects = [];
          this.baseX = 120;
          this.baseY = 1080;
          this.spacing = 90;
          this.maxSlots = maxSlots;
        }
        reset() {
          this.entries = [];
          this.effects = [];
        }
        setLayout(baseX, baseY, spacing) {
          this.baseX = baseX;
          this.baseY = baseY;
          this.spacing = spacing;
        }
        addCard(id, typeId, label) {
          if (this.entries.length >= this.maxSlots) {
            return { accepted: false, overflow: true, matched: false };
          }
          const entry = {
            id,
            typeId,
            label,
            x: this.baseX,
            y: this.baseY - 80,
            targetX: this.computeTargetX(this.entries.length),
            targetY: this.baseY,
            scale: 0.5
          };
          this.entries.push(entry);
          this.recalculateTargets();
          const indices = [];
          for (let i = 0; i < this.entries.length; i++) {
            if (this.entries[i].typeId === typeId) {
              indices.push(i);
            }
          }
          if (indices.length >= 3) {
            const removed = [];
            const toRemove = indices.slice(0, 3).sort((a, b) => b - a);
            for (const index of toRemove) {
              const removedEntry = this.entries.splice(index, 1)[0];
              if (removedEntry) {
                removed.push(removedEntry);
              }
            }
            for (const r of removed) {
              this.effects.push({
                id: r.id,
                typeId: r.typeId,
                label: r.label,
                x: r.x,
                y: r.y,
                timer: 0,
                duration: 320
              });
            }
            this.recalculateTargets();
            return { accepted: true, overflow: false, matched: true, clearedTypeId: typeId, removedIds: removed.map((item) => item.id) };
          }
          return { accepted: true, overflow: false, matched: false };
        }
        getEntries() {
          return this.entries;
        }
        getEffects() {
          return this.effects;
        }
        update(dt) {
          const step = clamp(dt / 180, 0, 1);
          this.entries.forEach((entry, index) => {
            entry.targetX = this.computeTargetX(index);
            entry.targetY = this.baseY;
            entry.x = lerp(entry.x, entry.targetX, step);
            entry.y = lerp(entry.y, entry.targetY, step);
            entry.scale = lerp(entry.scale, 1, step * 0.9);
          });
          this.effects = this.effects.filter((effect) => {
            effect.timer += dt;
            effect.y -= dt * 0.05;
            return effect.timer < effect.duration;
          });
        }
        recalculateTargets() {
          this.entries.forEach((entry, index) => {
            entry.targetX = this.computeTargetX(index);
            entry.targetY = this.baseY;
          });
        }
        computeTargetX(index) {
          return this.baseX + index * this.spacing;
        }
      }
      exports.SlotManager = SlotManager;
    },
    "./ui": function (module, exports, require) {
      class UIManager {
        constructor() {
          this.buttons = new Map();
        }
        registerButton(button) {
          this.buttons.set(button.id, button);
        }
        updateButton(id, changes) {
          const button = this.buttons.get(id);
          if (!button) {
            return;
          }
          Object.assign(button, changes);
        }
        getButton(id) {
          return this.buttons.get(id);
        }
        hitTest(point) {
          for (const button of this.buttons.values()) {
            if (!button.visible || !button.enabled) {
              continue;
            }
            if (pointInRect(point, button.rect)) {
              return button;
            }
          }
          return null;
        }
        visibleButtons() {
          return Array.from(this.buttons.values()).filter((btn) => btn.visible);
        }
      }
      function pointInRect(point, rect) {
        return (
          point.x >= rect.x &&
          point.x <= rect.x + rect.width &&
          point.y >= rect.y &&
          point.y <= rect.y + rect.height
        );
      }
      exports.UIManager = UIManager;
      exports.pointInRect = pointInRect;
    },
    "./renderer": function (module, exports, require) {
      class Renderer {
        constructor(canvas, logicalWidth, logicalHeight) {
          this.canvas = canvas;
          this.logicalWidth = logicalWidth;
          this.logicalHeight = logicalHeight;
          this.pixelRatio = 1;
          this.scale = 1;
          this.offsetX = 0;
          this.offsetY = 0;
          this.viewWidth = 0;
          this.viewHeight = 0;
          this.backgroundGradient = null;
          this.cardColors = new Map();
          this.cardTypeMap = new Map();
          this.ready = false;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Unable to acquire 2d context');
          }
          this.ctx = ctx;
          this.updateTransform();
          if (typeof wx !== 'undefined' && wx?.onWindowResize) {
            wx.onWindowResize(() => this.updateTransform());
          } else {
            const globalWindow = globalThis;
            if (globalWindow?.addEventListener) {
              globalWindow.addEventListener('resize', () => this.updateTransform());
            }
          }
        }
        async preload(cardTypes) {
          this.cardTypeMap.clear();
          this.cardColors.clear();
          cardTypes.forEach((type) => {
            this.cardTypeMap.set(type.id, type);
            this.cardColors.set(type.id, type.color);
          });
          this.ready = true;
        }
        isReady() {
          return this.ready;
        }
        beginFrame() {
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
        endFrame() {
          this.ctx.restore();
        }
        drawCard(card) {
          const ctx = this.ctx;
          const type = this.cardTypeMap.get(card.typeId);
          const fillColor = this.cardColors.get(card.typeId) ?? '#cccccc';
          const cx = card.position.x + card.size.x / 2;
          const cy = card.position.y + card.size.y / 2;
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
        drawSlot(entries, effects, width) {
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
        drawSlotChip(typeId, label) {
          const ctx = this.ctx;
          const type = this.cardTypeMap.get(typeId);
          const color = this.cardColors.get(typeId) ?? '#cccccc';
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
        drawText(text, x, y, options = {}) {
          const ctx = this.ctx;
          ctx.save();
          ctx.fillStyle = options.color || '#ffffff';
          ctx.font = `bold ${options.size || 32}px sans-serif`;
          ctx.textAlign = options.align || 'left';
          ctx.fillText(text, x, y);
          ctx.restore();
        }
        drawButton(button, highlighted) {
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
        screenToWorld(x, y) {
          const worldX = (x - this.offsetX) / this.scale;
          const worldY = (y - this.offsetY) / this.scale;
          return { x: worldX, y: worldY };
        }
        updateTransform() {
          let width = 750;
          let height = 1334;
          let pixelRatio = 1;
          if (typeof wx !== 'undefined' && wx?.getSystemInfoSync) {
            const info = wx.getSystemInfoSync();
            width = info.windowWidth;
            height = info.windowHeight;
            pixelRatio = info.pixelRatio || 1;
          } else {
            const globalWindow = globalThis;
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
      function roundRect(ctx, x, y, width, height, radius) {
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
      exports.Renderer = Renderer;
      exports.roundRect = roundRect;
    },
    "./input": function (module, exports, require) {
      class InputManager {
        constructor() {
          this.listeners = new Set();
          this.converter = (x, y) => ({ x, y });
          if (typeof wx !== 'undefined' && wx?.onTouchStart) {
            wx.onTouchStart((event) => {
              const touches = event?.changedTouches || event?.touches;
              if (!touches || touches.length === 0) {
                return;
              }
              const touch = touches[0];
              const point = this.converter(touch.x, touch.y);
              this.listeners.forEach((listener) => listener.onTap?.(point));
            });
          } else if (typeof window !== 'undefined') {
            window.addEventListener('click', (event) => {
              const rect = event.target?.getBoundingClientRect?.();
              let x = event.clientX;
              let y = event.clientY;
              if (rect) {
                x -= rect.left;
                y -= rect.top;
              }
              const point = this.converter(x, y);
              this.listeners.forEach((listener) => listener.onTap?.(point));
            });
          }
        }
        setConverter(converter) {
          this.converter = converter;
        }
        addListener(listener) {
          this.listeners.add(listener);
        }
        removeListener(listener) {
          this.listeners.delete(listener);
        }
      }
      exports.InputManager = InputManager;
    },
    "./game": function (module, exports, require) {
      const { createInterstitialAd, createRewardedVideoAd } = require('./ads');
      const { Board } = require('./board');
      const { InputManager } = require('./input');
      const { Renderer } = require('./renderer');
      const { SlotManager } = require('./slot');
      const { UIManager } = require('./ui');
      const { buildShareContent, copyShareText } = require('./share');
      const { track } = require('./analytics');
      const { generateLevel } = require('./level');
      const { getDifficultyState, loadSnapshot, saveBestScore, saveDifficultySeed, saveWinCount } = require('./storage');
      const { formatTime, now } = require('./utils');
      const LOGICAL_WIDTH = 750;
      const LOGICAL_HEIGHT = 1334;
      const COMBO_WINDOW = 1200;
      const CARD_TYPES = [
        { id: 1, name: 'sheep', label: '羊', color: '#ffca28' },
        { id: 2, name: 'leaf', label: '叶', color: '#66bb6a' },
        { id: 3, name: 'tree', label: '木', color: '#8d6e63' },
        { id: 4, name: 'sun', label: '光', color: '#ff8f00' },
        { id: 5, name: 'gem', label: '晶', color: '#26a69a' },
        { id: 6, name: 'fire', label: '焰', color: '#ef5350' }
      ];
      const BUTTONS = [
        { id: 'start', label: '开始挑战', rect: { x: 225, y: 860, width: 300, height: 96 } },
        { id: 'restart', label: '再次挑战', rect: { x: 225, y: 860, width: 300, height: 96 } },
        { id: 'share', label: '复制文案', rect: { x: 225, y: 980, width: 300, height: 96 } },
        { id: 'pause', label: '暂停', rect: { x: LOGICAL_WIDTH - 180, y: 60, width: 120, height: 64 } },
        { id: 'resume', label: '继续', rect: { x: 225, y: 780, width: 300, height: 96 } },
        { id: 'home', label: '返回首页', rect: { x: 225, y: 1080, width: 300, height: 96 } }
      ];
      class Game {
        constructor(renderer, input) {
          this.phase = 'LOADING';
          this.board = new Board();
          this.slot = new SlotManager(7);
          this.ui = new UIManager();
          this.cardTypeMap = new Map();
          this.renderer = renderer;
          this.input = input;
          this.interstitial = createInterstitialAd('demo-interstitial');
          this.rewarded = createRewardedVideoAd('demo-rewarded');
          this.levelConfig = null;
          this.lastTimestamp = 0;
          this.score = 0;
          this.combo = 0;
          this.lastMatchTime = 0;
          this.bestScore = 0;
          this.wins = 0;
          this.startTime = 0;
          this.pausedAt = 0;
          this.pausedDuration = 0;
          this.finalElapsed = 0;
          CARD_TYPES.forEach((type) => this.cardTypeMap.set(type.id, type));
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
        update(timestamp) {
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
        render() {
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
        renderGameScene() {
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
        renderResultPanel(win) {
          const title = win ? '通关成功！' : '挑战失败';
          this.renderer.drawText(title, LOGICAL_WIDTH / 2, 520, { size: 60, align: 'center' });
          this.renderer.drawText(`本局得分 ${this.score}`, LOGICAL_WIDTH / 2, 580, { size: 36, align: 'center' });
          this.renderer.drawText(`用时 ${formatTime(this.getElapsedTime())}`, LOGICAL_WIDTH / 2, 630, { size: 32, align: 'center' });
        }
        renderHome() {
          this.renderer.drawText('羊了个羊·叠层挑战', LOGICAL_WIDTH / 2, 320, { size: 60, align: 'center' });
          this.renderer.drawText(`最佳得分 ${this.bestScore}`, LOGICAL_WIDTH / 2, 400, { size: 32, align: 'center' });
          this.renderer.drawText(`累计胜场 ${this.wins}`, LOGICAL_WIDTH / 2, 450, { size: 28, align: 'center' });
          this.renderer.drawText('规则简介：点选未被覆盖的牌，底部槽位收集三张即可消除。', LOGICAL_WIDTH / 2, 560, {
            size: 26,
            align: 'center'
          });
          this.renderer.drawText('槽位最多 7 格，填满即失败。', LOGICAL_WIDTH / 2, 600, { size: 26, align: 'center' });
        }
        handleTap(point) {
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
        handleButton(id) {
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
        startGame() {
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
        pauseGame() {
          if (this.phase !== 'IN_GAME') {
            return;
          }
          this.phase = 'PAUSED';
          this.pausedAt = now();
          this.updateUI();
        }
        resumeGame() {
          if (this.phase !== 'PAUSED') {
            return;
          }
          this.phase = 'IN_GAME';
          const nowTime = now();
          this.pausedDuration += nowTime - this.pausedAt;
          this.updateUI();
        }
        onCardSelected(card) {
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
        failGame() {
          this.finalElapsed = this.getElapsedTime();
          this.phase = 'FAIL';
          this.combo = 0;
          this.showInterstitial();
          this.updateUI();
        }
        finishWin(elapsed) {
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
        copyShare() {
          const content = buildShareContent(this.score, this.phase === 'WIN', this.getElapsedTime());
          copyShareText(`${content.title}\n${content.text}`);
        }
        showInterstitial() {
          Promise.resolve(this.interstitial?.show?.()).catch((err) => console.warn('interstitial show failed', err));
        }
        getElapsedTime() {
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
        updateUI() {
          const buttonVisibility = {
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
      exports.Game = Game;
    },
    "./index": function (module, exports, require) {
      const { Game } = require('./game');
      const { InputManager } = require('./input');
      const { Renderer } = require('./renderer');
      const LOGICAL_WIDTH = 750;
      const LOGICAL_HEIGHT = 1334;
      function createMainCanvas() {
        if (typeof wx !== 'undefined' && wx?.createCanvas) {
          return wx.createCanvas();
        }
        const canvas = globalThis?.document?.createElement?.('canvas');
        if (canvas && globalThis?.document?.body) {
          globalThis.document.body.appendChild(canvas);
        }
        return canvas || {};
      }
      const canvas = createMainCanvas();
      if (typeof globalThis !== 'undefined') {
        globalThis.canvas = canvas;
      }
      const renderer = new Renderer(canvas, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      const input = new InputManager();
      const game = new Game(renderer, input);
      function loop(timestamp) {
        game.update(timestamp);
        game.render();
        requestFrame(loop);
      }
      const requestFrame = (() => {
        if (typeof wx !== 'undefined' && wx?.requestAnimationFrame) {
          return wx.requestAnimationFrame.bind(wx);
        }
        return (callback) => {
          const raf = globalThis?.requestAnimationFrame;
          if (raf) {
            raf(callback);
          } else {
            setTimeout(() => callback(Date.now()), 16);
          }
        };
      })();
      requestFrame(loop);
    }
  };
  const cache = {};
  function localRequire(id) {
    if (cache[id]) {
      return cache[id].exports;
    }
    if (!modules[id]) {
      throw new Error(`Module ${id} not found`);
    }
    const module = { exports: {} };
    cache[id] = module;
    modules[id](module, module.exports, localRequire);
    return module.exports;
  }
  localRequire("./index");
})();
