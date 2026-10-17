// Shared height + path functions so terrain mesh and flowers agree.
export const ISLAND_RADIUS = 62
export const PATH_RADIUS = 22
export const PATH_HALF_WIDTH = 2.2

export function pathDistance(x, z) {
  return Math.abs(Math.hypot(x, z) - PATH_RADIUS)
}

export function smoothstep(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function heightAt(x, z) {
  const r = Math.hypot(x, z)
  const hills =
    Math.sin(x * 0.07) * Math.cos(z * 0.06) * 1.6 +
    Math.sin(x * 0.17 + z * 0.13) * 0.5 +
    Math.cos(z * 0.23 - x * 0.11) * 0.25
  const edge =
    smoothstep(ISLAND_RADIUS - 6, ISLAND_RADIUS + 4, r) * 10 +
    smoothstep(ISLAND_RADIUS + 2, ISLAND_RADIUS + 20, r) * 40
  return hills - edge
}
