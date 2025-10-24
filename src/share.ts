import { formatTime } from './utils';

const SHARE_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAd0lEQVR4nO3PQQkAMAzAwMqu+03EHscgEAGX2T1fN1zQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1owWMXfc/xw5HnEbMAAAAASUVORK5CYII=';

function ensureShareImage(): string {
  return SHARE_IMAGE_BASE64;
}

export interface ShareContent {
  title: string;
  imageUrl: string;
  text: string;
}

export function buildShareContent(score: number, win: boolean, timeMs: number): ShareContent {
  const imageUrl = ensureShareImage();
  const timeText = formatTime(timeMs);
  const title = win ? `我用了 ${timeText} 通关，得分 ${score}！` : `得分 ${score}，下次一定过！`;
  const text = `${title} #羊了个羊叠层挑战#`;
  return { title, imageUrl, text };
}

export function copyShareText(text: string): void {
  if (typeof wx !== 'undefined' && wx?.setClipboardData) {
    wx.setClipboardData({ data: text });
  } else {
    console.log('[share] clipboard copy fallback', text);
  }
}
