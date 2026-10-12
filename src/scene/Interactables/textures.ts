"use client"

import * as THREE from "three"

// Module-level texture cache. Canvas + GPU texture creation is expensive
// (canvas alloc + 2D draw + GPU upload); callers used to regenerate on every
// component mount via useMemo. With cached getters every station shares one
// texture for the lifetime of the page.
const laptopCache = { tex: null as THREE.CanvasTexture | null }
const photoCache = new Map<string, THREE.CanvasTexture>()
const bookSpineCache = new Map<string, THREE.CanvasTexture>()

export function getLaptopScreenTexture(): THREE.CanvasTexture {
  if (!laptopCache.tex) laptopCache.tex = laptopScreenTexture()
  return laptopCache.tex
}

export function getPhotoPlaceholder(
  title: string,
  subtitle: string,
  accent = "#5bc0eb"
): THREE.CanvasTexture {
  const key = `${title}|${subtitle}|${accent}`
  let tex = photoCache.get(key)
  if (!tex) {
    tex = photoPlaceholder(title, subtitle, accent)
    photoCache.set(key, tex)
  }
  return tex
}

export function getBookSpineTexture(
  title: string,
  bgColor: string,
  textColor = "#e8edf5"
): THREE.CanvasTexture {
  const key = `${title}|${bgColor}|${textColor}`
  let tex = bookSpineCache.get(key)
  if (!tex) {
    tex = bookSpineTexture(title, bgColor, textColor)
    bookSpineCache.set(key, tex)
  }
  return tex
}

/**
 * Generates a CanvasTexture for a laptop screen showing scrolling code lines.
 * Used as placeholder until a real screenshot/animation is wired in.
 */
export function laptopScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 320
  const ctx = canvas.getContext("2d")!

  // Background
  ctx.fillStyle = "#0a0f1c"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Subtle scanlines
  ctx.fillStyle = "rgba(91, 192, 235, 0.04)"
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillRect(0, y, canvas.width, 1)
  }

  // Header bar
  ctx.fillStyle = "#131a2b"
  ctx.fillRect(0, 0, canvas.width, 28)
  ctx.fillStyle = "#5bc0eb"
  ctx.font = "12px ui-monospace, 'SF Mono', Menlo, monospace"
  ctx.fillText("● ● ●   MATAEV.NO — projects", 12, 18)

  // Title
  ctx.fillStyle = "#e8edf5"
  ctx.font = "bold 22px ui-monospace, 'SF Mono', Menlo, monospace"
  ctx.fillText("// portfolio.ts", 16, 64)

  // Lines of "code"
  const lines = [
    { color: "#5bc0eb", text: "const projects = [" },
    { color: "#e8edf5", text: '  { name: "Loyvetmitt", year: 2026 },' },
    { color: "#e8edf5", text: '  { name: "Mash Partners", year: 2025 },' },
    { color: "#e8edf5", text: '  { name: "Buypass CP/CPS", year: 2025 },' },
    { color: "#e8edf5", text: '  { name: "Myboard chess", year: 2024 },' },
    { color: "#5bc0eb", text: "]" },
    { color: "#8a93a6", text: "" },
    { color: "#f4a261", text: "// press E to inspect →" },
  ]
  ctx.font = "16px ui-monospace, 'SF Mono', Menlo, monospace"
  lines.forEach((l, i) => {
    ctx.fillStyle = l.color
    ctx.fillText(l.text, 16, 100 + i * 24)
  })

  // Bottom status bar
  ctx.fillStyle = "#131a2b"
  ctx.fillRect(0, canvas.height - 24, canvas.width, 24)
  ctx.fillStyle = "#5bc0eb"
  ctx.font = "11px ui-monospace, monospace"
  ctx.fillText("● live   ⌘ next.js · ts · tailwind", 12, canvas.height - 8)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/**
 * Generates a placeholder photo with title centered. Cyan glow gradient.
 */
