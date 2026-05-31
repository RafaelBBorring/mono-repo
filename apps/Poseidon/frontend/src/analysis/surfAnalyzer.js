const W = 240
const H = 135
const QB = 8
const QB_SIZE = QB * QB * QB
const ZONE_HEAD_END = 0.28
const ZONE_TORSO_END = 0.62

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  let h = 0, s = 0, l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (mx === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s, l]
}

function qBin(r, g, b) {
  return Math.floor(r / (256 / QB)) * QB * QB +
         Math.floor(g / (256 / QB)) * QB +
         Math.floor(b / (256 / QB))
}

function binToRgb(bin) {
  return [
    Math.floor(Math.floor(bin / (QB * QB)) * (256 / QB) + 256 / QB / 2),
    Math.floor((Math.floor(bin / QB) % QB) * (256 / QB) + 256 / QB / 2),
    Math.floor((bin % QB) * (256 / QB) + 256 / QB / 2),
  ]
}

function findBgBins(img) {
  const { data, width, height } = img
  const counts = new Map()
  const rows = [0, 1, 2, height - 3, height - 2, height - 1]
  for (const y of rows) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4
      const bin = qBin(data[i], data[i + 1], data[i + 2])
      counts.set(bin, (counts.get(bin) || 0) + 1)
    }
  }
  for (let y = 0; y < height; y += 3) {
    for (const x of [0, 1, 2, width - 3, width - 2, width - 1]) {
      const i = (y * width + x) * 4
      const bin = qBin(data[i], data[i + 1], data[i + 2])
      counts.set(bin, (counts.get(bin) || 0) + 1)
    }
  }
  return new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b]) => b))
}

function isBg(r, g, b, bgBins) {
  if (bgBins.has(qBin(r, g, b))) return true
  const [, s, l] = rgbToHsl(r, g, b)
  if (s < 0.06 && l > 0.40) return true
  if (l < 0.06) return true
  if (l > 0.92 && s < 0.08) return true
  return false
}

function extractZone(img, yStartFrac, yEndFrac, bgBins) {
  const { data, width, height } = img
  const x0 = Math.floor(width * 0.15)
  const x1 = Math.floor(width * 0.85)
  const y0 = Math.floor(height * yStartFrac)
  const y1 = Math.floor(height * yEndFrac)
  const counts = new Map()
  let total = 0

  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (isBg(r, g, b, bgBins)) continue
      const bin = qBin(r, g, b)
      counts.set(bin, (counts.get(bin) || 0) + 1)
      total++
    }
  }

  if (total === 0) return { bins: new Set(), top: [], pixRatio: 0 }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const topBins = sorted.slice(0, 6)
  return {
    bins: new Set(sorted.slice(0, 10).map(([b]) => b)),
    top: topBins.map(([bin, cnt]) => { const [r, g, b] = binToRgb(bin); return { r, g, b, w: cnt / total } }),
    pixRatio: total / Math.max(1, ((x1 - x0) / 2) * ((y1 - y0) / 2)),
  }
}

export async function extractFramesAndThumb(videoUrl) {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.src = videoUrl
    video.muted = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve({ frames: [], thumbnail: null }), 15000)
    video.onloadedmetadata = () => {
      const dur = video.duration
      if (!dur || !video.videoWidth) { clearTimeout(timer); resolve({ frames: [], thumbnail: null }); return }
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      const frames = []
      let thumb = null
      let idx = 0
      const next = () => {
        if (idx >= 5) { clearTimeout(timer); resolve({ frames, thumbnail: thumb }); return }
        video.currentTime = (dur * (idx + 0.5)) / 5
      }
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, W, H)
        frames.push(ctx.getImageData(0, 0, W, H))
        if (idx === 1) { try { thumb = canvas.toDataURL('image/jpeg', 0.7) } catch {} }
        idx++
        next()
      }
      next()
    }
    video.onerror = () => { clearTimeout(timer); resolve({ frames: [], thumbnail: null }) }
  })
}

