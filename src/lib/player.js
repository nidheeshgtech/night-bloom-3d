import * as THREE from 'three'

// Mutable per-frame state kept out of React to avoid re-renders.
export const player = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 }
export const input = { move: { x: 0, y: 0 } }

// Camera actions, filled in by CameraRig and called from the HUD and picking.
export const rig = {
  enter() {},
  toAerial() {},
  inspect() {},
  back() {},
}
