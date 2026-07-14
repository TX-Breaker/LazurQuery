import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { GOOGLE_MATCH_PATTERNS } from './src/google-domains';

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  // With srcDir set, WXT's default publicDir is NOT src/public — point it there explicitly
  // so _locales and icon/ get copied to the build output.
  publicDir: 'src/public',
  modules: ['@wxt-dev/module-react'],
  // Spec §2/§3: Manifest V3 on BOTH targets (WXT defaults Firefox to MV2 otherwise).
  manifestVersion: 3,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    action: { default_title: '__MSG_extName__' },
    commands:
      browser === 'firefox'
        ? {
            // Firefox built-in: toggles the sidebar. Handled natively, no JS listener.
            _execute_sidebar_action: {
              suggested_key: { default: 'Ctrl+Shift+U', mac: 'Command+Shift+U' },
            },
          }
        : {
            // Chrome: custom command, opened from the background (sidePanel has no built-in).
            'open-panel': {
              suggested_key: { default: 'Ctrl+Shift+U', mac: 'Command+Shift+U' },
              description: '__MSG_cmd_open_panel__',
            },
          },
    permissions: [
      'storage',
      'tabs',
      'webNavigation',
      // sidePanel is a Chrome-only permission; Firefox uses sidebar_action (no permission needed).
      ...(browser === 'chrome' ? ['sidePanel'] : []),
    ],
    host_permissions: [...GOOGLE_MATCH_PATTERNS],
    // Firefox MV3 requires an explicit add-on ID; declare no data collection (AMO Nov 2025+).
    // Firefox-only: Chrome ignores the key but shipping it there is noise for CWS review.
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'lazurquery@tx-breaker',
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
});
