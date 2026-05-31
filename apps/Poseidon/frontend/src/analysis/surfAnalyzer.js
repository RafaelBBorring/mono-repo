import '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const W = 480
const H = 270
const QB = 8
const ZONE_HEAD_END = 0.28
const ZONE_TORSO_END = 0.62
const NUM_FRAMES = 10

let _model = null
let _modelLoading = null

async function loadModel() {
  if (_model) return _model
  if (_modelLoading) return _modelLoading
  _modelLoading = cocoSsd.load({ base: 'lite_mobilenet_v2' })
  _model = await _modelLoading
  _modelLoading = null
  return _model
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

function rgbToName(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  const l = (mx + mn) / 2 / 255
  const d = mx - mn
  const s = d === 0 ? 0 : d / (l > 0.5 ? 510 - mx - mn : mx + mn)
  if (l < 0.08) return 'preto'
  if (l > 0.92 && s < 0.08) return 'branco'
  if (s < 0.10) return l < 0.35 ? 'cinza escuro' : l < 0.65 ? 'cinza' : 'cinza claro'
  let h = 0
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (mx === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }
  if (h < 15 || h >= 345) return l < 0.35 ? 'vermelho escuro' : 'vermelho'
  if (h < 45) return l < 0.35 ? 'laranja escuro' : 'laranja'
  if (h < 70) return s < 0.4 ? 'bege' : 'amarelo'
  if (h < 150) return l < 0.30 ? 'verde escuro' : 'verde'
  if (h < 195) return l < 0.30 ? 'ciano escuro' : 'ciano'
  if (h < 260) return l < 0.30 ? 'azul escuro' : 'azul'
  if (h < 290) return l < 0.30 ? 'roxo escuro' : 'roxo'
  if (h < 345) return l < 0.30 ? 'rosa escuro' : 'rosa'
  return 'indefinido'
}

function formatPalette(top) {
  if (!top || !top.length) return 'sem cores detectadas'
  const named = top.map(c => `${rgbToName(c.r, c.g, c.b)} (${Math.round(c.w * 100)}%)`)
  return [...new Set(named)].slice(0, 3).join(', ')
}

function extractColorsFromRegion(img, x0, y0, x1, y1) {
  const { data, width } = img
  const counts = new Map()
  let total = 0
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const [, s, l] = rgbToHsl(r, g, b)
      if (l < 0.06 || (l > 0.92 && s < 0.08)) continue
      const bin = qBin(r, g, b)
      counts.set(bin, (counts.get(bin) || 0) + 1)
      total++
    }
  }
  if (total === 0) return { top: [], pixRatio: 0 }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const topBins = sorted.slice(0, 6)
  const area = Math.max(1, ((x1 - x0) / 2) * ((y1 - y0) / 2))
  return {
    top: topBins.map(([bin, cnt]) => {
      const [r, g, b] = binToRgb(bin)
      return { r, g, b, w: cnt / total }
    }),
    pixRatio: total / area,
  }
}

function extractZoneFixed(img, yStartFrac, yEndFrac) {
  const { width, height } = img
  const x0 = Math.floor(width * 0.10)
  const x1 = Math.floor(width * 0.90)
  const y0 = Math.floor(height * yStartFrac)
  const y1 = Math.floor(height * yEndFrac)
  const result = extractColorsFromRegion(img, x0, y0, x1, y1)
  return { ...result, bins: new Set(result.top.map(c => qBin(c.r, c.g, c.b))) }
}

export async function extractFramesAndThumb(videoUrl) {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.src = videoUrl
    video.muted = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve({ frames: [], thumbnail: null }), 20000)
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
        if (idx >= NUM_FRAMES) { clearTimeout(timer); resolve({ frames, thumbnail: thumb }); return }
        video.currentTime = (dur * (idx + 0.5)) / NUM_FRAMES
      }
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, W, H)
        frames.push(ctx.getImageData(0, 0, W, H))
        if (idx === 2) { try { thumb = canvas.toDataURL('image/jpeg', 0.75) } catch {} }
        idx++
        next()
      }
      next()
    }
    video.onerror = () => { clearTimeout(timer); resolve({ frames: [], thumbnail: null }) }
  })
}

async function detectWithModel(model, frames) {
  const boardDetections = []
  const personDetections = []

  for (const frame of frames) {
    const canvas = document.createElement('canvas')
    canvas.width = frame.width
    canvas.height = frame.height
    canvas.getContext('2d').putImageData(frame, 0, 0)

    try {
      const preds = await model.detect(canvas, 20, 0.25)
      for (const p of preds) {
        if (p.class === 'surfboard') boardDetections.push({ ...p.bbox, score: p.score })
        if (p.class === 'person') personDetections.push({ ...p.bbox, score: p.score })
      }
    } catch {}
  }

  return { boardDetections, personDetections }
}

