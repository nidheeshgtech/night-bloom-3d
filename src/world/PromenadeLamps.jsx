import { useMemo } from 'react'
import * as THREE from 'three'
import { heightAt } from './terrain'
import { PROMENADE, ZONES } from './plan'
import { bulbMat, metalMat } from '../zone/materials'

// Lamps around the outer edge of the promenade. Emissive heads only (no real lights), so
// the lake ring reads at night without adding per-pixel lighting cost.
const COUNT = 36

// Lamp angles around the ring, keeping spoke mouths clear.
export const LAMP_ANGLES = Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2 + Math.PI / COUNT).filter(
  (a) => !ZONES.some((z) => Math.abs(Math.atan2(Math.sin(a - z.a), Math.cos(a - z.a))) < 0.06),
)

export default function PromenadeLamps() {
  const { posts, heads } = useMemo(() => {
    const r = PROMENADE.radius + PROMENADE.half + 0.6
    const posts = []
    const heads = []
    for (const a of LAMP_ANGLES) {
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const y = heightAt(x, z)
      posts.push(new THREE.Matrix4().makeTranslation(x, y + 1.6, z))
      heads.push(new THREE.Matrix4().makeTranslation(x, y + 3.18, z))
    }
    const make = (geo, mat, list, shadow) => {
      const m = new THREE.InstancedMesh(geo, mat, list.length)
      list.forEach((mat4, i) => m.setMatrixAt(i, mat4))
      m.castShadow = shadow
      m.computeBoundingSphere()
      return m
    }
    return {
      posts: make(new THREE.CylinderGeometry(0.035, 0.055, 3.2, 8), metalMat, posts, true),
      heads: make(new THREE.CylinderGeometry(0.12, 0.09, 0.36, 6), bulbMat, heads, false),
    }
  }, [])
  return (
    <>
      <primitive object={posts} />
      <primitive object={heads} />
    </>
  )
}
