import { useMemo } from 'react'
import * as THREE from 'three'
import Fanous from '../zone/Fanous'
import { heightAt } from './terrain'
import { GAP_ANGLES, PROMENADE, ZONES } from './plan'

const COUNT = 36

// Lamp angles around the ring, keeping spoke mouths clear.
export const LAMP_ANGLES = Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2 + Math.PI / COUNT).filter(
  (a) => {
    const near = (b, w) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < w
    // Keep clear of spoke mouths and of the promenade palms (zone ±0.11 rad and gaps).
    return !ZONES.some((z) => near(z.a, 0.06) || near(z.a - 0.11, 0.04) || near(z.a + 0.11, 0.04)) && !GAP_ANGLES.some((g) => near(g, 0.04))
  },
)

// Fanous lanterns around the outer edge of the promenade. Emissive only (no real lights),
// so the lake ring reads at night without adding per-pixel lighting cost.
export default function PromenadeLamps() {
  const positions = useMemo(() => {
    const r = PROMENADE.radius + PROMENADE.half + 0.6
    return LAMP_ANGLES.map((a) => {
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      return new THREE.Vector3(x, heightAt(x, z), z)
    })
  }, [])
  return <Fanous positions={positions} />
}
