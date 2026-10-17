import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { heightAt, PATH_RADIUS, PATH_HALF_WIDTH } from '../lib/terrain'
import { TUNNEL } from '../lib/sculptures'
import { glowMat, postMat } from '../lib/materials'

const POST_HEIGHT = 1.1

// Lanterns along the outer edge of the ring path, skipping the tunnel.
export default function Lanterns() {
  const posts = useRef()
  const bulbs = useRef()

  const spots = useMemo(() => {
    const out = []
    const r = PATH_RADIUS + PATH_HALF_WIDTH + 0.5
    for (let i = 0; i < 30; i++) {
      const a = Math.atan2(Math.sin((i / 30) * Math.PI * 2), Math.cos((i / 30) * Math.PI * 2))
      if (a > TUNNEL.from - 0.08 && a < TUNNEL.to + 0.08) continue
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      out.push(new THREE.Vector3(x, heightAt(x, z), z))
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    spots.forEach((p, i) => {
      posts.current.setMatrixAt(i, m.makeTranslation(p.x, p.y + POST_HEIGHT / 2, p.z))
      bulbs.current.setMatrixAt(i, m.makeTranslation(p.x, p.y + POST_HEIGHT + 0.1, p.z))
    })
    posts.current.instanceMatrix.needsUpdate = true
    bulbs.current.instanceMatrix.needsUpdate = true
    posts.current.computeBoundingSphere()
    bulbs.current.computeBoundingSphere()
  }, [spots])

  return (
    <>
      <instancedMesh ref={posts} args={[null, postMat, spots.length]}>
        <cylinderGeometry args={[0.04, 0.06, POST_HEIGHT, 6]} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[null, glowMat, spots.length]}>
        <sphereGeometry args={[0.14, 12, 8]} />
      </instancedMesh>
    </>
  )
}
