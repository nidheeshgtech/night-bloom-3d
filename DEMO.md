# Presenting Night Bloom

## Links
| Page | URL | Use |
|---|---|---|
| Showcase (home) | `/` | Your portfolio and sales page: every demo as a card |
| Garden | `/garden` | Botanical attraction demo |
| Festival | `/festival` | Event venue map demo |
| Resort | `/resort` | Resort virtual tour demo |
| Beach hotel | `/hotel` | Beach hotel home tour (interiors, pool, pier, villas) |
| Hotel TV | `/hotel-tv` | Hands-free loop for lobby screens and room TVs |
| Client link | `/?brand=<key>` | A preset made for one client (no "All demos" link) |

To add a demo: add a preset in `src/brand/presets.js`, a path in `src/route.js` (`PATH_PRESETS`),
and a card in `src/showcase/demos.js` with a thumbnail in `public/showcase/`. Set your email or
LinkedIn in `OWNER` (demos.js) to show the "Get one for your venue" button.

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
   - Click **Wingsong Conservatory** → **Enter**. Walk Street View-style: double-click the path
     (or click a floor arrow), drag to look around. Click a butterfly.
   - Slide the time of day to night and enter **Lantern Shore**; click a lantern for the light wave.
   - Click any flower for its botanical card.
4. **Take control** or **Esc** stops the tour at any time.

## Walking controls
- **Desktop:** double-click the ground to walk there (routes around beds, hedges and water),
  click a floor arrow to follow the path, drag to look, WASD/Shift also works.
- **Touch:** tap the ground or an arrow to walk, swipe to look, tap flowers to learn more.
- **Exit to aerial view** returns to the overview.

## Light show
**Light show** (bottom bar) switches to night, flies to the lakeside and runs a ~55 s drone show
(8-point star, flower, butterfly, palm, the brand name) with a fireworks finale. Sound on recommended.

## Event mode (festival demo)
`?brand=festival` turns the world into a fictional winter festival, **Sandglow Festival**: a main
stage on the lake (LED wall, moving beams), a second stage at Lantern Shore, food truck row, a
makers and sponsors market, toilets, first aid, info points, a ticketed entrance and parking.
- Map pins by category; **Explore** filters them and lists every place.
- Tap a place → **Take me there** walks or flies you to a good viewpoint.
- **Tonight** (calendar button): the schedule with live/past states; drone show and fireworks
  items launch the light show. A banner shows "Next in X min" on a fast demo clock.
- Sponsors, stage names, schedule, dates and ticket link all come from the `event` block of the
  preset in `src/brand/presets.js`.

## Resort mode (resort tour demo)
`/resort` (or `?brand=resort`): **Dunebloom Resort & Spa**, fictional. Arrival court, infinity
pool with cabanas and pool bar, six villas with plunge pools, lakeview dining terrace, sunrise
yoga lawn, plus the spa and kids club in existing gardens. Each place has a booking button
("Check availability", "Reserve a table", "Book a treatment"…), a "Today" schedule, and its own
guided tour.

## Beach hotel (home tour demo)
`/hotel`: **Saffron Shores Resort**, fictional. A crescent hotel on its own beach: double-height
lobby with chandelier, a Signature Suite on floor 8 with balcony, lagoon pool with swim-up bar,
kids splash zone, beach palapas, a pier to an overwater restaurant, beach villas with plunge pools,
and a spa. **Watch the tour** runs about 90 s from the sea, through the lobby and suite, to golden
hour, dinner over the water and fireworks. Every place has its own booking button.

### Cinematic look (hotel)
- Physically based materials: travertine deck, teak decking, linen, thatch, stucco and marble
  (CC0 textures), reflective solar-glass windows with bronze frames.
- Sun with soft shadows, sky and sand bounce light, ambient occlusion, ACES filmic tone mapping,
  restrained bloom, a light grade and vignette. Depth of field only during the guided tour.
- Tour: letterbox bars, film-style chapter titles, flowing camera moves with a slight handheld
  drift, fade cuts into interiors.
- Life: yachts and a dhow cruising the bay with wakes, gulls, planting beds, and at night a slow
  colour wash along the crescent, LED fins on the tower and a breathing gold crown.

## Hotel TV mode
`/hotel-tv` is for a lobby screen or a smart TV browser. It plays the hotel tour on a loop with
no controls, and a side panel shows:
- the real time and date
- "Today at the resort" (past items dim, the next one is marked)
- rotating offers
- a **Scan to book** QR code (the preset's booking URL, or the `/hotel` page if none is set).

Open it full screen (F11 on a PC, or the TV browser's full-screen option). Schedule and offers come from
the `hotel` preset in `src/brand/presets.js`.

## Client re-skins
Each client is one entry in `src/brand/presets.js`: name, intro text, accent colour, zone names and
taglines, booking button labels and URLs, and the text the drones spell. Open with `?brand=<key>`,
for example `?brand=oasis` (a fictional sample resort). Booking buttons with no URL show a short note
explaining where the client's booking page would open.

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
- Hotel interiors are the lobby and one suite only. TV mode is not yet tested on a real smart TV;
  use a recent Android TV / Fire TV browser or a mini PC.
