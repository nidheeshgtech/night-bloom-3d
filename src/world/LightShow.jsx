import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGarden } from '../lib/store'
import { audio } from '../lib/audio'
import { BRAND } from '../brand'
import { zoneUniforms } from '../zone/materials'
import { DRONES, SHOW_Y, buildFireworks, buildFormations } from './showFormations'
import { WATER_LEVEL } from './terrain'

const MORPH = 3.2 // seconds to fly between formations
const SEG = 7 // seconds per formation (morph + hold)
const FW_START = 38 // fireworks finale starts while the last formation holds
const LAND_AT = 51
const END = 56

// Shared with the lake so the water picks up the show's glow.
export const showState = { glow: 0 }

const ROTATE = /* glsl */ `
  vec3 faceRotate(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  }`

function droneMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec3 aFrom;
      attribute vec3 aTo;
      attribute vec3 aColFrom;
      attribute vec3 aColTo;
      attribute float aSeed;
      uniform float uMix;
      uniform float uFace;
      uniform float uTime;
      varying vec3 vCol;
      varying float vTw;
      ${ROTATE}
      void main() {
        // Staggered, eased flight with a gentle sideways arc between formations.
        float m = smoothstep(0.0, 1.0, clamp(uMix * 1.4 - aSeed * 0.4, 0.0, 1.0));
        vec3 p = mix(aFrom, aTo, m);
        p.z += sin(3.14159 * m) * (aSeed - 0.5) * 10.0;
        p += vec3(sin(uTime * 0.9 + aSeed * 40.0), cos(uTime * 1.1 + aSeed * 31.0), 0.0) * 0.06;
        vec3 w = faceRotate(p, uFace) + vec3(0.0, ${SHOW_Y.toFixed(1)}, 0.0);
        vCol = mix(aColFrom, aColTo, m);
        vTw = 0.8 + 0.2 * sin(uTime * 6.0 + aSeed * 90.0);
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(1100.0 / -mv.z, 3.0, 18.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha;
      varying vec3 vCol;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * uAlpha;
        gl_FragColor = vec4(vCol * 3.0 * vTw * a, a);
      }`,
  })
}

function fireworkMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec3 aVel;
      attribute vec2 aTime;
      uniform float uShowT;
      uniform float uFace;
      varying vec3 vCol;
      varying float vA;
      ${ROTATE}
      void main() {
        float age = uShowT - ${FW_START.toFixed(1)} - aTime.x;
        vec3 p = position;
        float a = 0.0;
        float size = 0.0;
        if (aTime.y < 0.5) {
          // Rocket rising from the lake.
          float k = (age + 1.3) / 1.3;
          if (k > 0.0 && k < 1.0) {
            p.y = mix(${WATER_LEVEL.toFixed(2)}, position.y, 1.0 - (1.0 - k) * (1.0 - k));
            a = 0.9;
            size = 4.0;
          }
        } else if (age > 0.0 && age < 2.8) {
          p += aVel * (1.0 - exp(-1.5 * age)) / 1.5 + vec3(0.0, -2.2 * age * age, 0.0);
          a = pow(1.0 - age / 2.8, 1.4);
          if (age > 1.6) a *= 0.5 + 0.5 * sin(age * 40.0 + position.x);
          size = 1.0;
        }
        vec3 w = faceRotate(p, uFace);
        vCol = color;
        vA = a;
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = a > 0.0 ? clamp(size * 900.0 / -mv.z, 2.0, 16.0) : 0.0;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol;
      varying float vA;
      void main() {
        if (vA <= 0.0) discard;
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        gl_FragColor = vec4(vCol * 2.6 * a, a);
      }`,
    vertexColors: true,
  })
}

