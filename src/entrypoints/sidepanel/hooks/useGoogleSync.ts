import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { isNavigationMessage } from '../../../messaging';

export interface ActiveTab {
  id: number | undefined;
  url: string;
}

/**
 * Keeps the panel in sync with the user's active Google tab (spec §3.5 / Fase 2). The URL is
 * the single source of truth: read on mount, on tab switch/update, on window focus change, and
 * whenever the background reports an SPA navigation. Never assume a full page reload.
 *
 * Works for both the docked side panel and the detached pop-out window: we target the active
 * tab of the focused *normal* browser window (a detached popup is type 'popup', so it falls
 * back to the most recently focused normal window — i.e. the one the user is searching in).
 */
export function useGoogleSync(): ActiveTab {
  const [tab, setTab] = useState<ActiveTab>({ id: undefined, url: '' });

  useEffect(() => {
    let alive = true;
    let lastNormalWindowId: number | undefined;

    const read = async () => {
      const windows = await browser.windows.getAll({ populate: true });
      const normals = windows.filter((w) => w.type === 'normal');
      const focused = normals.find((w) => w.focused);
      if (focused?.id != null) lastNormalWindowId = focused.id;
      const target =
        focused ??
        normals.find((w) => w.id === lastNormalWindowId) ??
        normals[normals.length - 1];
      const activeTab = target?.tabs?.find((t) => t.active);
      if (alive) setTab({ id: activeTab?.id, url: activeTab?.url ?? '' });
    };
    void read();

    const onMessage = (msg: unknown) => {
      if (isNavigationMessage(msg)) void read();
    };
    const reread = () => void read();
    // tabs.onUpdated fires for EVERY tab and every property change (title, favicon, loading…);
    // unfiltered, each event costs a windows.getAll(populate) enumeration. Only URL changes and
    // load completion of an *active* tab can change what we display.
    const onUpdated = (
      _tabId: number,
      changeInfo: { url?: string; status?: string },
      updatedTab: { active?: boolean },
    ) => {
      if (!updatedTab.active) return;
      if (!changeInfo.url && changeInfo.status !== 'complete') return;
      void read();
    };

    browser.runtime.onMessage.addListener(onMessage);
    browser.tabs.onActivated.addListener(reread);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.windows.onFocusChanged.addListener(reread);
    return () => {
      alive = false;
      browser.runtime.onMessage.removeListener(onMessage);
      browser.tabs.onActivated.removeListener(reread);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.windows.onFocusChanged.removeListener(reread);
    };
  }, []);

  return tab;
}
