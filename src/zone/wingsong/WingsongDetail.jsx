import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import PavedPath from '../Path'
import Instances from '../Instances'
import Palms from '../Palms'
import LodInstances from '../LodInstances'
import Butterflies from './Butterflies'
import { getLibrary } from '../library'
import { getWingsongLibrary } from './library'
import { PALMS_IN, conservatoryBeds } from './planting'
import { PATH_HALF_IN, POND, STREAM_HALF, innerPath, stream, toWorld } from './layout'
import { heightAt } from '../../world/terrain'
import { rippleTexture } from '../../world/Lake'
import { pbrSet, zoneUniforms } from '../materials'
import { withNightLight } from '../nightlight'
import { useGarden } from '../../lib/store'

const LIFT = 0.03

function streamGeometry() {
  const pos = []
  const uv = []
  const idx = []
  const samples = stream.lut.filter((_, i) => i % 2 === 0)
  samples.forEach((p, i) => {
    const w = STREAM_HALF * (0.85 + 0.3 * Math.sin(p.s * 1.3))
    for (let j = 0; j <= 2; j++) {
      const d = -w + j * w
      const x = p.x + p.nx * d
      const z = p.z + p.nz * d
      pos.push(x, heightAt(x, z) + LIFT, z)
      uv.push(d, p.s)
    }
    if (i > 0) {
      const k = (i - 1) * 3
      for (let j = 0; j < 2; j++) idx.push(k + j, k + j + 1, k + j + 3, k + j + 1, k + j + 4, k + j + 3)
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// Shallow running water: ripple normals scrolling downstream.
function Water() {
  const { mat, tex } = useMemo(() => {
    const tex = rippleTexture()
    tex.repeat.set(1.2, 1.2)
    const mat = new THREE.MeshStandardMaterial({ color: '#1d4a4e', emissive: '#1f9fc0', emissiveIntensity: 0, roughness: 0.04, normalMap: tex, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.3 })
    return { mat, tex }
  }, [])
  const geo = useMemo(streamGeometry, [])
  const pond = toWorld(POND.a, POND.l)
  useFrame((_, dt) => {
    tex.offset.y -= dt * 0.3
    mat.emissiveIntensity = zoneUniforms.uNight.value * 0.5
  })
  return (
    <>
      <mesh geometry={geo} material={mat} receiveShadow />
      <mesh material={mat} position={[pond.x, pond.y + LIFT, pond.z]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[POND.r, 48]} />
      </mesh>
    </>
  )
}

function Rocks() {
  const w = getWingsongLibrary()
  const mat = useMemo(() => {
    const t = pbrSet('mossy_rock', 1)
    return withNightLight(new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, aoMap: t.arm, roughness: 1 }))
  }, [])
  const lists = useMemo(() => [0, 1, 2].map((k) => w.items.rock.filter((r) => r.variant === k).map((r) => r.matrix)), [w])
  return w.rock.map((g, k) => <Instances key={k} geometry={g} matrices={lists[k]} material={mat} />)
}

const byVariant = (items, k) => items.filter((it) => it.variant === k).map((it) => it.matrix)

export default function WingsongDetail() {
  const w = getWingsongLibrary()
  const lib = getLibrary()
  const high = useGarden((s) => s.quality === 'high')
  const bedProps = { near: high ? 7 : 4, far: high ? 45 : 28, shadow: 'none' }
  const palms = useMemo(() => PALMS_IN.map((pos, i) => ({ pos, h: 6 + i * 0.6 })), [])
  return (
    <>
      <PavedPath path={innerPath} half={PATH_HALF_IN} seed={44} />
      <Water />
      <Rocks />
      {w.hibiscus.map((h, k) => (
        <Instances key={`h${k}`} geometry={h.geometry} matrices={byVariant(w.items.hibiscus, k)} />
      ))}
      {w.lantana.map((l, k) => (
        <Instances key={`l${k}`} geometry={l.geometry} matrices={byVariant(w.items.lantana, k)} />
      ))}
      <Instances geometry={w.bougainvillea} matrices={byVariant(w.items.bougainvillea, 0)} />
      {w.alocasia.map((g, k) => (
        <Instances key={`a${k}`} geometry={g} matrices={byVariant(w.items.alocasia, k)} />
      ))}
      {w.fern.map((g, k) => (
        <Instances key={`f${k}`} geometry={g} matrices={byVariant(w.items.fern, k)} castShadow={false} />
      ))}
      <Palms items={palms} />
      <LodInstances variants={lib.petunia} items={conservatoryBeds.petunia} {...bedProps} />
      <LodInstances variants={lib.daisy} items={conservatoryBeds.daisy} {...bedProps} />
      <Butterflies />
    </>
  )
}