export default function LightShow() {
  const formations = useMemo(() => buildFormations(BRAND.showText), [])
  const fw = useMemo(() => buildFireworks(), [])
  const run = useRef({ seg: -1, nextBoom: 0 })

  const { drones, fireworks, uniforms } = useMemo(() => {
    const uniforms = {
      uMix: { value: 0 },
      uFace: { value: 0 },
      uAlpha: { value: 0 },
      uShowT: { value: -99 },
      uTime: zoneUniforms.uTime,
    }
    const g = new THREE.BufferGeometry()
    const attr = (name, n) => {
      const a = new THREE.BufferAttribute(new Float32Array(DRONES * n), n)
      a.setUsage(THREE.DynamicDrawUsage)
      g.setAttribute(name, a)
      return a
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DRONES * 3), 3))
    attr('aFrom', 3)
    attr('aTo', 3)
    attr('aColFrom', 3)
    attr('aColTo', 3)
    g.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: DRONES }, (_, i) => (i * 0.618034) % 1), 1))
    const drones = new THREE.Points(g, droneMaterial(uniforms))
    drones.frustumCulled = false
    drones.visible = false

    const fg = new THREE.BufferGeometry()
    fg.setAttribute('position', new THREE.BufferAttribute(fw.origin, 3))
    fg.setAttribute('aVel', new THREE.BufferAttribute(fw.vel, 3))
    fg.setAttribute('color', new THREE.BufferAttribute(fw.color, 3))
    fg.setAttribute('aTime', new THREE.BufferAttribute(fw.time, 2))
    const fireworks = new THREE.Points(fg, fireworkMaterial(uniforms))
    fireworks.frustumCulled = false
    fireworks.visible = false
    return { drones, fireworks, uniforms }
  }, [fw])

  const setFormation = (from, to) => {
    const g = drones.geometry
    g.attributes.aFrom.array.set(formations[from].pos)
    g.attributes.aColFrom.array.set(formations[from].col)
    g.attributes.aTo.array.set(formations[to].pos)
    g.attributes.aColTo.array.set(formations[to].col)
    for (const n of ['aFrom', 'aTo', 'aColFrom', 'aColTo']) g.attributes[n].needsUpdate = true
  }

  useFrame(({ camera }) => {
    const st = useGarden.getState()
    const r = run.current
    if (st.show === null) {
      if (r.seg !== -1) {
        r.seg = -1
        drones.visible = fireworks.visible = false
        showState.glow = 0
      }
      return
    }
    const t = zoneUniforms.uTime.value - st.show
    if (t < 0) return
    if (r.seg === -1) {
      // Face the formations toward the visitor, wherever they watch from.
      uniforms.uFace.value = Math.atan2(camera.position.x, camera.position.z)
      r.nextBoom = 0
      drones.visible = fireworks.visible = true
    }
    if (t > END) {
      useGarden.setState({ show: null })
      return
    }
    // Segment k flies formation k -> k+1; the landing leg starts at LAND_AT.
    const landing = t >= LAND_AT
    const seg = landing ? formations.length - 2 : Math.min(formations.length - 3, Math.floor(t / SEG))
    if (seg !== r.seg) {
      r.seg = seg
      if (landing) setFormation(formations.length - 2, formations.length - 1)
      else setFormation(seg, seg + 1)
    }
    const local = landing ? t - LAND_AT : t - seg * SEG
    uniforms.uMix.value = Math.min(1, local / MORPH)
    uniforms.uAlpha.value = Math.min(1, t / 1.5) * Math.min(1, (END - t) / 1.5)
    uniforms.uShowT.value = t
    // Lake glow follows the show; fireworks flash it.
    const fwT = t - FW_START
    const flash = fw.bursts.reduce((m, b) => Math.max(m, Math.exp(-Math.max(0, fwT - b.t) * 3) * (fwT > b.t ? 1 : 0)), 0)
    showState.glow = 0.4 * uniforms.uAlpha.value + flash * 0.8
    // Booms (if sound is on).
    if (st.audio) {
      while (r.nextBoom < fw.bursts.length && fwT >= fw.bursts[r.nextBoom].t) {
        audio.boom()
        r.nextBoom++
      }
    }
  })

  return (
    <>
      <primitive object={drones} />
      <primitive object={fireworks} />
    </>
  )
}

export { END as SHOW_LENGTH }