function analyzeBoardFromDetections(frames, detections) {
  if (!detections.length) return { detected: false, confidence: 0, detail: '', palette: '', areaPct: 0 }

  const best = detections.reduce((a, b) => a.score > b.score ? a : b)
  const bestIdx = detections.indexOf(best)
  const frame = frames[Math.min(bestIdx, frames.length - 1)]

  const [bx, by, bw, bh] = [Math.floor(best[0] * frame.width / W),
    Math.floor(best[1] * frame.height / H),
    Math.floor(best[2] * frame.width / W),
    Math.floor(best[3] * frame.height / H)]

  const pad = 0.15
  const x0 = Math.max(0, Math.floor(bx - bw * pad))
  const y0 = Math.max(0, Math.floor(by - bh * pad))
  const x1 = Math.min(frame.width, Math.floor(bx + bw * (1 + pad)))
  const y1 = Math.min(frame.height, Math.floor(by + bh * (1 + pad)))

  const colors = extractColorsFromRegion(frame, x0, y0, x1, y1)
  const palette = formatPalette(colors.top)
  const areaPct = Math.round((bw * bh) / (frame.width * frame.height) * 100)
  const avgScore = detections.reduce((s, d) => s + d.score, 0) / detections.length
  const detectedFrames = detections.filter(d => d.score > 0.3).length

  const hasWhite = colors.top.some(c => { const l = (c.r + c.g + c.b) / 3 / 255; return l > 0.75 && c.w > 0.08 })
  const hasYellow = colors.top.some(c => c.r > 180 && c.g > 150 && c.b < 100 && c.w > 0.06)

  let shape = 'colorida'
  if (hasWhite && !hasYellow) shape = 'clara (resin/white)'
  else if (hasYellow) shape = 'amarela'

  const confidence = Math.min(0.95, 0.45 + avgScore * 0.35 + (detectedFrames / frames.length) * 0.15)

  let detail = `Prancha detectada pelo modelo COCO-SSD em ${detectedFrames}/${frames.length} frames `
  detail += `(score médio: ${(avgScore * 100).toFixed(0)}%). `
  detail += `Área: ${areaPct}% do frame. Paleta: ${palette}. `
  if (hasWhite) detail += 'Superfície clara típica de prancha resin/white. '
  if (hasYellow) detail += 'Possível prancha amarela ou adesivo. '

  return { detected: true, confidence, detail, palette, areaPct, shape, colors, hasWhite, hasYellow }
}

function analyzePersonFromDetections(frames, detections) {
  if (!detections.length) return { detected: false, torso: null, head: null, confidence: 0 }

  const best = detections.reduce((a, b) => a.score > b.score ? a : b)
  const bestIdx = detections.indexOf(best)
  const frame = frames[Math.min(bestIdx, frames.length - 1)]

  const [px, py, pw, ph] = [Math.floor(best[0] * frame.width / W),
    Math.floor(best[1] * frame.height / H),
    Math.floor(best[2] * frame.width / W),
    Math.floor(best[3] * frame.height / H)]

  const headY0 = py
  const headY1 = py + Math.floor(ph * 0.25)
  const torsoY0 = py + Math.floor(ph * 0.20)
  const torsoY1 = py + Math.floor(ph * 0.65)

  const headColors = extractColorsFromRegion(frame, px, headY0, px + pw, headY1)
  const torsoColors = extractColorsFromRegion(frame, px, torsoY0, px + pw, torsoY1)

  const avgScore = detections.reduce((s, d) => s + d.score, 0) / detections.length

  return {
    detected: true,
    head: headColors,
    torso: torsoColors,
    confidence: Math.min(0.90, 0.40 + avgScore * 0.30 + (detections.length / frames.length) * 0.20),
    personBox: { px, py, pw, ph },
    detectedFrames: detections.filter(d => d.score > 0.3).length,
    totalFrames: frames.length,
  }
}

