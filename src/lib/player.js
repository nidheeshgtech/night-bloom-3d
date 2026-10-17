import * as THREE from 'three'

// Mutable per-frame state kept out of React to avoid re-renders.
// auto: active Street View-style glide; dragging: user is drag-looking; target: last walk target.
export const player = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, auto: null, dragging: false, target: null }

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
}