export function photoPlaceholder(
  title: string,
  subtitle: string,
  accent = "#5bc0eb"
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 400
  canvas.height = 300
  const ctx = canvas.getContext("2d")!

  // Gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  grad.addColorStop(0, "#1b2236")
  grad.addColorStop(1, "#0a0f1c")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Accent corner glow
  const radial = ctx.createRadialGradient(
    canvas.width * 0.7,
    canvas.height * 0.3,
    20,
    canvas.width * 0.7,
    canvas.height * 0.3,
    220
  )
  radial.addColorStop(0, accent + "66")
  radial.addColorStop(1, "transparent")
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Frame
  ctx.strokeStyle = "rgba(232, 237, 245, 0.15)"
  ctx.lineWidth = 6
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16)

  // Title
  ctx.fillStyle = "#e8edf5"
  ctx.font = "bold 38px Georgia, 'Times New Roman', serif"
  ctx.textAlign = "center"
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 8)

  ctx.fillStyle = accent
  ctx.font = "16px ui-monospace, monospace"
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 24)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/**
 * Vertical book-spine texture with title text rotated 90°.
 */
export function bookSpineTexture(
  title: string,
  bgColor: string,
  textColor = "#e8edf5"
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 60
  canvas.height = 400
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Top/bottom gold bands
  ctx.fillStyle = "rgba(244, 162, 97, 0.6)"
  ctx.fillRect(0, 8, canvas.width, 3)
  ctx.fillRect(0, canvas.height - 11, canvas.width, 3)

  // Title (rotated)
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = textColor
  ctx.font = "bold 22px Georgia, serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(title, 0, 4)
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// One shared canvas backs both the colour map and the derived normal map, so
// the (expensive) masonry draw runs once and both GPU textures stay cached.
const towerStoneCache = {
  color: null as THREE.CanvasTexture | null,
  normal: null as THREE.CanvasTexture | null,
  canvas: null as HTMLCanvasElement | null,
}

function towerStoneCanvas(): HTMLCanvasElement {
  if (towerStoneCache.canvas) return towerStoneCache.canvas
  towerStoneCache.canvas = buildTowerStoneCanvas()
  return towerStoneCache.canvas
}

export function getTowerStoneTexture(): THREE.CanvasTexture {
  if (!towerStoneCache.color) {
    const tex = new THREE.CanvasTexture(towerStoneCanvas())
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 8
    towerStoneCache.color = tex
  }
  return towerStoneCache.color
}

/**
 * A tangent-space normal map derived from the colour canvas (mortar joints read
 * as recessed, block faces as raised). Gives lit bevel/relief without any extra
 * geometry — one cheap extra texture sample on the standard material.
 */
export function getTowerStoneNormal(): THREE.CanvasTexture {
  if (!towerStoneCache.normal) {
    const tex = new THREE.CanvasTexture(normalFromHeight(towerStoneCanvas()))
    tex.colorSpace = THREE.NoColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 4
    towerStoneCache.normal = tex
  }
  return towerStoneCache.normal
}

/**
 * Procedural dry-masonry for a Vainakh (Chechen) combat tower: large readable
 * dressed blocks at the base courses, smaller infill above, in cool granite
 * grey with warm sandstone patches and the odd moss tint — deep, cavity-dark
 * mortar joints, edge-darkened faces, and vertical rain streaks. Macro value
 * blobs break up the obvious tiling. Tiles horizontally (wraps in X).
 */
function buildTowerStoneCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext("2d")!

  let seed = 20240219
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  // Deep cavity base — the recessed dry-laid joints between every block.
  ctx.fillStyle = "#14100a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Palette: cool granite greys, warm sandstone, rare moss-tinted blocks.
  const greys = ["#8d8472", "#79705f", "#9b917d", "#655d4d", "#847a67"]
  const sand = ["#9a7c52", "#88663f", "#a98c5e", "#7a6038"]
  const moss = ["#6f7355", "#5f6a48"]

  // Macro low-frequency value field — large soft light/dark washes so repeated
  // tiles don't read as identical.
  for (let b = 0; b < 7; b++) {
    const bx = rnd() * canvas.width
    const by = rnd() * canvas.height
    const r = 90 + rnd() * 160
    const up = rnd() < 0.5
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r)
    g.addColorStop(0, up ? "rgba(190,180,160,0.12)" : "rgba(20,15,10,0.16)")
    g.addColorStop(1, "transparent")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Coursed rubble — bigger, more readable blocks than before.
  let y = 0
  while (y < canvas.height) {
    const t = y / canvas.height
    const rowH = (74 - t * 28) * (0.85 + rnd() * 0.4)
    const avgW = 96 - t * 34 // wider, more readable blocks
    const offset = rnd() * avgW // running-bond stagger
    let x = -offset
    while (x < canvas.width) {
      const w = avgW * (0.65 + rnd() * 0.8)
      const roll = rnd()
      const pal = roll < 0.26 ? sand : roll < 0.32 ? moss : greys
      const base = pal[Math.floor(rnd() * pal.length)]
      const gap = 5 + rnd() * 3 // mortar joint width

      const bx = x + gap
      const by = y + gap
      const bw = w - gap
      const bh = rowH - gap
      if (bw > 2 && bh > 2) {
        // Face with a diagonal light gradient for hand-laid relief.
        const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh)
        grad.addColorStop(0, shade(base, 1.22))
        grad.addColorStop(0.5, base)
        grad.addColorStop(1, shade(base, 0.74))
        ctx.fillStyle = grad
        ctx.fillRect(bx, by, bw, bh)

        // Grain speckle.
        const speckles = 8 + Math.floor(rnd() * 12)
        for (let s = 0; s < speckles; s++) {
          ctx.fillStyle = `rgba(0,0,0,${0.05 + rnd() * 0.1})`
          ctx.fillRect(
            bx + rnd() * bw,
            by + rnd() * bh,
            1 + rnd() * 2.5,
            1 + rnd() * 2.5,
          )
        }
        // Edge darkening (cavity ambient occlusion around the block rim).
        ctx.strokeStyle = "rgba(0,0,0,0.34)"
        ctx.lineWidth = 2.5
        ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)
        // Top + left bevel highlight (dressed edge catching the light).
        ctx.fillStyle = "rgba(238,228,208,0.20)"
        ctx.fillRect(bx, by, bw, 2)
        ctx.fillRect(bx, by, 2, bh)
        // Bottom + right bevel shadow (recessed joint).
        ctx.fillStyle = "rgba(0,0,0,0.32)"
        ctx.fillRect(bx, by + bh - 2, bw, 2)
        ctx.fillRect(bx + bw - 2, by, 2, bh)
      }
      x += w
    }
    y += rowH
  }

  // Vertical rain streaks — thin dark weathering runs down the faces.
  for (let s = 0; s < 28; s++) {
    const sx = rnd() * canvas.width
    const sy = rnd() * canvas.height * 0.6
    const len = 60 + rnd() * 180
    const wdt = 1 + rnd() * 3
    const g = ctx.createLinearGradient(sx, sy, sx, sy + len)
    g.addColorStop(0, "transparent")
    g.addColorStop(0.4, `rgba(18,13,8,${0.05 + rnd() * 0.09})`)
    g.addColorStop(1, "transparent")
    ctx.fillStyle = g
    ctx.fillRect(sx, sy, wdt, len)
  }

  // Soft soot + rust washes drifting across the courses.
  for (let b = 0; b < 16; b++) {
    const bx = rnd() * canvas.width
    const by = rnd() * canvas.height
    const r = 18 + rnd() * 70
    const kind = rnd()
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r)
    if (kind < 0.5) g.addColorStop(0, `rgba(28,20,12,${0.06 + rnd() * 0.12})`)
    else if (kind < 0.8) g.addColorStop(0, `rgba(162,120,76,${0.07 + rnd() * 0.12})`)
    else g.addColorStop(0, `rgba(96,108,72,${0.05 + rnd() * 0.08})`) // moss wash
    g.addColorStop(1, "transparent")
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(bx, by, r, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas
}

