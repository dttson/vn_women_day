# Architecture — first implementation

## Stack and boundaries

- Vite + TypeScript, vanilla DOM UI, Three.js WebGL renderer.
- Zod validates configuration and persisted data; IndexedDB is accessed through the small `idb` wrapper.
- `src/config.ts`: schema and JSON loading, independent of gameplay and rendering.
- `src/domain/garden.ts`: pure progress state and watering rules. No DOM, Three.js or storage access.
- `src/data/photo-repository.ts`: independent local JPEG Blob storage, transactional batch updates, album limits, and a memory-only demo adapter. Browser image processing resizes and strips source metadata without uploading.
- `src/ui/photo-settings.ts`: four category selectors, local previews, replacement and deletion.
- `src/data/progress-repository.ts`: `ProgressRepository` interface, IndexedDB adapter, isolated in-memory demo adapter.
- `src/scene/flower-scene.ts`: model loading, morph weights, lighting and visual effects. Receives progress and pouring state; it cannot award progress or save data.
- `src/scene/side-flower.ts`: shared head geometry, preserved relative morphs, two fixed branch layouts and branch/leaf/bud/bloom presentation.
- `src/audio.ts`: optional synthesized water and chime audio, initialized from user interaction.
- `src/ui/photo-album.ts` and its CSS: cancellable box animation and fan carousel lifecycle, pointer gestures and keyboard navigation.
- `src/main.ts`: input handling, app lifecycle, view updates, dialogs and repository orchestration.

## Progress and time

Schema v1 stores total completed waterings, a normalized amount of the current can already used, `soilReadyAt`, first bloom timestamp, creation/update timestamps, and sound preference. The model has no persisted transforms: its current shape is derived from progress.

While holding, a 100 ms loop submits atomic repository updates. Each update reads current state and commits within one IndexedDB read/write transaction; the Promise resolves only after transaction completion. Stalled ticks are capped at 300 ms. A background tab cannot award elapsed hours as watering.

After a completed can, the next allowed time is persisted as an absolute timestamp. Reopening the page subtracts the current device time from that timestamp. Partial cans remain partial; an already bloomed flower stays open even if configuration later increases the first-bloom threshold. No decay or missed-day penalties are applied.

Cross-tab notifications refresh the UI; IndexedDB serializes writes so tabs do not overwrite a stale state snapshot. Simultaneous active watering in multiple tabs is not rate-limited globally in this version.

## Configuration versus personal data

`public/config/settings.json` is versioned site configuration and message content. It is loaded with revalidation, not stored as a substitute for user progress. Assets and all URLs currently assume root hosting.

Progress has an independent `schemaVersion`. Unsupported/corrupt data is not silently reset in IndexedDB; initialization falls back to a clearly labeled temporary session. A future schema change needs an explicit migration. Backup imports validate format/version and ask before replacing the garden.

Photo data lives in the separate `smallgif-photos` IndexedDB database (version 1), so existing progress needs no migration. The four groups are `mom`, `bisu`, `ryo` (one stable record each) and `memories` (up to 20 records). Batch writes validate and commit atomically, including quota errors; tabs cannot bypass the album limit by writing concurrently. Demo photos never enter this database. Runtime Blob URLs replace the empty shipped photo settings; old URLs are revoked after replacement. Cross-tab changes refresh local photos, deferring changes while an album animation is open.

Photos and previews remain outside Git and Vercel. The old local web copies are preserved under ignored `private-local/`, outside `public/`, so a normal Vite build also excludes them. The JSON backup contains progress only, not images; changing devices or clearing browser data requires selecting photos again. No photo bytes are sent to a backend.

## Backend extension

Keep the domain and renderer unchanged. Introduce an identity mechanism and a synchronizing repository that uses IndexedDB as an offline cache and backend records for recovery.

Before adding synchronization, define server revisions, conflict handling and idempotent watering events. Do not simply let a delayed local snapshot overwrite newer server progress. Provide a recovery identity that survives clearing website data; a UUID stored only in IndexedDB is insufficient. On first connection, explicitly migrate the existing local garden into the chosen identity.

A dashboard can publish the existing validated config format. Writing a JSON file on static hosting requires a publish/deployment mechanism; a browser-only dashboard cannot directly modify deployed repository files.

## Visual and performance baseline

The export has 46 meshes and 37,472 triangles, with 36 petal/sepal morph targets. The web app adds a procedural watering can, 28 instanced water droplets and at most 100 configured dust points. DPR is capped at 1.75 by default, shadows at 1024, and animation drawing is skipped while the page is hidden. Decorative sway/dust movement honors reduced motion.

