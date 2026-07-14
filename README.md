# LazurQuery

### *“Imma chargin mah lazur…”*

Relax — the only thing this one fires at is Google's **search filters**. The Low Orbit Ion
Cannon shipped a big red button and no aim; LazurQuery is the opposite. No packets, no
orbit, no one's servers harmed: just `site:`, `tbs=cdr` and `udm=14` pointed exactly where
you want them. Same energy, better target.

---

Cross-browser (Chrome + Firefox, Manifest V3) browser extension that exposes Google's
advanced search filters — date ranges, exclusions, site restriction, file type, exact
phrase, pure "no-AI" web mode — through a friendly side-panel GUI, in natural language.
No operator syntax required.

> Project by TX-Breaker. The product thesis is **accessibility**: the user never has to see
> `site:`, `tbs=cdr` or `udm=14` unless they want to.

## Stack

- **[WXT](https://wxt.dev)** — cross-browser MV3 build (manifest, Chrome/Firefox targets).
- **TypeScript** (strict)
- **React** — side-panel UI
- **Tailwind CSS v4** — CSS-first (`@import "tailwindcss"` + `@tailwindcss/vite`); dark mode
  follows the OS via `prefers-color-scheme`, no JS, no `dark:` toggle.
- **Vitest** — deterministic unit tests for the pure core.

## Architecture

```
src/
  core/                 pure, no network, no DOM (spec §3.11)
    types.ts            FilterState + DateFilter (discriminated union)
    codec.ts            q/tbs tokenizers + ISO<->US date conversion
    registry.ts         declarative filter registry — the resilience backbone
    builder.ts          buildUrl(state, baseUrl)  -> string
    parser.ts           parseUrl(url)             -> FilterState
    *.test.ts           round-trip + edge cases
  google-domains.ts     enumerated Google domains (NO TLD wildcard)
  app.css               Tailwind import + theme CSS variables
  entrypoints/
    background.ts       setPanelBehavior + webNavigation listeners + messaging
    sidepanel/          React UI (placeholder in v1 Fase 0/1)
  public/_locales/      it + en messages (chrome.i18n)
```

### Invariants

- **The URL is the single source of truth.** No SERP scraping, no DOM selectors. The UI reads
  state from the current URL and applies filters by navigating to a new URL.
- **Builder mutates, never replaces.** `buildUrl(state, baseUrl)` regenerates only the channels
  it owns — `q`, `tbs`, `udm=14` — and preserves everything else (`hl`, `gl`, unknown params).
- **Parser is tolerant and lossless.** Unrecognized content survives in `freeText` / `tbsExtra`.
  Guarantee (tested): `parse(build(x))` deep-equals `x` for canonical states, and
  `parse(build(parse(u)))` deep-equals `parse(u)` for arbitrary URLs.
- **Registry-driven.** Adding/removing/disabling a filter is a change in `registry.ts`
  (`enabled` is the local kill-switch). The `as` channel is reserved for future filters.
- **No dead operators** (`cache:`, `link:`, `related:`, `info:`, `+`, `~`, `daterange:`,
  `inanchor:`). No `num=` promise (Google disabled it in Sep 2025).

## Scripts

```bash
pnpm dev            # Chrome dev
pnpm dev:firefox    # Firefox dev
pnpm build          # Chrome build
pnpm build:firefox  # Firefox build
pnpm zip            # Chrome store package
pnpm zip:firefox    # Firefox add-on package
pnpm test           # Vitest (core)
pnpm compile        # wxt prepare && tsc --noEmit
```

## Status

- [x] Fase 0 — scaffold (WXT + TS strict + React + Tailwind v4, dual-target, _locales, theme)
- [x] Fase 1 — core engine (registry + builder + parser) with full Vitest suite
- [x] Fase 2 — background ↔ panel sync (webNavigation listeners + `useGoogleSync`)
- [x] Fase 3 — side-panel UI (registry-driven form, live preview + Copy, experimental section)
- [x] Fase 4 — persistence (storage.local presets + JSON export/import)
- [x] Fase 5 — branded icons; build packages for Chrome + Firefox
- [ ] Manual E2E (headful) on a live Google SERP — the one step left, intentionally out of CI

`pnpm test` → 75 passing · `pnpm compile` → clean · Chrome + Firefox MV3 build from one codebase.

## Install (from source)

```bash
pnpm install
pnpm build          # or: pnpm build:firefox
```

Then load the unpacked extension:

- **Chrome** — `chrome://extensions` → enable *Developer mode* → *Load unpacked* → pick `.output/chrome-mv3`.
- **Firefox** — `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → pick `.output/firefox-mv3/manifest.json`.

Open the panel with `Ctrl+Shift+U` (`Cmd+Shift+U` on macOS).

## Privacy

LazurQuery makes **zero network requests**. No analytics, no telemetry, no remote code. It
reads the current Google URL and navigates to a new one; presets live in `storage.local` and
never leave the browser. Host permissions are limited to enumerated Google domains — there is
no TLD wildcard.

## License

[MIT](LICENSE) © TX-Breaker
