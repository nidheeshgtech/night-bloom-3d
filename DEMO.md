# Presenting Night Bloom

## Run it
- **Dev:** `npm run dev` → http://localhost:5173
- **Production build:** `npm run build`, then open `dist/` from any static host.
  With MAMP running: http://localhost:8888/3d-garden/dist/
- **On a phone (same Wi-Fi):** `npm run phone`, then open the "Network" URL it prints.

## The 2-minute client demo
1. Open the page and wait for **Watch the tour** to appear (about 3 s locally).
2. Click **Watch the tour**. It runs hands-free for about 90 s: world overview →
   Ribbon Arcade → inside the butterfly glasshouse → sunset → Lantern Shore at night.
   Talk over it; captions carry the story.
3. When it ends you have control. Good live moments:
   - Click **Wingsong Conservatory** → **Enter**, walk in (WASD / drag), click a butterfly.
   - Slide the time of day to night and enter **Lantern Shore**; click a lantern for the light wave.
   - Click any flower for its botanical card.
4. **Take control** or **Esc** stops the tour at any time.

## Handy keys
- `` ` `` (backtick): show/hide fps, draw calls and triangles (for technical audiences).
- `Esc`: stop tour, leave inspect, close panels.
- **HQ/LQ** button (top right): drop to LQ on a weak laptop.
- Add `?debug` to the URL to start with stats visible.

## Talking points
- Real-time WebGL, not video: every flower has modelled petals, leaves and stems.
- Thousands of instanced plants with distance LOD; distant beds become a shader "flower carpet".
- 240 butterflies with flight, landing and feeding behaviour, all on one draw call.
- Zones are streamed modules: new attractions can be added without rebuilding the world.
- All external assets are CC0 (see LICENSES.md); everything else is generated in code.
- Original concept; not affiliated with any existing attraction.

## Known limits
- Tested on a desktop Mac (M1 Pro) in Chrome. Test on the client's device type before the meeting.
- Three zones are "opening soon": flower-carpet designs from the air, not yet walkable gardens.
