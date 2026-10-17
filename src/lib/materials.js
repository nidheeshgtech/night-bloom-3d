import * as THREE from 'three'

export const foliageMat = new THREE.MeshStandardMaterial({ color: '#2f5a2a', roughness: 0.9 })
export const stoneMat = new THREE.MeshStandardMaterial({ color: '#cdbb9c', roughness: 0.95 })
export const postMat = new THREE.MeshStandardMaterial({ color: '#3b3127', roughness: 0.8 })
// Emissive intensity is driven by time of day in Atmosphere.
export const glowMat = new THREE.MeshStandardMaterial({
  color: '#fff1c9',
  emissive: '#ffcf7a',
  emissiveIntensity: 0.2,
})
