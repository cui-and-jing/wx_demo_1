import { Rect, TouchPoint } from './types';

export interface UIButton {
  id: string;
  rect: Rect;
  label: string;
  visible: boolean;
  enabled: boolean;
}

export class UIManager {
  private buttons: Map<string, UIButton> = new Map();

  registerButton(button: UIButton): void {
    this.buttons.set(button.id, button);
  }

  updateButton(id: string, changes: Partial<UIButton>): void {
    const button = this.buttons.get(id);
    if (!button) {
      return;
    }
    Object.assign(button, changes);
  }

  getButton(id: string): UIButton | undefined {
    return this.buttons.get(id);
  }

  hitTest(point: TouchPoint): UIButton | null {
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

  visibleButtons(): UIButton[] {
    return Array.from(this.buttons.values()).filter((btn) => btn.visible);
  }
}

function pointInRect(point: TouchPoint, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}