/** Build a tangent-space normal map from a colour canvas via a Sobel on luma. */
function normalFromHeight(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width
  const h = src.height
  const sctx = src.getContext("2d")!
  const img = sctx.getImageData(0, 0, w, h).data
  const out = document.createElement("canvas")
  out.width = w
  out.height = h
  const octx = out.getContext("2d")!
  const dst = octx.createImageData(w, h)
  const lum = (x: number, y: number) => {
    const i = ((((y + h) % h) * w + ((x + w) % w)) * 4)
    return (img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114) / 255
  }
  const strength = 2.4
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (lum(x - 1, y) - lum(x + 1, y)) * strength
      const dy = (lum(x, y - 1) - lum(x, y + 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * w + x) * 4
      dst.data[i] = ((dx / len) * 0.5 + 0.5) * 255
      dst.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
      dst.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      dst.data[i + 3] = 255
    }
  }
  octx.putImageData(dst, 0, 0)
  return out
}

/** Multiply a hex colour's RGB by `f`, clamped. */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f))
  const b = Math.min(255, Math.round((n & 255) * f))
  return `rgb(${r},${g},${b})`
}

const keyboardCache = { tex: null as THREE.CanvasTexture | null }

export function getKeyboardTexture(): THREE.CanvasTexture {
  if (!keyboardCache.tex) keyboardCache.tex = keyboardTexture()
  return keyboardCache.tex
}

