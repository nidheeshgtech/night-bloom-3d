import { create } from 'zustand'

export const usePerf = create((set) => ({
  fps: 0,
  calls: 0,
  triangles: 0,
  set,
}))
