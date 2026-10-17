import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import PavedPath from '../zone/Path'
import { heightAt } from './terrain'
import { ZONES } from './plan'
import { rosetteMaterial } from './patterns'
import { PROMENADE, SPOKE_HALF, promenade, spokes } from './plan'

// Outer-kerb gaps where each spoke meets the promenade ring.
const spokeAngles = spokes.map((p) => Math.atan2(p.lut[0].z, p.lut[0].x))
const gapHalf = (SPOKE_HALF + 0.3) / (PROMENADE.radius + PROMENADE.half)
const skipRing = (side, s) => {
  if (side !== -1) return false // +d points into the lake; -1 is the outer edge
  const a = (s / promenade.length) * Math.PI * 2
  return spokeAngles.some((sa) => Math.abs(Math.atan2(Math.sin(a - sa), Math.cos(a - sa))) < gapHalf)
}
const skipSpokeStart = (_, s) => s < 0.3

// Star rosettes inlaid in the promenade where each zone's spoke begins.
function Medallions() {
  const geometry = useMemo(() => {
    const parts = ZONES.map((z) => {
      const g = new THREE.RingGeometry(0, 3.2, 48, 6)
      g.rotateX(-Math.PI / 2)
      g.translate(Math.cos(z.a) * PROMENADE.radius, 0, Math.sin(z.a) * PROMENADE.radius)
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)) + 0.05)
      return g
    })
    const g = mergeGeometries(parts)
    g.computeVertexNormals()
    return g
  }, [])
  return <mesh geometry={geometry} material={rosetteMaterial()} receiveShadow />
}

export default function WorldPaths() {
  return (
    <>
      <Medallions />
      <PavedPath path={promenade} half={PROMENADE.half} skipKerb={skipRing} seed={3} />
      {spokes.map((p, i) => (
        <PavedPath key={i} path={p} half={SPOKE_HALF} skipKerb={skipSpokeStart} seed={20 + i} />
      ))}
    </>
  )
}
