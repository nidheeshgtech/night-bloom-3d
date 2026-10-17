import { useMemo } from 'react'
import * as THREE from 'three'
import { heightAt, pathDistance, PATH_HALF_WIDTH } from '../lib/terrain'

const SIZE = 170
const SEGMENTS = 160

export default function Terrain() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const grass = new THREE.Color('#5f8f3c')
    const grassDark = new THREE.Color('#3f6b2b')
    const path = new THREE.Color('#d9b98a')
    const rock = new THREE.Color('#6b5a48')
    const c = new THREE.Color()

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = heightAt(x, z)
      pos.setY(i, h)

      const n = 0.5 + 0.5 * Math.sin(x * 0.4) * Math.cos(z * 0.35)
      c.copy(grass).lerp(grassDark, n)
      if (h < -1.5) c.lerp(rock, Math.min(1, (-h - 1.5) / 3))
      const pd = pathDistance(x, z)
      if (pd < PATH_HALF_WIDTH) c.lerp(path, 1 - pd / PATH_HALF_WIDTH + 0.3)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} flatShading={false} />
    </mesh>
  )
}