export function createFingerprint(frames) {
  const headZones = []
  const torsoZones = []
  const boardZones = []
  const allBins = new Set()

  for (const f of frames) {
    const bgBins = findBgBins(f)
    const head = extractZone(f, 0, ZONE_HEAD_END, bgBins)
    const torso = extractZone(f, ZONE_HEAD_END, ZONE_TORSO_END, bgBins)
    const board = extractZone(f, ZONE_TORSO_END, 1, bgBins)
    headZones.push(head)
    torsoZones.push(torso)
    boardZones.push(board)
    for (const z of [head, torso, board]) {
      for (const b of z.bins) allBins.add(b)
    }
  }

  const mergeZones = (zones) => {
    const merged = new Map()
    let totalPix = 0
    for (const z of zones) {
      totalPix += z.pixRatio
      for (const b of z.bins) {
        merged.set(b, (merged.get(b) || 0) + 1)
      }
    }
    return { bins: new Set(merged.keys()), pixRatio: totalPix / zones.length }
  }

  const head = mergeZones(headZones)
  const torso = mergeZones(torsoZones)
  const board = mergeZones(boardZones)

  if (torso.pixRatio < 0.005 && board.pixRatio < 0.005 && head.pixRatio < 0.005) return null

  return { head, torso, board, allBins }
}

function zoneOverlap(a, b) {
  if (!a.bins.size || !b.bins.size) return 0.5
  let overlap = 0
  for (const bin of a.bins) if (b.bins.has(bin)) overlap++
  return overlap / Math.max(a.bins.size, b.bins.size, 1)
}

function similarity(a, b) {
  if (!a || !b) return 0
  const torsoSim = zoneOverlap(a.torso, b.torso)
  const boardSim = zoneOverlap(a.board, b.board)
  const headSim = zoneOverlap(a.head, b.head)
  let allOvlp = 0
  for (const bin of a.allBins) if (b.allBins.has(bin)) allOvlp++
  const allSim = allOvlp / Math.max(a.allBins.size, b.allBins.size, 1)
  return torsoSim * 0.40 + boardSim * 0.35 + headSim * 0.10 + allSim * 0.15
}

export function clusterVideos(fingerprints) {
  const valid = fingerprints.map((fp, i) => ({ fp, i })).filter(x => x.fp)
  if (!valid.length) return { assignments: new Map(), clusterCount: 0 }

  const clusters = valid.map(x => [x.i])
  while (clusters.length > 1) {
    let best = -1, bA = -1, bB = -1
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        let s = 0, n = 0
        for (const a of clusters[i]) {
          for (const b of clusters[j]) {
            s += similarity(fingerprints[a], fingerprints[b])
            n++
          }
        }
        const avg = s / n
        if (avg > best) { best = avg; bA = i; bB = j }
      }
    }
    if (best < 0.55) break
    clusters[bA].push(...clusters[bB])
    clusters.splice(bB, 1)
  }

  const assignments = new Map()
  clusters.forEach((cl, ci) => cl.forEach(idx => assignments.set(idx, ci)))
  return { assignments, clusterCount: clusters.length }
}

const MSGS = [
  'Extraindo frames do vídeo...',
  'Analisando cores da roupa...',
  'Identificando prancha e acessórios...',
  'Analisando proporções e estilo...',
  'Criando assinatura visual...',
]

export async function analyzeVideo(videoUrl, onProgress) {
  onProgress?.(MSGS[0])
  const { frames, thumbnail } = await extractFramesAndThumb(videoUrl)
  if (!frames.length) return { fingerprint: null, thumbnail }
  for (let i = 0; i < frames.length; i++) {
    onProgress?.(MSGS[Math.min(1 + i, MSGS.length - 1)])
    await new Promise(r => setTimeout(r, 60))
  }
  const fingerprint = createFingerprint(frames)
  return { fingerprint, thumbnail }
}
