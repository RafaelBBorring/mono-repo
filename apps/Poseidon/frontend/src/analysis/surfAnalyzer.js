const FRAME_COUNT = 5
const W = 320
const H = 180
const GC = 8
const GR = 6
const QB = 12
const HIST_SIZE = QB * QB * QB

function isOceanLike(r, g, b) {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const sat = mx === 0 ? 0 : (mx - mn) / mx
  const lum = (mx + mn) / 2
  if (b > r + 10 && b > g + 10 && sat > 0.08) return true
  if (g > r + 15 && sat > 0.12 && lum > 40) return true
  if (sat < 0.10 && lum > 70) return true
  if (lum < 25) return true
  return false
}

function qBin(r, g, b) {
  return Math.floor(r / (256 / QB)) * QB * QB +
         Math.floor(g / (256 / QB)) * QB +
         Math.floor(b / (256 / QB))
}

function binToRgb(bin) {
  return {
    r: Math.floor(Math.floor(bin / (QB * QB)) * (256 / QB)),
    g: Math.floor((Math.floor(bin / QB) % QB) * (256 / QB)),
    b: Math.floor((bin % QB) * (256 / QB)),
  }
}

function sampleCell(img, col, row) {
  const cw = Math.floor(W / GC)
  const ch = Math.floor(H / GR)
  const cx = col * cw + Math.floor(cw / 2)
  const cy = row * ch + Math.floor(ch / 2)
  let rs = 0, gs = 0, bs = 0, n = 0
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const px = Math.max(0, Math.min(W - 1, cx + dx))
      const py = Math.max(0, Math.min(H - 1, cy + dy))
      const i = (py * img.width + px) * 4
      rs += img.data[i]; gs += img.data[i + 1]; bs += img.data[i + 2]; n++
    }
  }
  return { r: Math.round(rs / n), g: Math.round(gs / n), b: Math.round(bs / n) }
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
        if (idx >= FRAME_COUNT) { clearTimeout(timer); resolve({ frames, thumbnail: thumb }); return }
        video.currentTime = (dur * (idx + 0.5)) / FRAME_COUNT
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

function analyzeFrame(img) {
  const surfer = []
  for (let row = 0; row < GR; row++) {
    for (let col = 0; col < GC; col++) {
      const { r, g, b } = sampleCell(img, col, row)
      if (!isOceanLike(r, g, b)) {
        surfer.push({ row, col, r, g, b, bin: qBin(r, g, b) })
      }
    }
  }
  return surfer
}

export function createFingerprint(frames) {
  const colorMap = new Map()
  let total = 0
  let minR = GR, maxR = 0
  const allBins = new Set()

  for (const f of frames) {
    const cells = analyzeFrame(f)
    total += cells.length
    for (const c of cells) {
      minR = Math.min(minR, c.row)
      maxR = Math.max(maxR, c.row)
      colorMap.set(c.bin, (colorMap.get(c.bin) || 0) + 1)
      allBins.add(c.bin)
    }
  }

  if (total === 0) return null

  const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1])
  const hist = new Float32Array(HIST_SIZE)
  for (const [bin, cnt] of sorted) hist[bin] = cnt / total

  const top = sorted.slice(0, 8).map(([bin, cnt]) => ({ ...binToRgb(bin), w: cnt / total }))

  return {
    hist,
    top,
    allBins,
    bodyProp: (maxR - minR + 1) / GR,
    pixRatio: total / (GR * GC * frames.length),
  }
}

function sim(a, b) {
  if (!a || !b) return 0
  let dot = 0, ma = 0, mb = 0
  for (let i = 0; i < HIST_SIZE; i++) {
    dot += a.hist[i] * b.hist[i]
    ma += a.hist[i] ** 2
    mb += b.hist[i] ** 2
  }
  const hSim = dot / (Math.sqrt(ma) * Math.sqrt(mb) || 1)
  let overlap = 0
  for (const bin of a.allBins) if (b.allBins.has(bin)) overlap++
  const bSim = overlap / Math.max(a.allBins.size, b.allBins.size, 1)
  const pSim = 1 - Math.abs(a.bodyProp - b.bodyProp)
  return hSim * 0.45 + bSim * 0.40 + pSim * 0.15
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
            s += sim(fingerprints[a], fingerprints[b])
            n++
          }
        }
        const avg = s / n
        if (avg > best) { best = avg; bA = i; bB = j }
      }
    }
    if (best < 0.45) break
    clusters[bA].push(...clusters[bB])
    clusters.splice(bB, 1)
  }

  const assignments = new Map()
  clusters.forEach((cl, ci) => cl.forEach(idx => assignments.set(idx, ci)))
  return { assignments, clusterCount: clusters.length }
}

const PROGRESS_MSGS = [
  'Extraindo frames do vídeo...',
  'Analisando cores da roupa e acessórios...',
  'Identificando prancha e detalhes...',
  'Analisando proporções e estilo...',
  'Criando assinatura visual...',
]

export async function analyzeVideo(videoUrl, onProgress) {
  onProgress?.(PROGRESS_MSGS[0])
  const { frames, thumbnail } = await extractFramesAndThumb(videoUrl)
  if (!frames.length) return { fingerprint: null, thumbnail }

  for (let i = 0; i < frames.length; i++) {
    const msgIdx = Math.min(1 + i, PROGRESS_MSGS.length - 1)
    onProgress?.(PROGRESS_MSGS[msgIdx])
    await new Promise(r => setTimeout(r, 80))
  }

  const fingerprint = createFingerprint(frames)
  return { fingerprint, thumbnail }
}
