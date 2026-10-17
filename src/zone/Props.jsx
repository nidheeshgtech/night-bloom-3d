import { useMemo } from 'react'
import * as THREE from 'three'
import { pathToWorld } from './layout'
import { BENCH, lamps, pots } from './planting'
import { metalMat, terracottaMat, woodMat } from './materials'
import Fanous from './Fanous'

const POT_PROFILE = [
  [0, 0],
  [0.19, 0],
  [0.21, 0.04],
  [0.3, 0.48],
  [0.335, 0.5],
  [0.34, 0.58],
  [0.3, 0.58],
  [0.29, 0.52],
].map(([x, y]) => new THREE.Vector2(x, y))

function Pots() {
  const geo = useMemo(() => new THREE.LatheGeometry(POT_PROFILE, 28), [])
  return pots.map((p, i) => {
    const pos = pathToWorld(p.s, p.d)
    return <mesh key={i} geometry={geo} material={terracottaMat} position={pos} castShadow receiveShadow />
  })
}

// Fanous lamp posts along the avenue.
function Lamps() {
  const positions = useMemo(() => lamps.map((l) => pathToWorld(l.s, l.d)), [])
  return <Fanous positions={positions} />
}

// Park bench: hardwood slats on cast-metal side frames, facing the path.
function Bench() {
  const pos = pathToWorld(BENCH.s, BENCH.d)
  const ahead = pathToWorld(BENCH.s, 0)
  const yaw = Math.atan2(ahead.x - pos.x, ahead.z - pos.z)
  const sideShape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.28, 0)
    s.lineTo(-0.22, 0)
    s.lineTo(-0.2, 0.42)
    s.lineTo(0.18, 0.42)
    s.lineTo(0.24, 0)
    s.lineTo(0.3, 0)
    s.lineTo(0.24, 0.46)
    s.quadraticCurveTo(0.3, 0.62, 0.22, 0.66)
    s.lineTo(-0.2, 0.46)
    s.quadraticCurveTo(-0.32, 0.9, -0.3, 0.86)
    s.lineTo(-0.34, 0.86)
    s.quadraticCurveTo(-0.3, 0.5, -0.28, 0)
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false })
  }, [])
  return (
    <group position={pos} rotation-y={yaw}>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} geometry={sideShape} material={metalMat} position={[x - 0.02, 0, 0]} rotation-y={-Math.PI / 2} castShadow />
      ))}
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} material={woodMat} position={[0, 0.45, -0.18 + k * 0.12]} castShadow receiveShadow>
          <boxGeometry args={[1.7, 0.035, 0.09]} />
        </mesh>
      ))}
      {[0, 1, 2].map((k) => (
        <mesh key={k} material={woodMat} position={[0, 0.58 + k * 0.11, -0.25 - k * 0.025]} rotation-x={-0.22} castShadow>
          <boxGeometry args={[1.7, 0.085, 0.03]} />
        </mesh>
      ))}
    </group>
  )
}

export default function Props() {
  return (
    <>
      <Pots />
      <Lamps />
      <Bench />
    </>
  )
}
