# Font Studio · استوديو الخطوط

A browser-based font editor and type-design tool for Arabic: draw glyphs with Bézier curves, manage font projects and glyph sets, adjust metrics and kerning, write OpenType feature code, and export real font binaries — fully client-side and offline.

**Live:** https://font-studio.pages.dev

## Features

- Glyph drawing with Bézier curves (paper.js)
- Arabic dot (diacritic) shapes and placement
- Metrics: baseline, side bearings, margins
- GSUB and GPOS tables, kerning editor
- OpenType feature code editing (`src/utils/feaParse.ts`)
- Arabic letter-connection preview
- TTF/WOFF2 export with original-table fidelity (vendored woff2 WASM in `src/vendor/woff2/`)
- Offline PWA: service worker caches the whole build, projects saved in IndexedDB
- Arabic and German UI with an i18n system

## Tech Stack

- React 19 + Vite + TypeScript + Tailwind CSS
- paper.js, opentype.js
- Test suite next to each util (`*.test.ts`, run with `tsx --test`)

## Status

Under active development: the UI and manual are Arabic-only so far, there is no demo project on first launch, and the connection preview is a simulation, not a full shaping engine.

## Development

```bash
npm install
npm run dev
npm test
```
