import { GOOGLE_NAV_FILTER } from '../google-domains';
import type { NavigationMessage } from '../messaging';

/**
 * Background service worker (spec §3.4 / §3.5 / Fase 2).
 *
 * Opening the panel never happens without a user gesture:
 *  - Chrome: the action icon opens the side panel (setPanelBehavior). A keyboard command
 *    opens it too. Chrome has no API to close the side panel, so the icon opens (no toggle).
 *  - Firefox: clicking the action icon toggles the sidebar; the built-in
 *    _execute_sidebar_action command gives the keyboard toggle.
 *
 * SPA navigation on Google /search is forwarded to the panel so it re-syncs from the URL.
 */
export default defineBackground(() => {
  // Chrome: open the side panel on action click, then it persists.
  if (typeof chrome !== 'undefined' && chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err: unknown) => console.error('[LazurQuery] setPanelBehavior failed', err));
  }

  // Firefox: the action icon toggles the sidebar open/closed. sidebarAction is Firefox-only
  // and absent from WXT's (Chrome-based) browser types, so feature-detect via a typed cast.
  const sidebarAction = (browser as unknown as {
    sidebarAction?: { toggle: () => Promise<void> };
  }).sidebarAction;
  if (sidebarAction && browser.action?.onClicked) {
    browser.action.onClicked.addListener(() => {
      void sidebarAction.toggle();
    });
  }

  // Chrome: keyboard shortcut opens the side panel. The `tab` arg keeps us inside the
  // user gesture (sidePanel.open requires one). Firefox uses _execute_sidebar_action natively.
  if (typeof chrome !== 'undefined' && chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener((command, tab) => {
      if (command === 'open-panel' && chrome.sidePanel?.open && tab?.windowId != null) {
        chrome.sidePanel.open({ windowId: tab.windowId });
      }
    });
  }

  // SPA navigation -> tell the panel to re-sync from the (new) URL.
  const notify = (details: { tabId: number; url: string }) => {
    const message: NavigationMessage = {
      type: 'lq:navigation',
      tabId: details.tabId,
      url: details.url,
    };
    browser.runtime.sendMessage(message).catch(() => undefined);
  };

  browser.webNavigation.onHistoryStateUpdated.addListener(notify, GOOGLE_NAV_FILTER);
  browser.webNavigation.onCompleted.addListener(notify, GOOGLE_NAV_FILTER);
});
