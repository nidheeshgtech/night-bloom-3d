import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { QUAY_RADIUS, WATER_LEVEL, heightAt } from './terrain'
import { pbrSet, zoneUniforms } from '../zone/materials'

// Tileable ripple normal map from integer-frequency sine waves.
export function rippleTexture() {
  const N = 256
  const h = new Float32Array(N * N)
  const waves = [
    [3, 1, 0.0],
    [-2, 4, 1.3],
    [5, -3, 2.1],
    [1, 6, 0.7],
    [-7, 2, 2.9],
    [9, 5, 1.1],
  ]
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let v = 0
      waves.forEach(([kx, ky, ph], i) => (v += Math.sin(((kx * x + ky * y) / N) * Math.PI * 2 + ph) / (i + 1)))
      h[y * N + x] = v
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = N
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(N, N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x + N - 1) % N)]
      const dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x]
      const n = new THREE.Vector3(-dx, -dy, 2).normalize()
      const i = (y * N + x) * 4
      img.data[i] = (n.x * 0.5 + 0.5) * 255
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(36, 36)
  return t
}

// Inward-facing sandstone quay wall from below the waterline up to the promenade.
function quayGeometry() {
  const SEG = 240
  const bottom = -2.8
  const pos = []
  const uv = []
  const idx = []
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2
    const x = Math.cos(a) * QUAY_RADIUS
    const z = Math.sin(a) * QUAY_RADIUS
    const top = heightAt(Math.cos(a) * (QUAY_RADIUS + 0.3), Math.sin(a) * (QUAY_RADIUS + 0.3)) + 0.04
    const u = (a * QUAY_RADIUS) / 1.5
    pos.push(x, bottom, z, x, top, z)
    uv.push(u, 0, u, (top - bottom) / 1.5)
    if (i > 0) {
      const k = (i - 1) * 2
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export default function Lake() {
  const { water, wall, ripple } = useMemo(() => {
    const ripple = rippleTexture()
    const water = new THREE.MeshStandardMaterial({
      color: '#0d3540',
      roughness: 0.04,
      metalness: 0.15,
      normalMap: ripple,
      normalScale: new THREE.Vector2(0.25, 0.25),
      envMapIntensity: 1.4,
    })
    water.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = zoneUniforms.uTime
      // Two ripple layers at unrelated scales and directions hide the tile repeat; colour
      // shifts from deep teal face-on to sky-tinted at grazing angles.
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <normal_fragment_maps>',
          `vec3 n1 = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(normalMap, vNormalMapUv * 0.37 + vec2(uTime * -0.0031, uTime * 0.0047)).xyz * 2.0 - 1.0;
          vec3 mapN = normalize(vec3((n1.xy + n2.xy) * normalScale, n1.z * n2.z));
          normal = normalize(tbn * mapN);`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float facing = abs(dot(normalize(vViewPosition), vec3(0.0, 0.0, 1.0)));
          diffuseColor.rgb = mix(vec3(0.16, 0.3, 0.34), diffuseColor.rgb, smoothstep(0.1, 0.6, facing));`,
        )
    }
    const t = pbrSet('white_sandstone_bricks', 1)
    const wall = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.arm, roughness: 1, color: '#d9cdb9', side: THREE.DoubleSide })
    return { water, wall, ripple }
  }, [])
  const quay = useMemo(quayGeometry, [])

  useFrame((_, dt) => {
    ripple.offset.x += dt * 0.004
    ripple.offset.y += dt * 0.0025
  })

  return (
    <>
      <mesh material={water} position-y={WATER_LEVEL} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[QUAY_RADIUS + 0.05, 128]} />
      </mesh>
      <mesh geometry={quay} material={wall} receiveShadow />
      <ShoreRing />
    </>
  )
}

// Soft, slowly breathing band of light water where the lake meets the quay.
function ShoreRing() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: zoneUniforms.uTime, uNight: zoneUniforms.uNight },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uTime;
          uniform float uNight;
          varying vec2 vUv;
          void main() {
            float edge = smoothstep(0.0, 1.0, vUv.y);
            float wave = 0.6 + 0.4 * sin(vUv.x * 900.0 + uTime * 0.8) * sin(vUv.x * 230.0 - uTime * 0.5);
            float a = pow(edge, 3.0) * wave * 0.35 * (1.0 - uNight * 0.7);
            gl_FragColor = vec4(vec3(0.85, 0.95, 0.95), a);
          }`,
      }),
    [],
  )
  // Ring UVs: x around, y from inner (0) to the wall (1).
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(QUAY_RADIUS - 1.6, QUAY_RADIUS, 256, 1)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      uv.setXY(i, (Math.atan2(y, x) / (Math.PI * 2)) + 0.5, (Math.hypot(x, y) - (QUAY_RADIUS - 1.6)) / 1.6)
    }
    return g
  }, [])
  return <mesh geometry={geometry} material={material} position-y={WATER_LEVEL + 0.01} rotation-x={-Math.PI / 2} renderOrder={2} />
}
