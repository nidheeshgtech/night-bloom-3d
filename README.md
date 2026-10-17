# Night Bloom

An interactive WebGL botanical world, built with React Three Fiber and Three.js.

Six themed gardens are arranged like the petals of a flower around a central lake, in a desert
setting with a city skyline beyond. Fly over it, walk through it Street View-style, switch from day
to night, and watch a drone light show over the lake.

Original concept. Not affiliated with any existing attraction.

## Features

- **Aerial and walking views:** orbit the world, fly to any garden, then walk at eye level
  (double-click or tap to move, drag to look, floor arrows along paths, WASD).
- **Procedural botany:** petunias, marigolds, African daisies, hibiscus, lantana and more, modelled
  in code with petals, leaves and stems; tens of thousands of instanced plants with distance LOD.
- **Wingsong Conservatory:** a leaf-shaped glasshouse with hundreds of animated butterflies that
  fly to flowers, feed and roost; click to identify species.
- **Herbarium Walk:** a chahar bagh (four-part garden) with raised water channels, a fountain,
  fruit trees, a domed pavilion and labelled plant specimens.
- **Lantern Shore:** light installations that respond to visitors.
- **Day / night:** a painted night light map gives coloured light pools across the world for the
  cost of one texture lookup; lit city ring, glowing zone outlines, the Lotus Crown centrepiece.
- **Light show:** ~1,100 GPU drones flying formations, plus a fireworks finale.
- **Client re-skins:** one config entry (`src/brand/presets.js`) rebrands names, colours, zone
  copy, booking buttons and the drone text. Try `?brand=oasis`.

## Demos

- `/` showcase · `/garden` botanical world · `/festival` event venue map · `/resort` resort tour

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run phone     # dev server on your local network for phone testing
```

Add `?debug` to the URL (or press the backtick key) for fps, draw calls and triangle counts.
See `DEMO.md` for a presenter guide.

## Tech

React 19, React Three Fiber, Drei, Three.js, GSAP, Zustand, postprocessing (N8AO, bloom, SMAA),
Vite. Custom GLSL throughout (wind, wings, water, light map, drones).

## Assets

External textures and the sky HDRI are CC0 from Poly Haven. Everything else (plants, buildings,
patterns, sound) is generated in code. See `LICENSES.md`.
