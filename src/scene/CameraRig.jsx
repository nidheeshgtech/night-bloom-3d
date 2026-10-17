import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useGarden } from '../lib/store'
import { input, player, rig } from '../lib/player'
import { shared } from '../lib/flowerMaterial'
import { zoneUniforms } from '../zone/materials'
import { audio } from '../lib/audio'
import { findPath, nearestWalkable } from '../lib/nav'
import { getWorld } from '../lib/world'

const EYE = 1.7
const WALK_SPEED = 4
const RUN_SPEED = 8
const AUTO_SPEED = 3.8 // Street View-style glide speed, m/s
const TURN_SPEED = 1.6 // rad/s when holding left/right on the touch pad
const WALK_PITCH = -0.1 // slight downward look so the path and its arrows are in view
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

const forward = (yaw, pitch) =>
  new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))

export default function CameraRig() {
  const world = getWorld()
  const mode = useGarden((s) => s.mode)
  const showOn = useGarden((s) => s.show !== null)
  const siteMapOn = useGarden((s) => s.siteMap)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const controls = useRef()
  const tween = useRef()
  const memory = useRef(null)
  const keys = useRef({})

  useEffect(() => {
    camera.rotation.order = 'YXZ'
    controls.current.target.copy(world.aerial.target)
    if (import.meta.env.DEV && window.__garden) Object.assign(window.__garden, { camera, scene, gl })
  }, [camera, scene, gl, world])

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
      player.auto = null
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
      set({ selected: null, siteMap: false })
      fly(pos.clone(), pos.clone().add(forward(yaw, WALK_PITCH).multiplyScalar(10)), {
        duration: 3.4,
        arc: 12,
        onDone: () => startWalk(pos, yaw, WALK_PITCH),
      })
    }

    // Frame one zone from the lake side, then orbit around it.
    rig.focusZone = (id) => {
      if (useGarden.getState().mode === 'flying') return
      const zone = world.zones.find((z) => z.id === id)
      const target = zone.center.clone().setY(zone.center.y + 1)
      const out = new THREE.Vector3(zone.dir.x, 0, zone.dir.y)
      const pos = target.clone().addScaledVector(out, -58).setY(target.y + 42)
      set({ focus: id, selected: { kind: 'zone', id }, siteMap: false })
      fly(pos, target, { duration: 2.6, arc: 10, onDone: () => toOrbit(target, 'aerial') })
    }

    // Street View-style move: route to (x, z) around obstacles, then glide along it.
    rig.walkTo = (x, z, snap = 2.5) => {
      if (useGarden.getState().mode !== 'walk') return false
      const route = findPath(world, player.pos.x, player.pos.z, x, z, snap)
      if (!route) return false
      const pts = route.map(([px, pz]) => new THREE.Vector3(px, 0, pz))
      const curve = pts.length === 2 ? new THREE.LineCurve3(pts[0], pts[1]) : new THREE.CatmullRomCurve3(pts, false, 'centripetal')
      const length = curve.getLength()
      if (length < 0.3) return false
      const dir = pts[1].clone().sub(pts[0])
      // Moving roughly forward turns the view with the walk; sideways and backward moves keep it.
      const forward = Math.abs(angleDiff(Math.atan2(-dir.x, -dir.z), player.yaw)) < 0.9
      player.auto = { curve, length, s: 0, v: 0, forward }
      return true
    }

    // Take me there: walk if already walking, otherwise fly down to a walkable spot facing it.
    rig.goTo = (poi) => {
      const st = useGarden.getState()
      if (st.mode === 'flying' || st.mode === 'tour') return
      set({ selected: null, siteMap: false })
      if (poi.fly) {
        const target = poi.pos.clone().setY(poi.pos.y + 1)
        return fly(target.clone().add(new THREE.Vector3(0, 40, 45)), target, { duration: 2.6, onDone: () => toOrbit(target, 'aerial') })
      }
      if (st.mode === 'walk' && rig.walkTo(poi.pos.x, poi.pos.z, 5)) {
        player.target = { x: poi.pos.x, z: poi.pos.z, t: performance.now() }
        return
      }
      const spot = nearestWalkable(world, poi.pos.x, poi.pos.z, 8)
      if (!spot) return
      const pos = new THREE.Vector3(spot[0], world.heightAt(spot[0], spot[1]) + EYE, spot[1])
      const look = (poi.look || poi.pos).clone()
      const yaw = Math.atan2(-(look.x - pos.x), -(look.z - pos.z))
      fly(pos, pos.clone().add(forward(yaw, WALK_PITCH).multiplyScalar(10)), { duration: 3, arc: 10, onDone: () => startWalk(pos, yaw, WALK_PITCH) })
    }

    // Lake light show: switch to night, fly to a lakeside viewpoint (unless walking), start.
    rig.lightShow = () => {
      const st = useGarden.getState()
      if (st.show !== null || st.mode === 'tour' || st.mode === 'flying') return
      set({ night: 1, selected: null })
      if (!st.audio) {
        audio.start()
        set({ audio: true })
      }
      const start = () => set({ show: zoneUniforms.uTime.value + 1.2 })
      if (st.mode === 'walk') return start()
      const target = new THREE.Vector3(0, 46, 0)
      set({ focus: null })
      fly(new THREE.Vector3(0, 9, 118), target, { duration: 3, arc: 6, onDone: () => (toOrbit(target, 'aerial'), start()) })
    }
    rig.stopShow = () => set({ show: null })

    // Infographic site-map view: high oblique view, numbered badges, glowing outlines.
    rig.siteMap = () => {
      const st = useGarden.getState()
      if (st.mode !== 'aerial') return
      const target = new THREE.Vector3(0, 0, 8)
      set({ siteMap: true, focus: null, selected: null })
      fly(new THREE.Vector3(0, 285, 175), target, { duration: 2.6, onDone: () => toOrbit(target, 'aerial') })
    }
    rig.closeSiteMap = () => {
      set({ siteMap: false })
      rig.toAerial()
    }

    // Hands-off cinematic tour along the world's tour segments.
    rig.tour = () => {
      if (!world.tour) return
      tween.current?.kill()
      const segs = world.tour()
      const tl = gsap.timeline()
      const look = new THREE.Vector3()
      const night = { v: useGarden.getState().night }
      let prevPos = camera.position.clone()
      let prevLook = currentLook()
      set({ mode: 'tour', selected: null, focus: null, caption: null })
      // The tour starts from a click, so the browser allows sound.
      if (!useGarden.getState().audio) {
        audio.start()
        set({ audio: true })
      }
      segs.forEach((seg) => {
        const pc = new THREE.CatmullRomCurve3([prevPos, ...seg.pos], false, 'centripetal')
        const lc = new THREE.CatmullRomCurve3([prevLook, ...seg.look], false, 'centripetal')
        const st = { t: 0 }
        tl.call(() => set({ caption: { title: seg.caption, sub: seg.sub } }))
        tl.to(st, {
          t: 1,
          duration: seg.duration,
          ease: seg.ease || 'power1.inOut',
          onUpdate: () => {
            camera.position.copy(pc.getPointAt(st.t))
            camera.lookAt(lc.getPointAt(st.t, look))
          },
        })
        if (seg.night !== undefined) {
          tl.to(night, { v: seg.night, duration: seg.duration, ease: 'sine.inOut', onUpdate: () => set({ night: night.v }) }, '<')
        }
        prevPos = seg.pos[seg.pos.length - 1]
        prevLook = seg.look[seg.look.length - 1]
      })
      tl.call(() => rig.stopTour())
      tween.current = tl
    }

    rig.stopTour = () => {
      if (useGarden.getState().mode !== 'tour') return
      tween.current?.kill()
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      // Orbit around the point the camera was looking at, on the ground.
      const t = dir.y < -0.05 ? -camera.position.y / dir.y : 30
      controls.current.target.copy(camera.position).addScaledVector(dir, Math.min(t, 250))
      set({ mode: 'aerial', caption: null })
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
        if (st.mode === 'tour') rig.stopTour()
        else if (st.photo) st.set({ photo: false })
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
    let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
    let mz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + input.move
    const len = Math.hypot(mx, mz)
    if (len > 1) {
      mx /= len
      mz /= len
    }
    // Touch pad: left/right steer the view like a car; any pad input cancels a glide.
    if (input.turn) player.yaw -= input.turn * TURN_SPEED * dt
    if (len > 0.01 || input.turn) player.auto = null
    let nx
    let nz
    const auto = player.auto
    if (auto) {
      // Ease in, cruise, ease out to stop exactly at the destination.
      const remain = auto.length - auto.s
      const vmax = Math.min(AUTO_SPEED, Math.sqrt(2 * 3 * Math.max(remain, 0)) + 0.15)
      auto.v = Math.min(vmax, auto.v + 4.5 * dt)
      auto.s = Math.min(auto.length, auto.s + auto.v * dt)
      const p = auto.curve.getPointAt(auto.s / auto.length)
      nx = p.x
      nz = p.z
      if (auto.forward && !player.dragging) {
        const tan = auto.curve.getTangentAt(Math.min(0.999, auto.s / auto.length))
        player.yaw += angleDiff(Math.atan2(-tan.x, -tan.z), player.yaw) * Math.min(1, dt * 2.5)
        player.pitch += (WALK_PITCH - player.pitch) * Math.min(1, dt * 1.5)
      }
      if (auto.s >= auto.length - 1e-3) player.auto = null
    } else {
      const speed = (k.ShiftLeft || k.ShiftRight ? RUN_SPEED : WALK_SPEED) * dt
      const sin = Math.sin(player.yaw)
      const cos = Math.cos(player.yaw)
      nx = player.pos.x + (-sin * mz + cos * mx) * speed
      nz = player.pos.z + (-cos * mz - sin * mx) * speed

      ;[nx, nz] = world.clamp(nx, nz)
      // Walls: push out of any segment closer than the body radius.
      for (const [ax, az, bx, bz] of world.walls || []) {
        const ex = bx - ax
        const ez = bz - az
        const t = Math.max(0, Math.min(1, ((nx - ax) * ex + (nz - az) * ez) / (ex * ex + ez * ez || 1)))
        const cx = ax + ex * t
        const cz = az + ez * t
        const dx = nx - cx
        const dz = nz - cz
        const d = Math.hypot(dx, dz)
        if (d < 0.35 && d > 1e-6) {
          nx = cx + (dx / d) * 0.35
          nz = cz + (dz / d) * 0.35
        }
      }
      for (const c of world.colliders) {
        const dx = nx - c.x
        const dz = nz - c.z
        const d = Math.hypot(dx, dz)
        if (d < c.r) {
          nx = c.x + (dx / d) * c.r
          nz = c.z + (dz / d) * c.r
        }
      }
    }

    player.pos.x = nx
    player.pos.z = nz
    player.pos.y += (world.heightAt(nx, nz) + EYE - player.pos.y) * Math.min(1, dt * 10)
    const bob = len > 0.01 || auto ? Math.sin(clock.elapsedTime * 9) * 0.03 : 0
    camera.position.set(nx, player.pos.y + bob, nz)
    camera.rotation.set(player.pitch, player.yaw, 0)
    shared.uPlayer.value.set(nx, 0, nz)
    // Which zone is the visitor in? Drives the feature chips.
    if (world.zones) {
      let here = null
      if (Math.hypot(nx, nz) > 60) {
        const a = Math.atan2(nz, nx)
        here = world.zones.reduce((best, z) => {
          const d = Math.abs(Math.atan2(Math.sin(a - z.a), Math.cos(a - z.a)))
          return !best || d < best.d ? { id: z.id, d } : best
        }, null).id
      }
      if (here !== useGarden.getState().here) useGarden.setState({ here })
    }
  })

  const orbiting = mode === 'intro' || mode === 'aerial' || mode === 'inspect'
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={orbiting}
      autoRotate={orbiting && !showOn && !siteMapOn}
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
