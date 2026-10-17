import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ZONES, spokes } from './plan'
import { latticeTexture } from './patterns'
import { pavilionGlowMat, pbrSet, woodMat } from '../zone/materials'

// Barjeel (wind-tower) pavilions flanking every zone gate: an original design in the
// regional vernacular — sandstone body, slotted tower with mashrabiya screens, timber poles.
export const PAVILIONS = ZONES.flatMap((z, i) => {
  const path = spokes[i]
  const bloom = z.id === 'bloom'
  const s = path.length - (bloom ? 3 : 1.5)
  const d = bloom ? 6.2 : 5.1
  const f = path.frameAt(s)
  const yaw = Math.atan2(f.tx, f.tz)
  return [-1, 1].map((side) => ({ pos: path.toWorld(s, side * d), yaw }))
})

const box = (w, h, d, x, y, z) => {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed()
  g.translate(x, y, z)
  return g
}

// Stone UVs projected by face orientation, 1.5 m per texture tile.
function stoneUV(g, scale = 1.5) {
  const p = g.attributes.position
  const n = g.attributes.normal
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i))
    const ay = Math.abs(n.getY(i))
    const az = Math.abs(n.getZ(i))
    const [u, v] = ay > ax && ay > az ? [p.getX(i), p.getZ(i)] : ax > az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)]
    g.attributes.uv.setXY(i, u / scale, v / scale)
  }
  return g
}

const FACES = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
]

function pavilionParts() {
  const stone = []
  const glow = []
  const wood = []
  const screens = []
  stone.push(box(3.0, 0.3, 3.0, 0, 0.15, 0)) // plinth
  stone.push(box(2.6, 3.0, 2.6, 0, 1.8, 0)) // body
  stone.push(box(2.8, 0.2, 2.8, 0, 3.4, 0)) // cornice
  stone.push(box(2.15, 0.15, 2.15, 0, 3.58, 0)) // slot sill
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) stone.push(box(0.35, 3.4, 0.35, sx * 0.85, 5.2, sz * 0.85))
  stone.push(box(2.3, 0.25, 2.3, 0, 7.0, 0)) // cap
  for (const [fx, fz] of FACES) {
    // Door niche (glows at night) with a stone hood.
    glow.push(fx ? box(0.06, 2.0, 1.0, fx * 1.31, 1.35, 0) : box(1.0, 2.0, 0.06, 0, 1.35, fz * 1.31))
    stone.push(fx ? box(0.14, 0.18, 1.3, fx * 1.33, 2.45, 0) : box(1.3, 0.18, 0.14, 0, 2.45, fz * 1.33))
    // Piers dividing each tower face into three slots.
    for (const o of [-0.28, 0.28]) stone.push(fx ? box(0.12, 3.4, 0.12, fx * 0.95, 5.2, o) : box(0.12, 3.4, 0.12, o, 5.2, fz * 0.95))
    // Crenellations along the roof edge.
    for (const t of [-0.9, -0.45, 0, 0.45, 0.9]) stone.push(fx ? box(0.22, 0.35, 0.22, fx * 1.04, 7.3, t) : box(0.22, 0.35, 0.22, t, 7.3, fz * 1.04))
    // Mashrabiya screen across the slots.
    const scr = new THREE.PlaneGeometry(1.35, 3.0)
    const uv = scr.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 5)
    scr.rotateY(Math.atan2(fx, fz))
    scr.translate(fx * 0.9, 5.2, fz * 0.9)
    screens.push(scr.toNonIndexed())
  }
  glow.push(box(1.7, 3.3, 1.7, 0, 5.2, 0)) // tower interior
  // Danchal: timber poles projecting through the tower.
  for (const [y, alongX] of [[4.3, true], [6.2, false]]) {
    const pole = new THREE.CylinderGeometry(0.05, 0.05, 2.7, 6).toNonIndexed()
    pole.rotateZ(Math.PI / 2)
    if (!alongX) pole.rotateY(Math.PI / 2)
    pole.translate(0, y, 0)
    wood.push(pole)
  }
  return {
    stone: stoneUV(mergeGeometries(stone)),
    glow: mergeGeometries(glow),
    wood: mergeGeometries(wood),
    screens: mergeGeometries(screens),
  }
}

export default function Pavilions() {
  const meshes = useMemo(() => {
    const parts = pavilionParts()
    const t = pbrSet('white_sandstone_bricks', 1)
    const stoneMat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, roughness: 1, color: '#efe2cc' })
    const screenMat = new THREE.MeshStandardMaterial({ map: latticeTexture(), alphaTest: 0.5, side: THREE.DoubleSide, color: '#3e2716', roughness: 0.75 })
    const matrices = PAVILIONS.map((p) => new THREE.Matrix4().compose(p.pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw), new THREE.Vector3(1, 1, 1)))
    return [
      [parts.stone, stoneMat, true],
      [parts.glow, pavilionGlowMat, false],
      [parts.wood, woodMat, true],
      [parts.screens, screenMat, true],
    ].map(([geo, mat, shadow]) => {
      const m = new THREE.InstancedMesh(geo, mat, matrices.length)
      matrices.forEach((x, i) => m.setMatrixAt(i, x))
      m.castShadow = shadow
      m.receiveShadow = true
      m.computeBoundingSphere()
      return m
    })
  }, [])
  return meshes.map((m, i) => <primitive key={i} object={m} />)
}
