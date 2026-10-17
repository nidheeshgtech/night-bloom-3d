import { BRAND } from '../brand'

// Copies the WebGL canvas, adds a small wordmark and downloads a PNG.
export function capturePhoto() {
  const src = document.querySelector('canvas')
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')
  ctx.drawImage(src, 0, 0)

  const size = Math.round(out.width * 0.022)
  const pad = Math.round(out.width * 0.02)
  ctx.font = `600 ${size}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = size * 0.4
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText(BRAND.name, out.width - pad, out.height - pad)

  out.toBlob((blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${BRAND.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  })
}
