/** Simple analytics wrapper logging to console for development. */

type Payload = Record<string, unknown>;

export function track(event: string, payload: Payload = {}): void {
  const time = new Date().toISOString();
  console.log(`[analytics] ${time} ${event}`, payload);
}
