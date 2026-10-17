// The active scene's config (terrain, bounds, inspectables, pickable flowers, camera presets).
// Shared systems (camera rig, picking, HUD) read from here so several scenes can reuse them.
let current = null

export const setWorld = (world) => {
  current = world
}

export const getWorld = () => current
