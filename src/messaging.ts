/** Messages exchanged between the background service worker and the side panel. */

export interface NavigationMessage {
  type: 'lq:navigation';
  tabId: number;
  url: string;
}

export type LqMessage = NavigationMessage;

export function isNavigationMessage(msg: unknown): msg is NavigationMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: unknown }).type === 'lq:navigation'
  );
}
