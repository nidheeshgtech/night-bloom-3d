import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import PavedPath from '../Path'
import { rosetteMaterial } from '../../world/patterns'
import { useGarden } from '../../lib/store'
import { LANTERN_PATH_HALF, PLAZA, lanternPath, plazaCenter, reedPositions, LANTERNS } from './layout'
import { reedGeometry } from './geometry'
import { lightArtMaterial } from './lightMaterial'
import { bulbMat, metalMat, zoneUniforms } from '../materials'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const REEDS = { high: 2200, low: 900 }
const REED_COLORS = ['#7fe8ff', '#9ab8ff', '#c79bff', '#7fffd4']

function Plaza() {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(0, PLAZA.r, 64, 8)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const c = plazaCenter()
  return <mesh geometry={geo} material={rosetteMaterial()} position={[c.x, c.y + 0.04, c.z]} receiveShadow />
}

function Reeds() {
  const quality = useGarden((s) => s.quality)
  const mesh = useMemo(() => {
    const items = reedPositions(REEDS[quality])
    const m = new THREE.InstancedMesh(reedGeometry(), lightArtMaterial({ proximity: true, sway: true, rim: false, strength: 2.2 }), items.length)
    items.forEach((r, i) => {
      m.setMatrixAt(i, new THREE.Matrix4().compose(r.pos, new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r.hue * 6.28), V(1, r.h, 1)))
      m.setColorAt(i, new THREE.Color(REED_COLORS[Math.floor(r.hue * REED_COLORS.length)]))
    })
    m.computeBoundingSphere()
    return m
  }, [quality])
  return <primitive object={mesh} />
}

// Low bollards along the path with glowing caps.
function Bollards() {
  const { posts, caps } = useMemo(() => {
    const posts = []
    const caps = []
    for (let s = 3; s < lanternPath.length - 1; s += 6) {
      for (const side of [-1, 1]) {
        const p = lanternPath.toWorld(s + (side > 0 ? 3 : 0), side * (LANTERN_PATH_HALF + 0.45))
        posts.push(new THREE.Matrix4().makeTranslation(p.x, p.y + 0.4, p.z))
        caps.push(new THREE.Matrix4().makeTranslation(p.x, p.y + 0.84, p.z))
      }
    }
    const make = (geo, mat, list) => {
      const m = new THREE.InstancedMesh(geo, mat, list.length)
      list.forEach((x, i) => m.setMatrixAt(i, x))
      m.computeBoundingSphere()
      return m
    }
    return { posts: make(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 8), metalMat, posts), caps: make(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 8), bulbMat, caps) }
  }, [])
  return (
    <>
      <primitive object={posts} />
      <primitive object={caps} />
    </>
  )
}

// Two coloured fills so the grove lights the ground around it at night.
function GroveLights() {
  const refs = [useRef(), useRef()]
  const spots = useMemo(() => {
    const mid = LANTERNS[Math.floor(LANTERNS.length / 3)].pos
    return [mid.clone().add(V(0, 3, 0)), plazaCenter().add(V(0, 4, 0))]
  }, [])
  useFrame(() => refs.forEach((r) => r.current && (r.current.intensity = zoneUniforms.uNight.value * 14)))
  return spots.map((p, i) => <pointLight key={i} ref={refs[i]} position={p} color={i ? '#ffd9a0' : '#8fd8ff'} intensity={0} distance={22} decay={2} />)
}

export default function LanternDetail() {
  return (
    <>
      <PavedPath path={lanternPath} half={LANTERN_PATH_HALF} seed={61} />
      <Plaza />
      <Reeds />
      <Bollards />
      <GroveLights />
    </>
  )
}
