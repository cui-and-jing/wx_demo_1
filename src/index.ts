import { Game } from './game';
import { InputManager } from './input';
import { Renderer } from './renderer';

const LOGICAL_WIDTH = 750;
const LOGICAL_HEIGHT = 1334;

function createMainCanvas(): any {
  if (typeof wx !== 'undefined' && wx?.createCanvas) {
    return wx.createCanvas();
  }
  const canvas = (globalThis as any).document?.createElement?.('canvas');
  if (canvas && (globalThis as any).document?.body) {
    (globalThis as any).document.body.appendChild(canvas);
  }
  return canvas || {};
}

const canvas = createMainCanvas();
if (typeof globalThis !== 'undefined') {
  (globalThis as any).canvas = canvas;
}
const renderer = new Renderer(canvas, LOGICAL_WIDTH, LOGICAL_HEIGHT);
const input = new InputManager();
const game = new Game(renderer, input);

function loop(timestamp: number): void {
  game.update(timestamp);
  game.render();
  requestFrame(loop);
}

const requestFrame = (() => {
  if (typeof wx !== 'undefined' && wx?.requestAnimationFrame) {
    return wx.requestAnimationFrame.bind(wx);
  }
  return (callback: (time: number) => void) => {
    const raf = (globalThis as any).requestAnimationFrame;
    if (raf) {
      raf(callback);
    } else {
      setTimeout(() => callback(Date.now()), 16);
    }
  };
})();

requestFrame(loop);