Two side flowers are derived from the same approved GLB, without extra downloads. Head geometry is transformed into a common pivot while preserving relative morph offsets, then merged by material into six shared geometries. Side flowers use independent weights and reuse those geometries/materials; they do not cast extra shadows. The bouquet is limited to three flowers. A small instanced sparkle effect appears during and briefly after watering.

Family portraits are lightweight HTML overlays projected from the live flower anchors through the same Three.js camera, with viewport-edge clamping. They add no WebGL meshes or draw calls. Each photo is shown only after its corresponding flower has completed blooming (including the visual transition). Locally selected portraits are center-cropped to square, up to 640 pixels; original files remain untouched.

The separate `photoMemories` album uses the existing native dialog. `PhotoAlbum` owns the closed → opening lid → spreading cards → ready → gathering cards → closing lid sequence. Locally selected HTML photo cards fan upward from a CSS box; pointer swipes/drags, side-card clicks, dot selection and Left/Right navigate a circular carousel. Only compositor transforms/opacity animate; there are no extra Three.js draw calls. Reduced-motion skips animation waits and transitions.

Close-button, Escape cancellation and backdrop dismissal route through the same idempotent close Promise. Opening continuations check for an in-progress close, so closing during opening cannot reopen the cards. After gathering and closing, the native dialog closes and clears its content. Disposal aborts listeners, releases pointer capture and clears/resolves waits. Local memory images are at most 1280 pixels and use Blob URLs. Browser decoding handles supported source orientation; HEIC/HEIF files that native decoding cannot open use the lazy `heic-to/csp` decoder, then follow the same canvas resize/re-encode path. Other unsupported or damaged files report an error without replacing existing photos. Originals remain untouched.

Manual Chrome checks cover a swipe from photo 1 to 2, next-arrow and keyboard navigation to photo 3, the dialog remaining open in its gathering phase, complete image removal after close, and Escape during the opening phase. Screenshot: `docs/previews/animated-photo-box-mobile.jpg`.

`gardenGrowth` derives branch progress directly from existing schema-v1 total/partial watering values, so existing saves do not need resetting or database migration. Each configured `seasonWaterings` cycle grows one side flower. Fractional progress covers branch growth (0–20%), leaves (20–40%), bud formation (40–60%), and petal opening (60–100%). At bouquet completion and subsequent full care cycles, configured keepsakes unlock. The separate photo album unlocks only when the `little-rest` keepsake is earned (12 completed sessions with the default settings); an empty album opens photo setup instead. Once the configured keepsakes are exhausted, existing memories remain available and no extra flowers are created.

The demo offers a stage selector, and records renderer draw-call/triangle counters on the scene element's data attributes for local inspection. These are diagnostics only, never progress inputs.

Chrome at the 390×844 breakpoint reported 71 draw calls and 98,956 triangles in the completed three-flower resting scene. These renderer counters are not a mobile GPU timing measurement. Visual QA artifact: `docs/previews/mobile-three-flowers.jpg`. Manual watering across both side-flower bloom thresholds and keepsake display after the next care cycle were verified in the isolated demo.

These are implementation limits, not measured iPhone frame-rate guarantees. Test on a real iPhone over HTTPS before gifting. The Blender material preview includes effects that are not identically represented by glTF materials or Three.js lighting.

## Verification

Automated coverage checks partial-can persistence, absorption gating, no progress from elapsed time alone, first bloom and daily care, retained bloom after configuration changes, invalid data, config validation, concurrent writes, and demo isolation.

Additional tests cover sequential side growth, the three-flower cap, old-save restoration, configurable cycle length, keepsake thresholds, and geometric equivalence of the actual GLB's closed/half/open morphs before and after material merging.

Manual Chrome checks cover the three-session demo, correct messages and letter unlock, responsive overflow at 390×844, settings dialog, and a partial can remaining at 78% after reload on an isolated test origin. Export/import repository behavior is tested automatically; browser download/upload UX still needs device validation.

Private-photo repository tests cover Blob persistence, portrait replacement, atomic failure, album limits across concurrent tabs, and demo isolation.

HEIC regression coverage checks native-decoder success, fallback conversion, HEIC header detection without filename/MIME hints, broken-file errors, and Blob URL cleanup. A manual Chrome local test reproduced the rejection of `Mom1.heic`, then verified the same file rendered successfully after fallback support was added.