/**
 * Procedural MacBook keyboard deck: dark anodized base, a grid of rounded
 * backlit keys, and a trackpad below. One texture for the whole deck plane.
 */
export function keyboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 820
  canvas.height = 560
  const ctx = canvas.getContext("2d")!

  // Deck
  ctx.fillStyle = "#c9ccd1"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Keyboard inset
  const kbX = 40
  const kbY = 30
  const kbW = canvas.width - 80
  const kbH = 300
  ctx.fillStyle = "#16181d"
  roundRect(ctx, kbX, kbY, kbW, kbH, 14)
  ctx.fill()

  // Key grid — row layouts (counts per row, top→bottom).
  const rows = [13, 13, 11, 11, 10, 6]
  const padding = 10
  const gap = 6
  const rowH = (kbH - padding * 2 - gap * (rows.length - 1)) / rows.length
  rows.forEach((count, r) => {
    const y = kbY + padding + r * (rowH + gap)
    const widthDeck = kbW - padding * 2
    const isSpace = r === rows.length - 1
    if (isSpace) {
      // bottom row: a couple modifiers + spacebar
      const segs = [1, 1, 5, 1, 1]
      const total = segs.reduce((a, b) => a + b, 0)
      let x = kbX + padding
      segs.forEach((s) => {
        const w = (widthDeck - gap * (segs.length - 1)) * (s / total)
        key(ctx, x, y, w, rowH)
        x += w + gap
      })
    } else {
      const keyW = (widthDeck - gap * (count - 1)) / count
      for (let c = 0; c < count; c++) {
        key(ctx, kbX + padding + c * (keyW + gap), y, keyW, rowH)
      }
    }
  })

  // Trackpad
  const tpW = 300
  const tpH = 180
  const tpX = (canvas.width - tpW) / 2
  const tpY = kbY + kbH + 24
  ctx.fillStyle = "#b4b7bd"
  roundRect(ctx, tpX, tpY, tpW, tpH, 16)
  ctx.fill()
  ctx.strokeStyle = "rgba(0,0,0,0.12)"
  ctx.lineWidth = 2
  roundRect(ctx, tpX, tpY, tpW, tpH, 16)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function key(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = "#23262d"
  roundRect(ctx, x, y, w, h, 5)
  ctx.fill()
  // subtle top highlight (backlit edge)
  ctx.fillStyle = "rgba(120, 200, 235, 0.10)"
  roundRect(ctx, x + 1, y + 1, w - 2, Math.max(2, h * 0.18), 4)
  ctx.fill()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
