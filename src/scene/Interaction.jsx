import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGarden } from '../lib/store'
import { player, rig } from '../lib/player'
import { getWorld } from '../lib/world'
import { allPickers } from '../lib/picking'
import { MAX_WALK, groundHit } from '../lib/nav'

const CLICK_SLOP = 6
const FLOWER_REACH = 30
const FLOWER_HIT_SQ = 0.06
const DOUBLE_MS = 320 // max gap between the two clicks of a double-click
const PICK_DELAY = 260 // single clicks wait this long in walk mode in case a second click follows

// Drag-to-look and Street View-style moves in walk mode (double-click, or tap on touch), plus
// analytic picking (spheres for sculptures, ray-to-point for flowers, registered pickers).
export default function Interaction() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const el = gl.domElement
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const sphere = new THREE.Sphere()
    const hit = new THREE.Vector3()
    const pt = new THREE.Vector3()
    const pointers = new Map()

    const world = getWorld()
    let pending = null

    const rayAt = (cx, cy) => {
      const rect = el.getBoundingClientRect()
      ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray
    }

    const moveTo = (cx, cy) => {
      const p = groundHit(rayAt(cx, cy), world)
      if (!p || p.distanceTo(player.pos) > MAX_WALK) return
      // Clicks on beds, hedges or water only snap a short way; further off, nothing happens.
      if (rig.walkTo(p.x, p.z, 0.8)) player.target = { x: p.x, z: p.z, t: performance.now() }
    }

    const pick = (cx, cy) => {
      const ray = rayAt(cx, cy)
      let best = null

      for (const s of world.sculptures) {
        // Standing inside a feature (e.g. the glasshouse) shouldn't make every click select it.
        if (s.contains && s.contains(camera.position)) continue
        for (const [x, y, z, r] of s.pick) {
          sphere.center.set(x, y, z)
          sphere.radius = r
          if (sphere.containsPoint(camera.position)) continue
          if (ray.intersectSphere(sphere, hit)) {
            // pickBias lets small features (plant specimens) win over large ones around them.
            const d = hit.distanceTo(ray.origin) - (s.pickBias || 0)
            if (!best || d < best.d) best = { d, kind: 'sculpture', id: s.id }
          }
        }
      }

      const h = world.flowers.heads
      const count = world.flowers.count()
      // Tolerance grows with distance so it behaves like a few pixels on screen.
      const base = world.pickRadius ?? Math.sqrt(FLOWER_HIT_SQ)
      for (let i = 0; i < count; i++) {
        pt.set(h[i * 3], h[i * 3 + 1], h[i * 3 + 2])
        const d = pt.distanceTo(ray.origin)
        if (d > FLOWER_REACH || (best && d > best.d)) continue
        if (ray.distanceSqToPoint(pt) < (base + d * 0.012) ** 2) best = { d, kind: 'flower', index: i }
      }
      for (const picker of allPickers()) {
        const hit = picker(ray, best ? best.d : Infinity)
        if (hit && (!best || hit.d < best.d)) best = { ...hit, kind: 'custom' }
      }
      return best
    }

    const onDown = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() })
      if (useGarden.getState().mode === 'walk') el.style.cursor = 'grabbing'
    }

    const onMove = (e) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (useGarden.getState().mode !== 'walk') return
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > CLICK_SLOP) player.dragging = true
      const k = e.pointerType === 'touch' ? 0.005 : 0.0028
      player.yaw -= dx * k
      player.pitch = THREE.MathUtils.clamp(player.pitch - dy * k, -1.2, 1.2)
    }

    const onUp = (e) => {
      const p = pointers.get(e.pointerId)
      pointers.delete(e.pointerId)
      el.style.cursor = ''
      if (!pointers.size) player.dragging = false
      if (!p) return
      if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > CLICK_SLOP || performance.now() - p.t > 500) return

      const st = useGarden.getState()
      if (st.mode === 'flying' || st.mode === 'intro' || st.mode === 'tour' || st.photo) return
      const result = pick(e.clientX, e.clientY)
      if (result?.immediate) {
        result.onSelect()
        return
      }
      if (st.mode === 'walk') {
        if (e.pointerType === 'mouse') {
          const now = performance.now()
          if (pending && now - pending.t < DOUBLE_MS && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < 14) {
            clearTimeout(pending.timer)
            pending = null
            moveTo(e.clientX, e.clientY)
            return
          }
          clearTimeout(pending?.timer)
          pending = { t: now, x: e.clientX, y: e.clientY, timer: setTimeout(() => ((pending = null), handle(result)), PICK_DELAY) }
          return
        }
        // Touch: tap a flower or feature to select it, tap anywhere else to walk there.
        if (!result) {
          if (st.selected?.kind === 'flower') st.set({ selected: null })
          moveTo(e.clientX, e.clientY)
          return
        }
      }
      handle(result)
    }

    const handle = (result) => {
      const st = useGarden.getState()
      if (!result) {
        if (st.selected?.kind === 'flower') st.set({ selected: null })
        return
      }
      if (result.kind === 'sculpture') {
        rig.inspect(result.id)
        return
      }
      if (result.kind === 'custom') {
        result.onSelect()
        return
      }
      const species = world.flowers.species[result.index]
      st.set({
        selected: { kind: 'flower', index: result.index, species },
        discovered: st.discovered.includes(species) ? st.discovered : [...st.discovered, species],
      })
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      clearTimeout(pending?.timer)
    }
  }, [gl, camera])

  return null
}
