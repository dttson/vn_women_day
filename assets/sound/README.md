# Garden soundtrack

User-supplied downloads are integrated into this application. Vite imports the four files in `src/audio.ts` and publishes hashed assets; the source folder must remain included in Vercel uploads.

| File | Source | Use |
| --- | --- | --- |
| alexgrohl-gentle-499635.mp3 | Gentle — AlexGrohl, https://pixabay.com/music/solo-piano-gentle-499635/ | Looping background music |
| mixkit-select-click-1109.wav | Select click, https://mixkit.co/free-sound-effects/interface/ | Buttons and photo selectors |
| mixkit-fairy-magic-sparkle-871.wav | Fairy magic sparkle, https://mixkit.co/free-sound-effects/fairy/ | Completed flower blooms |
| mixkit-page-turn-chime-1106.wav | Page turn chime, https://mixkit.co/free-sound-effects/interface/ | Album opening/closing, actual photo changes, new keepsakes |

The music is used under the Pixabay Content License: https://pixabay.com/service/license-summary/.
The effects are used under the Mixkit Sound Effects Free License: https://mixkit.co/license/modal/sfxFree/.
These licensed files are part of this application; their inclusion does not grant separate standalone redistribution rights.

Levels are configurable in `public/config/settings.json` under `audio`. Music starts through the sound button or a later user gesture when the saved sound preference is on. Sound is off by default. Backgrounding pauses music and effects. Completed watering alone does not play a flower-bloom sound until a new flower actually blooms. The photo carousel throttles sound during rapid interaction.
