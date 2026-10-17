import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  heightAt,
  pathDistance,
  ISLAND_RADIUS,
  PATH_HALF_WIDTH,
} from '../lib/terrain'

const COUNT = 20000
const PALETTE = [
  '#ff4f7b', // rose
  '#ffb02e', // marigold
  '#b45cff', // violet
  '#ffffff', // white
  '#ff7a3d', // coral
  '#4fc3ff', // sky
]

// Stem + open bloom merged into one geometry. aPart: 0 = stem, 1 = bloom.
function buildGeometry() {
  const stem = new THREE.CylinderGeometry(0.012, 0.02, 0.55, 4, 5)
  stem.translate(0, 0.275, 0)
  const bloom = new THREE.CylinderGeometry(0.17, 0.03, 0.1, 9, 1, true)
  bloom.translate(0, 0.58, 0)
  const core = new THREE.CircleGeometry(0.05, 8)
  core.rotateX(-Math.PI / 2)
  core.translate(0, 0.62, 0)

  for (const [g, part] of [
    [stem, 0],
    [bloom, 1],
    [core, 2],
  ]) {
    g.setAttribute(
      'aPart',
      new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(part), 1),
    )
  }
  return mergeGeometries([stem, bloom, core])
}

export default function Flowers() {
  const meshRef = useRef()
  const shaderRef = useRef()

  const geometry = useMemo(() => {
    const g = buildGeometry()
    const tint = new Float32Array(COUNT * 3)
    const matrices = []
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    let placed = 0
    let guard = 0

    // Species patches: pick palette index by low-frequency field -> blobs of colour.
    while (placed < COUNT && guard++ < COUNT * 20) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * (ISLAND_RADIUS - 4)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (pathDistance(x, z) < PATH_HALF_WIDTH + 0.4) continue

      const field = Math.sin(x * 0.09 + 1.3) + Math.cos(z * 0.11) + Math.sin((x + z) * 0.05)
      const idx = Math.abs(Math.floor((field + 3) * 1.2)) % PALETTE.length
      color.set(PALETTE[idx]).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.12)

      dummy.position.set(x, heightAt(x, z), z)
      dummy.rotation.y = Math.random() * Math.PI * 2
      const s = 0.8 + Math.random() * 0.9
      dummy.scale.set(s, s * (0.8 + Math.random() * 0.6), s)
      dummy.updateMatrix()
      matrices.push(dummy.matrix.clone())
      tint.set([color.r, color.g, color.b], placed * 3)
      placed++
    }
    g.userData.matrices = matrices
    g.userData.count = placed
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3))
    return g
  }, [])

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      roughness: 0.65,
    })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shaderRef.current = shader
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute vec3 aTint;
          attribute float aPart;
          uniform float uTime;
          varying vec3 vTint;
          varying float vPart;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vTint = aTint;
          vPart = aPart;
          vec3 ip = instanceMatrix[3].xyz;
          float h = clamp(position.y / 0.65, 0.0, 1.0);
          float phase = ip.x * 0.35 + ip.z * 0.27;
          float gust = sin(uTime * 1.3 + phase) + 0.5 * sin(uTime * 2.7 + phase * 1.7);
          transformed.x += gust * 0.07 * h * h;
          transformed.z += cos(uTime * 1.1 + phase) * 0.05 * h * h;`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vTint;
          varying float vPart;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec3 stemCol = vec3(0.16, 0.42, 0.16);
          vec3 coreCol = vec3(0.95, 0.8, 0.2);
          vec3 base = vPart < 0.5 ? stemCol : (vPart < 1.5 ? vTint : coreCol);
          diffuseColor.rgb *= base;`,
        )
    }
    return m
  }, [])

  // Matrices are written once the mesh exists.
  const setRef = (mesh) => {
    if (!mesh || meshRef.current === mesh) return
    meshRef.current = mesh
    const { matrices } = geometry.userData
    matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat))
    mesh.count = geometry.userData.count
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }

  useFrame(({ clock }) => {
    if (shaderRef.current) shaderRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  return <instancedMesh ref={setRef} args={[geometry, material, COUNT]} frustumCulled={false} />
}
