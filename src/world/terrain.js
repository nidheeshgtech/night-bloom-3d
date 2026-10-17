// Global terrain for the Night Bloom world: gentle undulation, a central lake basin, a
// rainforest hill to the north, and a levelled plot for the formal Herbarium garden.
// TERRAIN_GLSL must stay identical to heightAt.
export const WATER_LEVEL = -0.55
export const QUAY_RADIUS = 48.5
const HILL = { x: 0, z: -112, h: 8, r: 30 }

// Levelled rectangle in the Herbarium petal: q along the petal axis, w across it.
const FLAT = { ang: Math.PI / 6, r0: 61, r1: 137, half: 25, soft: 5 }
const FC = Math.cos(FLAT.ang)
const FS = Math.sin(FLAT.ang)

const smoothstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const base = (x, z) => 0.22 * Math.sin(x * 0.08) * Math.cos(z * 0.07) + 0.12 * Math.sin((x + z) * 0.13)
export const FLAT_H = base(FC * 100, FS * 100)

export function heightAt(x, z) {
  const basin = -2.6 * (1 - smoothstep(46.5, 48.6, Math.hypot(x, z)))
  const dx = x - HILL.x
  const dz = z - HILL.z
  const hill = HILL.h * Math.exp(-(dx * dx + dz * dz) / (2 * HILL.r * HILL.r))
  const h = base(x, z) + basin + hill
  const q = x * FC + z * FS
  const w = -x * FS + z * FC
  const e = Math.max(FLAT.r0 - q, q - FLAT.r1, Math.abs(w) - FLAT.half)
  const f = 1 - smoothstep(0, FLAT.soft, e)
  return h + (FLAT_H - h) * f
}

const n = (v) => v.toFixed(6)
export const TERRAIN_GLSL = /* glsl */ `
float terrain(vec2 p) {
  float base = 0.22 * sin(p.x * 0.08) * cos(p.y * 0.07) + 0.12 * sin((p.x + p.y) * 0.13);
  float basin = -2.6 * (1.0 - smoothstep(46.5, 48.6, length(p)));
  vec2 d = p - vec2(${HILL.x.toFixed(1)}, ${HILL.z.toFixed(1)});
  float hill = ${HILL.h.toFixed(1)} * exp(-dot(d, d) / ${(2 * HILL.r * HILL.r).toFixed(1)});
  float h = base + basin + hill;
  float q = dot(p, vec2(${n(FC)}, ${n(FS)}));
  float w = dot(p, vec2(${n(-FS)}, ${n(FC)}));
  float e = max(max(${n(FLAT.r0)} - q, q - ${n(FLAT.r1)}), abs(w) - ${n(FLAT.half)});
  float f = 1.0 - smoothstep(0.0, ${n(FLAT.soft)}, e);
  return mix(h, ${n(FLAT_H)}, f);
}`
