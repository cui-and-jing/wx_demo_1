import { InputListener, TouchPoint } from './types';

export class InputManager {
  private listeners: Set<InputListener> = new Set();
  private converter: (x: number, y: number) => TouchPoint;

  constructor() {
    this.converter = (x, y) => ({ x, y });
    if (typeof wx !== 'undefined' && wx?.onTouchStart) {
      wx.onTouchStart((event: any) => {
        const touches = event?.changedTouches || event?.touches;
        if (!touches || touches.length === 0) {
          return;
        }
        const touch = touches[0];
        const point = this.converter(touch.x, touch.y);
        this.listeners.forEach((listener) => listener.onTap?.(point));
      });
    } else if (typeof window !== 'undefined') {
      window.addEventListener('click', (event: MouseEvent) => {
        const rect = (event.target as HTMLElement)?.getBoundingClientRect?.();
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

  setConverter(converter: (x: number, y: number) => TouchPoint): void {
    this.converter = converter;
  }

  addListener(listener: InputListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: InputListener): void {
    this.listeners.delete(listener);
  }
}
