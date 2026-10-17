import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGarden } from '../lib/store'
import { player, rig } from '../lib/player'
import { getWorld } from '../lib/world'
import { registerPicker } from '../lib/picking'
import { MAX_WALK, groundHit, walkable } from '../lib/nav'

const MAX_ARROWS = 6
const ARROW_RING = 6 // arrows sit this far ahead, in each available direction, so they stay in view
const ARROW_SIZE = 1.5
const ARROW_HIT = 0.6 * ARROW_SIZE
const STEP = 9 // metres travelled per arrow click
const ACCENT = new THREE.Color('#ffb86b')
const WHITE = new THREE.Color('#ffffff')

// Directions along nearby paved paths (both ways along each path, merged when close).
function computeArrows(world, pos) {
  const found = []
  for (const { path, half } of world.walkPaths || []) {
    const n = path.nearest(pos.x, pos.z)
    if (n.dist > half + 0.8) continue
    const L = path.length
    for (const dir of [1, -1]) {
      let sT = n.s + dir * STEP
      if (path.closed) sT = ((sT % L) + L) % L
      else {
        if ((dir > 0 && n.s + 3 > L) || (dir < 0 && n.s - 3 < 0)) continue
        sT = Math.min(L - 0.5, Math.max(0.5, sT))
      }
      const f = path.frameAt(n.s)
      found.push({ dx: f.tx * dir, dz: f.tz * dir, target: path.toWorld(sT, 0) })
    }
  }
  const out = []
  for (const a of found) {
    if (out.some((b) => a.dx * b.dx + a.dz * b.dz > Math.cos(0.6))) continue
    out.push(a)
    if (out.length >= MAX_ARROWS) break
  }
  return out
}

function chevronGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, 0.36)
  s.lineTo(0.42, -0.08)
  s.lineTo(0.27, -0.24)
  s.lineTo(0, 0.04)
  s.lineTo(-0.27, -0.24)
  s.lineTo(-0.42, -0.08)
  s.closePath()
  const g = new THREE.ShapeGeometry(s)
  g.rotateX(-Math.PI / 2)
  return g
}

export default function NavArrows() {
  const world = getWorld()
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const state = useRef({ arrows: [], hover: -1, lastCalc: -1, cursor: null })

  const { group, meshes, cursor, pulse } = useMemo(() => {
    const geo = chevronGeometry()
    const group = new THREE.Group()
    const meshes = Array.from({ length: MAX_ARROWS }, () => {
      const mat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
      const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0, depthWrite: false })
      const m = new THREE.Mesh(geo, mat)
      const sh = new THREE.Mesh(geo, shadowMat)
      sh.position.set(0, -0.005, 0.05)
      sh.scale.setScalar(1.12)
      m.add(sh)
      m.renderOrder = 5
      m.visible = false
      group.add(m)
      return m
    })
    const ringGeo = new THREE.RingGeometry(0.3, 0.38, 40)
    ringGeo.rotateX(-Math.PI / 2)
    const cursor = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }))
    cursor.renderOrder = 5
    cursor.visible = false
    const pulse = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }))
    pulse.renderOrder = 5
    pulse.visible = false
    return { group, meshes, cursor, pulse }
  }, [])

  // Arrow clicks win over everything else under the pointer.
  useEffect(() => {
    if (!world.walkPaths) return
    const hit = new THREE.Vector3()
    const plane = new THREE.Plane()
    return registerPicker((ray) => {
      if (useGarden.getState().mode !== 'walk' || player.auto) return null
      let best = null
      state.current.arrows.forEach((a, i) => {
        plane.set(new THREE.Vector3(0, 1, 0), -a.pos.y)
        if (!ray.intersectPlane(plane, hit) || hit.distanceTo(a.pos) > ARROW_HIT) return
        const d = hit.distanceTo(ray.origin)
        if (!best || d < best.d) best = { d, i }
      })
      if (!best) return null
      const a = state.current.arrows[best.i]
      return { d: -1, immediate: true, onSelect: () => rig.walkTo(a.target.x, a.target.z) }
    })
  }, [world])

  // Hover: highlight arrows, or show a ring where a double-click would walk to.
  useEffect(() => {
    const el = gl.domElement
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const plane = new THREE.Plane()
    const hit = new THREE.Vector3()
    let queued = null
    const update = () => {
      const e = queued
      queued = null
      const st = state.current
      if (useGarden.getState().mode !== 'walk' || player.dragging || player.auto || e.pointerType !== 'mouse') {
        st.hover = -1
        st.cursor = null
        return
      }
      const rect = el.getBoundingClientRect()
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      st.hover = -1
      st.arrows.forEach((a, i) => {
        plane.set(new THREE.Vector3(0, 1, 0), -a.pos.y)
        if (raycaster.ray.intersectPlane(plane, hit) && hit.distanceTo(a.pos) < ARROW_HIT) st.hover = i
      })
      el.style.cursor = st.hover >= 0 ? 'pointer' : ''
      st.cursor = null
      if (st.hover < 0) {
        const p = groundHit(raycaster.ray, world)
        if (p && p.distanceTo(player.pos) < MAX_WALK && walkable(world, p.x, p.z)) st.cursor = p
      }
    }
    const onMove = (e) => {
      if (!queued) requestAnimationFrame(update)
      queued = e
    }
    const onLeave = () => {
      state.current.cursor = null
      state.current.hover = -1
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [gl, camera, world])

  useFrame(({ clock }, dt) => {
    const st = state.current
    const walking = useGarden.getState().mode === 'walk'
    const show = walking && !player.auto && !!world.walkPaths
    if (show && clock.elapsedTime - st.lastCalc > 0.2) {
      st.lastCalc = clock.elapsedTime
      st.arrows = computeArrows(world, player.pos).map((a) => {
        const x = player.pos.x + a.dx * ARROW_RING
        const z = player.pos.z + a.dz * ARROW_RING
        return { ...a, pos: new THREE.Vector3(x, world.heightAt(x, z) + 0.07, z) }
      })
    }
    meshes.forEach((m, i) => {
      const a = st.arrows[i]
      const target = show && a ? (st.hover === i ? 1 : 0.82) : 0
      m.material.opacity += (target - m.material.opacity) * Math.min(1, dt * 8)
      m.children[0].material.opacity = m.material.opacity * 0.3
      m.visible = m.material.opacity > 0.01 && !!a
      if (!a) return
      m.position.copy(a.pos)
      m.rotation.y = Math.atan2(-a.dx, -a.dz)
      const s = (st.hover === i ? 1.2 : 1) * ARROW_SIZE
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * Math.min(1, dt * 10))
      m.material.color.copy(st.hover === i ? ACCENT : WHITE)
    })
    cursor.visible = !!st.cursor && walking && !player.auto
    if (cursor.visible) cursor.position.copy(st.cursor).setY(st.cursor.y + 0.06)
    // Expanding ring where a walk was just requested.
    const tgt = player.target
    const age = tgt ? (performance.now() - tgt.t) / 1000 : 9
    pulse.visible = age < 1.1
    if (pulse.visible) {
      pulse.position.set(tgt.x, world.heightAt(tgt.x, tgt.z) + 0.06, tgt.z)
      pulse.scale.setScalar(1 + age * 1.6)
      pulse.material.opacity = 0.9 * (1 - age / 1.1)
    }
  })

  return (
    <>
      <primitive object={group} />
      <primitive object={cursor} />
      <primitive object={pulse} />
    </>
  )
}
