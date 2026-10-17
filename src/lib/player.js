import * as THREE from 'three'

// Mutable per-frame state kept out of React to avoid re-renders.
// auto: active Street View-style glide; dragging: user is drag-looking; target: last walk target.
export const player = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, auto: null, dragging: false, target: null }

// Touch direction pad: move = forward (+1) / back (-1), turn = right (+1) / left (-1).
export const input = { move: 0, turn: 0 }

// Camera actions, filled in by CameraRig and called from the HUD and picking.
export const rig = {
  enter() {},
  toAerial() {},
  inspect() {},
  back() {},
  walkTo() {
    return false
  },
  lightShow() {},
  stopShow() {},
  siteMap() {},
  goTo() {},
  closeSiteMap() {},
}
