import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useGarden } from '../lib/store'
import { input, player, rig } from '../lib/player'
import { shared } from '../lib/flowerMaterial'
import { getWorld } from '../lib/world'

const EYE = 1.7
const WALK_SPEED = 4
const RUN_SPEED = 8

const forward = (yaw, pitch) =>
  new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))

export default function CameraRig() {
  const world = getWorld()
  const mode = useGarden((s) => s.mode)
  const camera = useThree((s) => s.camera)
  const controls = useRef()
  const tween = useRef()
  const memory = useRef(null)
  const keys = useRef({})

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    controls.current.target.copy(world.aerial.target)
    if (import.meta.env.DEV && window.__garden) window.__garden.camera = camera
  }, [camera, world])

  useEffect(() => {
    const set = useGarden.setState

    const currentLook = () => {
      const m = useGarden.getState().mode
      if (m === 'aerial' || m === 'inspect' || m === 'intro') return controls.current.target.clone()
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      return camera.position.clone().addScaledVector(dir, 10)
    }

    // Quadratic-bezier camera flight with the look target lerped alongside.
    const fly = (toPos, toLook, { duration = 2.6, arc = 0, onDone }) => {
      tween.current?.kill()
      const fromPos = camera.position.clone()
      const fromLook = currentLook()
      const mid = fromPos.clone().lerp(toPos, 0.5)
      mid.y += arc
      const look = new THREE.Vector3()
      const state = { t: 0 }
      set({ mode: 'flying' })
      tween.current = gsap.to(state, {
        t: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const t = state.t
          const u = 1 - t
          camera.position.set(
            u * u * fromPos.x + 2 * u * t * mid.x + t * t * toPos.x,
            u * u * fromPos.y + 2 * u * t * mid.y + t * t * toPos.y,
            u * u * fromPos.z + 2 * u * t * mid.z + t * t * toPos.z,
          )
          camera.lookAt(look.lerpVectors(fromLook, toLook, t))
        },
        onComplete: onDone,
      })
    }

    const startWalk = (pos, yaw, pitch) => {
      player.pos.copy(pos)
      player.yaw = yaw
      player.pitch = pitch
      camera.rotation.set(pitch, yaw, 0)
      set({ mode: 'walk' })
    }

    const toOrbit = (target, mode) => {
      controls.current.target.copy(target)
      set({ mode })
    }

    // Enter the focused zone (or the default spawn) at eye level.
    rig.enter = () => {
      const zone = world.zones?.find((z) => z.id === useGarden.getState().focus)
      const { pos, yaw } = zone ? zone.spawn : world.spawn
      set({ selected: null })
      fly(pos.clone(), pos.clone().add(forward(yaw, 0).multiplyScalar(10)), {
        duration: 3.4,
        arc: 12,
        onDone: () => startWalk(pos, yaw, 0),
      })
    }

    // Frame one zone from the lake side, then orbit around it.
    rig.focusZone = (id) => {
      if (useGarden.getState().mode === 'flying') return
      const zone = world.zones.find((z) => z.id === id)
      const target = zone.center.clone().setY(zone.center.y + 1)
      const out = new THREE.Vector3(zone.dir.x, 0, zone.dir.y)
      const pos = target.clone().addScaledVector(out, -58).setY(target.y + 42)
      set({ focus: id, selected: { kind: 'zone', id } })
      fly(pos, target, { duration: 2.6, arc: 10, onDone: () => toOrbit(target, 'aerial') })
    }

    rig.toAerial = () => {
      set({ selected: null, focus: null })
      const { target, distance, height } = world.aerial
      const dir = camera.position.clone().sub(target).setY(0)
      if (dir.lengthSq() < 1) dir.set(1, 0, 1)
      const pos = target.clone().addScaledVector(dir.normalize(), distance).setY(height)
      fly(pos, target, { duration: 3, onDone: () => toOrbit(target, 'aerial') })
    }

    rig.inspect = (id) => {
      const m = useGarden.getState().mode
      if (m === 'flying') return
      const s = world.sculptures.find((sc) => sc.id === id)
      if (m !== 'inspect') {
        memory.current =
          m === 'walk'
            ? { mode: 'walk', pos: player.pos.clone(), yaw: player.yaw, pitch: player.pitch }
            : { mode: 'aerial' }
      }
      const dir = s.viewDir ? s.viewDir.clone() : camera.position.clone().sub(s.center).setY(0)
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 0)
      // Portrait screens: step back so the sculpture fits, and aim low so it sits above the bottom sheet.
      const portrait = camera.aspect < 1
      const target = s.center.clone()
      if (portrait) target.y -= 2.5
      const pos = target.clone().addScaledVector(dir.normalize(), s.viewDistance * (portrait ? 1.7 : 1))
      pos.y = s.center.y + s.viewHeight
      set({ selected: { kind: 'sculpture', id } })
      fly(pos, target, {
        duration: 2.2,
        arc: m === 'walk' ? 4 : 0,
        onDone: () => toOrbit(target, 'inspect'),
      })
    }

    rig.back = () => {
      const mem = memory.current
      set({ selected: null })
      if (mem?.mode === 'walk') {
        const look = mem.pos.clone().add(forward(mem.yaw, mem.pitch).multiplyScalar(10))
        fly(mem.pos, look, { duration: 2, onDone: () => startWalk(mem.pos, mem.yaw, mem.pitch) })
      } else {
        rig.toAerial()
      }
    }

    return () => tween.current?.kill()
  }, [camera, world])

  useEffect(() => {
    const down = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return
      keys.current[e.code] = true
      if (e.code === 'Escape') {
        const st = useGarden.getState()
        if (st.photo) st.set({ photo: false })
        else if (st.mode === 'inspect') rig.back()
        else if (st.selected) st.set({ selected: null })
      }
    }
    const up = (e) => (keys.current[e.code] = false)
    const clear = () => (keys.current = {})
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useFrame(({ clock }, delta) => {
    if (useGarden.getState().mode !== 'walk') {
      shared.uPlayer.value.set(0, -999, 0)
      return
    }
    const dt = Math.min(delta, 0.05)
    const k = keys.current
    let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + input.move.x
    let mz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + input.move.y
    const len = Math.hypot(mx, mz)
    if (len > 1) {
      mx /= len
      mz /= len
    }
    const speed = (k.ShiftLeft || k.ShiftRight ? RUN_SPEED : WALK_SPEED) * dt
    const sin = Math.sin(player.yaw)
    const cos = Math.cos(player.yaw)
    let nx = player.pos.x + (-sin * mz + cos * mx) * speed
    let nz = player.pos.z + (-cos * mz - sin * mx) * speed

    ;[nx, nz] = world.clamp(nx, nz)
    for (const c of world.colliders) {
      const dx = nx - c.x
      const dz = nz - c.z
      const d = Math.hypot(dx, dz)
      if (d < c.r) {
        nx = c.x + (dx / d) * c.r
        nz = c.z + (dz / d) * c.r
      }
    }

    player.pos.x = nx
    player.pos.z = nz
    player.pos.y += (world.heightAt(nx, nz) + EYE - player.pos.y) * Math.min(1, dt * 10)
    const bob = len > 0.01 ? Math.sin(clock.elapsedTime * 9) * 0.03 : 0
    camera.position.set(nx, player.pos.y + bob, nz)
    camera.rotation.set(player.pitch, player.yaw, 0)
    shared.uPlayer.value.set(nx, 0, nz)
  })

  const orbiting = mode === 'intro' || mode === 'aerial' || mode === 'inspect'
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={orbiting}
      autoRotate={orbiting}
      autoRotateSpeed={mode === 'inspect' ? 0.6 : 0.35}
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      minDistance={mode === 'inspect' ? 4 : world.orbit.min}
      maxDistance={mode === 'inspect' ? 50 : world.orbit.max}
      maxPolarAngle={mode === 'inspect' ? Math.PI / 2 - 0.02 : Math.PI / 2 - 0.08}
    />
  )
}
