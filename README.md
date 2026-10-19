# Một bông hoa dành cho mẹ

A small Three.js web gift for 20/10, with a purple rose modeled in Blender, hold-to-water interaction, saved progress, and personal messages from **ba** to **mẹ**.

## Run locally

Requires Node.js 22.12+ (tested with 22.20).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The normal garden uses IndexedDB; `/?demo=1` runs an independent, in-memory preview with shorter waits, skip/restart controls, and a stage selector for all branch/bud/bloom milestones. Demo progress is intentionally lost on reload.

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`dist/` is the static deployment output. Deploy at the domain root over HTTPS. Keep the hostname stable: `localhost`, `127.0.0.1`, preview domains and the production domain each have separate browser data. Backend and a custom domain have not been configured.

## Deploy to Vercel

`vercel.json` configures Vite, `npm ci`, tests followed by the production build, and the `dist` output. Node.js is pinned to 22.x. `.vercelignore` excludes Blender sources and local previews from uploads; runtime photos and models under `public/` are included.

Run `npx vercel login` once, then `npx vercel --prod` from this directory. Select or create the SmallGif project in the intended Vercel account. Use its stable production URL for daily care so browser progress stays on the same origin.

For Git-based deployment, import `dttson/vn_women_day` into Vercel, use the repository root as the project root, and set `main` as the production branch. Keep the checked-in build settings and Node.js 22.x. No environment variables or backend are required. Later pushes to `main` can deploy through this integration.

## Configure the gift

Edit [`public/config/settings.json`](public/config/settings.json):

- `watering.durationMs`: hold time per can, default 7 seconds.
- `watering.absorptionMs`: wait between the first watering sessions, default 30 minutes.
- `watering.firstBloomWaterings`: number of sessions before the first full bloom, default 3.
- `watering.dailyCooldownMs`: cooldown after blooming, default 24 hours after each completed session.
- `watering.seasonWaterings`: later care sessions per commemorative season, default 5.
- `messages`: stable IDs, unlock thresholds and messages.
- `growth.flowerNames`: the three flower labels, currently Ba, Bisu and Ryo.
- `growth.keepsakes`: messages unlocked after the bouquet is complete; optional `imageUrl` points to an image under `public/` (for example `/images/family.jpg`).
- Family photos are selected in **Cài đặt → Chọn ảnh gia đình**, with separate sections for mom, Bisu, Ryo and multiple memory photos (maximum 20). They are stored as JPEG Blobs in the separate IndexedDB database `smallgif-photos`, never uploaded. Portraits are center-cropped to square (up to 640 px); memory photos retain their full frame (up to 1280 px). Decoding and re-encoding run locally and discard original metadata. Unsupported formats show a JPEG/PNG suggestion.
- `familyPhotos` and `photoMemories` ship empty in JSON; runtime image URLs come only from locally selected photos. Portraits appear after the corresponding flower blooms; the album unlocks after the `little-rest` keepsake. The same photos can be replaced or removed without changing watering progress. Demo photos are temporary and isolated from real photos.
- `albumAnimation`: `lidOpenMs`, `spreadMs`, `gatherMs`, `lidCloseMs` control the box sequence. Reduced-motion users see the same states without animated movement.
- `letter`: title, paragraphs and signature. Personal content is authored directly here and is retained when extending the garden features.
- `visual`: model path, background, pixel-ratio cap, sway and dust count.

Configuration is validated before the app starts. Invalid configuration shows a retry message instead of starting with inconsistent rules. JSON is public site content; it is not a private storage mechanism. A future dashboard can validate and publish this same format through a backend or a deployment workflow.

## What works

- GLB rose with independent petal/sepal morph targets; approved head size of 1.4× the original model.
- Watering can animation, water droplets, soil moisture tint, gentle sway and optional synthesized audio.
- Press and hold with pointer/touch, or focus the water button and hold Space/Enter; release, blur, page hide and pointer cancellation stop watering.
- Three initial sessions reveal messages and unlock the letter. Each next five daily sessions grows one side branch through leaves, bud and bloom. The bouquet is capped at three flowers, named Ba, Bisu and Ryo.
- Each partial watering visibly advances the active side flower. After all three bloom, a keepsake unlocks immediately, then another every five completed sessions until the configured set is exhausted. All unlocked keepsakes remain in the memory box; adding more to JSON extends the collection.
- Side petals share merged geometry/materials (six head meshes per side flower), and watering gives gentle plant movement and brief sparkling droplets.
- IndexedDB writes during watering, absolute ready-at timestamps, and reload recovery of partial cans.
- Atomic repository changes and cross-tab refresh notifications.
- Memory box, export/import JSON backups, home-screen manifest and Safari home-screen guidance.
- Original local photo copies are kept under ignored `private-local/`, outside Vite’s public directory. Photos, local previews and this folder are excluded from Git and Vercel; the production build contains no bundled family photos.
- A separate photo memory box unlocks from the page card and photo icon after the keepsake `little-rest` ("Một khoảng riêng cho mẹ"): five completed sessions after the bouquet, or 18 sessions total with the default configuration. Its lid opens before six photos spread upward as a fan carousel. Swipe/drag, tap a side card or dot, use arrows or press Left/Right to navigate. On close, the photos return into the box before its lid closes; only then is the dialog removed. Close, Escape and backdrop dismissal share this sequence, including during opening.
- Explicit in-memory fallback notice if browser storage is unavailable. Failed writes stop watering and report the problem.
- Reduced-motion preference, keyboard controls, labeled buttons and a focus-managed native dialog.

## Current limits

- This is local storage, not a backup guarantee. The browser can evict it. The JSON backup contains progress only, not photos: keep originals and reselect them if browser storage is cleared or when changing devices. Backend sync does not exist yet.
- Safari tab storage and an installed home-screen app may have separate data. Export/import when moving between environments.
- The manifest supports home-screen presentation; there is no service worker or guaranteed offline launch yet. Font loading uses Google Fonts with local font fallbacks.
- Cooldowns use the device clock. They are a gentle interaction rule, not server-enforced limits.
- Flowers never multiply beyond three or close again. Later care unlocks configured keepsakes; calendar-specific events and new flower colors remain future features.
- Three.js rendering differs from Blender studio rendering; the actual web preview is the reference for the app.
- Chrome desktop and a 390×844 responsive viewport have been checked. Physical iPhone Safari, audio playback there, and mobile GPU profiling remain to be verified.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module boundaries and the backend migration path. Editable Blender source and previews live in [`assets/flower`](assets/flower/README.md).
