// Extra click targets registered by scene components (butterflies, lanterns...).
// A picker gets the ray and the distance of the best hit so far, and returns
// { d, onSelect } or null. The nearest hit across all pickers wins.
const pickers = new Set()

export function registerPicker(fn) {
  pickers.add(fn)
  return () => pickers.delete(fn)
}

export const allPickers = () => pickers