function analyzeFallback(frames) {
  const boards = [], torsos = [], heads = []
  for (const f of frames) {
    boards.push(extractZoneFixed(f, ZONE_TORSO_END, 1))
    torsos.push(extractZoneFixed(f, ZONE_HEAD_END, ZONE_TORSO_END))
    heads.push(extractZoneFixed(f, 0, ZONE_HEAD_END))
  }
  const merge = (zones) => {
    const pr = zones.reduce((s, z) => s + z.pixRatio, 0) / zones.length
    const allTop = zones.flatMap(z => z.top)
    const counts = new Map()
    for (const c of allTop) counts.set(qBin(c.r, c.g, c.b), (counts.get(qBin(c.r, c.g, c.b)) || 0) + c.w)
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
    const total = sorted.reduce((s, [, w]) => s + w, 0) || 1
    return {
      pixRatio: pr,
      top: sorted.slice(0, 6).map(([bin, w]) => { const [r, g, b] = binToRgb(bin); return { r, g, b, w: w / total } }),
      bins: new Set(sorted.slice(0, 10).map(([bin]) => bin)),
    }
  }
  return { board: merge(boards), torso: merge(torsos), head: merge(heads) }
}

export async function createFingerprint(frames) {
  if (!frames.length) return null

  let useAI = false
  let boardAnalysis = null
  let personAnalysis = null
  let colorData = null

  try {
    const model = await loadModel()
    const { boardDetections, personDetections } = await detectWithModel(model, frames)

    if (boardDetections.length > 0) {
      boardAnalysis = analyzeBoardFromDetections(frames, boardDetections)
    }
    if (personDetections.length > 0) {
      personAnalysis = analyzePersonFromDetections(frames, personDetections)
    }
    useAI = true
  } catch (e) {
    console.warn('[surfAnalyzer] TF.js COCO-SSD failed, using color fallback:', e)
  }

  if (!useAI || (!boardAnalysis?.detected && !personAnalysis?.detected)) {
    colorData = analyzeFallback(frames)
  }

  const board = boardAnalysis?.detected ? boardAnalysis : null
  const torso = personAnalysis?.detected ? personAnalysis.torso : (colorData?.torso ?? null)
  const head = personAnalysis?.detected ? personAnalysis.head : (colorData?.head ?? null)

  const boardPixRatio = board ? board.areaPct / 100 : (colorData?.board?.pixRatio ?? 0)
  const torsoPixRatio = torso?.pixRatio ?? 0
  const headPixRatio = head?.pixRatio ?? 0

  if (torsoPixRatio < 0.003 && boardPixRatio < 0.003 && headPixRatio < 0.003) return null

  return {
    head, torso, board, colorData,
    pixRatio: boardPixRatio,
    boardDetected: board?.detected ?? false,
    personDetected: personAnalysis?.detected ?? false,
    usedAI: useAI,
  }
}

function zoneOverlap(a, b) {
  if (!a?.bins?.size || !b?.bins?.size) return 0.5
  let overlap = 0
  for (const bin of a.bins) if (b.bins.has(bin)) overlap++
  return overlap / Math.max(a.bins.size, b.bins.size, 1)
}

function similarity(a, b) {
  if (!a || !b) return 0
  const torsoA = a.torso, torsoB = b.torso
  const boardA = a.colorData?.board ?? a.board, boardB = b.colorData?.board ?? b.board
  const headA = a.head, headB = b.head
  const torsoSim = zoneOverlap(torsoA, torsoB)
  const boardSim = zoneOverlap(boardA, boardB)
  const headSim = zoneOverlap(headA, headB)
  return torsoSim * 0.40 + boardSim * 0.35 + headSim * 0.10 +
    (torsoSim * 0.5 + boardSim * 0.5) * 0.15
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
    if (best < 0.50) break
    clusters[bA].push(...clusters[bB])
    clusters.splice(bB, 1)
  }

  const assignments = new Map()
  clusters.forEach((cl, ci) => cl.forEach(idx => assignments.set(idx, ci)))
  return { assignments, clusterCount: clusters.length }
}

const MSGS = [
  'Carregando modelo de detecção...',
  'Extraindo frames do vídeo...',
  'Detectando prancha e surfista com IA...',
  'Analisando cores da roupa e prancha...',
  'Extraindo assinatura visual...',
  'Agrupando vídeos por similaridade...',
]

export async function analyzeVideo(videoUrl, onProgress) {
  onProgress?.(MSGS[0])
  try { await loadModel() } catch {}
  onProgress?.(MSGS[1])
  const { frames, thumbnail } = await extractFramesAndThumb(videoUrl)
  if (!frames.length) return { fingerprint: null, thumbnail }
  for (let i = 0; i < frames.length; i++) {
    onProgress?.(MSGS[Math.min(2 + Math.floor(i / 3), MSGS.length - 1)])
    await new Promise(r => setTimeout(r, 80))
  }
  const fingerprint = await createFingerprint(frames)
  return { fingerprint, thumbnail }
}
