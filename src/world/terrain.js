// Global terrain for the Night Bloom world: gentle undulation, a central lake basin and a
// rainforest hill to the north. TERRAIN_GLSL must stay identical to heightAt.
export const WATER_LEVEL = -0.55
export const QUAY_RADIUS = 48.5
const HILL = { x: 0, z: -112, h: 8, r: 30 }

const smoothstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function heightAt(x, z) {
  const base = 0.22 * Math.sin(x * 0.08) * Math.cos(z * 0.07) + 0.12 * Math.sin((x + z) * 0.13)
  const basin = -2.6 * (1 - smoothstep(46.5, 48.6, Math.hypot(x, z)))
  const dx = x - HILL.x
  const dz = z - HILL.z
  const hill = HILL.h * Math.exp(-(dx * dx + dz * dz) / (2 * HILL.r * HILL.r))
  return base + basin + hill
}

export const TERRAIN_GLSL = /* glsl */ `
float terrain(vec2 p) {
  float base = 0.22 * sin(p.x * 0.08) * cos(p.y * 0.07) + 0.12 * sin((p.x + p.y) * 0.13);
  float basin = -2.6 * (1.0 - smoothstep(46.5, 48.6, length(p)));
  vec2 d = p - vec2(${HILL.x.toFixed(1)}, ${HILL.z.toFixed(1)});
  float hill = ${HILL.h.toFixed(1)} * exp(-dot(d, d) / ${(2 * HILL.r * HILL.r).toFixed(1)});
  return base + basin + hill;
}`
