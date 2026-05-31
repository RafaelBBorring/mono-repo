import { generateAgentReports, computeFinalConfidence } from '../analysis/surfAgentReports'

const SURFISTS = []
const FOLDERS  = []
const VIDEOS   = []
const VIDEO_FILES = new Map()

let nextId = 100

const COLORS = [
  '#0EA5E9','#10B981','#F59E0B','#F43F5E','#8B5CF6',
  '#EC4899','#14B8A6','#F97316','#6366F1','#84CC16',
]

function delay(ms = 400) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200))
}

function createSurfer(name, thumbnailUrl) {
  const num = SURFISTS.length + 1
  const s = {
    id: `s${++nextId}`,
    display_id: nextId,
    name: name || `Surfista ${num}`,
    folder_name: (name || `surfista_${num}`).toLowerCase().replace(/\s+/g, '_'),
    color_hex: COLORS[(num - 1) % COLORS.length],
    video_count: 0,
    reference_thumbnail: thumbnailUrl || null,
    embedding_counts: { face: 0, pose: 0, clothing: 0, board: 0 },
    fingerprint: null,
  }
  SURFISTS.push(s)
  syncFolders()
  return s
}

function syncFolders() {
  FOLDERS.length = 0
  for (const s of SURFISTS) {
    const vids = VIDEOS.filter(v => v.surfist_id === s.id)
    FOLDERS.push({
      surfist_id: s.id,
      name: s.name,
      folder_name: s.folder_name,
      color_hex: s.color_hex,
      total_videos: vids.length,
      verified_count: vids.filter(v => v.status === 'auto_classified').length,
      pending_review: vids.filter(v => v.status === 'pending_review').length,
      avg_confidence: vids.length ? vids.reduce((a, v) => a + v.final_confidence, 0) / vids.length : 0,
      reference_image: s.reference_thumbnail || vids.find(v => v.thumbnail_url)?.thumbnail_url || null,
      sample_thumbs: vids.filter(v => v.thumbnail_url).slice(0, 4).map(v => v.thumbnail_url),
    })
  }
}

export function updateVideoMedia(videoId, videoUrl, thumbnailUrl) {
  const v = VIDEOS.find(v => v.id === videoId)
  if (v) {
    if (videoUrl) v.video_url = videoUrl
    if (thumbnailUrl) v.thumbnail_url = thumbnailUrl
  }
  syncFolders()
}

export function getVideoFile(videoId) {
  return VIDEO_FILES.get(videoId)
}

function zoneOverlap(a, b) {
  const aBins = a?.bins || a?.top ? new Set((a.top || []).map(c => {
    const QB = 8
    return Math.floor(c.r / (256 / QB)) * QB * QB + Math.floor(c.g / (256 / QB)) * QB + Math.floor(c.b / (256 / QB))
  })) : new Set()
  const bBins = b?.bins || b?.top ? new Set((b.top || []).map(c => {
    const QB = 8
    return Math.floor(c.r / (256 / QB)) * QB * QB + Math.floor(c.g / (256 / QB)) * QB + Math.floor(c.b / (256 / QB))
  })) : new Set()
  if (!aBins.size || !bBins.size) return 0
  let ovlp = 0
  for (const b of aBins) if (bBins.has(b)) ovlp++
  return ovlp / Math.max(aBins.size, bBins.size, 1)
}

function fpSimilarity(a, b) {
  if (!a || !b) return 0
  const cdA = a.colorData || { board: a.board, torso: a.torso, head: a.head }
  const cdB = b.colorData || { board: b.board, torso: b.torso, head: b.head }
  const torsoSim = zoneOverlap(cdA.torso, cdB.torso)
  const boardSim = zoneOverlap(cdA.board, cdB.board)
  const headSim  = zoneOverlap(cdA.head, cdB.head)
  const base = torsoSim * 0.40 + boardSim * 0.35 + headSim * 0.10 + (torsoSim + boardSim) * 0.075
  const boardBonus = (a.boardDetected && b.boardDetected) ? 0.10 : 0
  return Math.min(1, base + boardBonus)
}

function matchExistingSurfist(fp) {
  let bestSurfist = null
  let bestSim = 0
  for (const s of SURFISTS) {
    if (!s.fingerprint) continue
    const sim = fpSimilarity(fp, s.fingerprint)
    if (sim > bestSim) {
      bestSim = sim
      bestSurfist = s
    }
  }
  return { surfist: bestSurfist, similarity: bestSim }
}

export function applyClustering(assignments, fingerprints, videoIds) {
  const results = []

  for (let i = 0; i < videoIds.length; i++) {
    const v = VIDEOS.find(v => v.id === videoIds[i])
    if (!v) continue

    const fp = fingerprints[i]
    const { boardConf, clothConf, poseConf, faceConf, report } = generateAgentReports(fp)
    const finalConf = computeFinalConfidence(boardConf, clothConf, poseConf, faceConf)

    v.board_confidence     = boardConf
    v.clothing_confidence  = clothConf
    v.pose_confidence      = poseConf
    v.face_confidence      = faceConf
    v.final_confidence     = finalConf
    v.agent_report         = report

    if (finalConf < 0.50) {
      v.status = 'unclassified'
      v.surfist_id = null
      v.decision_reason = finalConf < 0.20
        ? 'Sinal insuficiente para identificação.'
        : `Confiança de ${Math.round(finalConf * 100)}% abaixo do mínimo de 50%.`
      results.push({
        video_id: v.id, surfistName: null,
        classStatus: 'unclassified',
        confidence: finalConf, reason: v.decision_reason,
        newSurfer: false,
      })
      continue
    }

    // ≥50% — try to match existing surfist via fingerprint similarity
    const { surfist: match, similarity } = matchExistingSurfist(fp)

    let assignedSurfist = null
    let isNewSurfer = false

    if (match && similarity >= 0.45) {
      assignedSurfist = match
      isNewSurfer = false
      if (!match.fingerprint && fp) match.fingerprint = fp
    } else {
      assignedSurfist = createSurfer(null, v.thumbnail_url)
      if (fp) assignedSurfist.fingerprint = fp
      isNewSurfer = true
    }

    v.surfist_id = assignedSurfist.id

    if (finalConf >= 0.70) {
      v.status = 'auto_classified'
      v.decision_reason = null
    } else {
      v.status = 'pending_review'
      v.decision_reason = `Confiança de ${Math.round(finalConf * 100)}% — revisão humana recomendada.`
    }

    if (!assignedSurfist.reference_thumbnail && v.thumbnail_url) {
      assignedSurfist.reference_thumbnail = v.thumbnail_url
    }

    results.push({
      video_id: v.id,
      surfistName: assignedSurfist.name,
      classStatus: v.status,
      confidence: finalConf,
      reason: v.decision_reason,
      newSurfer: isNewSurfer,
    })
  }

  for (const v of VIDEOS) {
    if (v.status === 'analyzing') {
      const { boardConf, clothConf, poseConf, faceConf, report } = generateAgentReports(null)
      v.status = 'unclassified'
      v.surfist_id = null
      v.final_confidence     = computeFinalConfidence(boardConf, clothConf, poseConf, faceConf)
      v.decision_reason      = 'Não foi possível analisar este vídeo completamente.'
      v.board_confidence     = boardConf
      v.clothing_confidence  = clothConf
      v.pose_confidence      = poseConf
      v.face_confidence      = faceConf
      v.agent_report         = report
    }
  }

  syncFolders()
  return results
}

export const mockSurfistsAPI = {
  list: async () => { await delay(); return [...SURFISTS] },
  get: async (id) => { await delay(); return SURFISTS.find(s => s.id === id) },
  create: async (name, colorHex = '#4A90E2') => {
    await delay()
    const s = createSurfer(name)
    s.color_hex = colorHex
    return s
  },
  update: async (id, data) => {
    await delay()
    const s = SURFISTS.find(s => s.id === id)
    if (s && data.name) {
      s.name = data.name
      s.folder_name = data.name.toLowerCase().replace(/\s+/g, '_')
      syncFolders()
    }
    return { ok: true }
  },
  delete: async (id) => {
    await delay()
    const idx = SURFISTS.findIndex(s => s.id === id)
    if (idx >= 0) SURFISTS.splice(idx, 1)
    syncFolders()
    return { ok: true }
  },
  registerImage: async (id) => {
    await delay(800)
    const s = SURFISTS.find(s => s.id === id)
    if (s) {
      s.embedding_counts.face += 1
      s.embedding_counts.pose += 1
      s.embedding_counts.clothing += 1
    }
    return { updated: { face: true, pose: true, clothing: true } }
  },
  registerVideo: async (id) => {
    await delay(1200)
    const s = SURFISTS.find(s => s.id === id)
    if (s) {
      s.embedding_counts.face += 1
      s.embedding_counts.pose += 1
      s.embedding_counts.clothing += 1
      s.embedding_counts.board += 1
    }
    return { updated: { face: true, pose: true, clothing: true, board: true } }
  },
  clearEmbeddings: async (id) => {
    await delay()
    const s = SURFISTS.find(s => s.id === id)
    if (s) s.embedding_counts = { face: 0, pose: 0, clothing: 0, board: 0 }
    return { ok: true }
  },
}

export const mockReviewAPI = {
  folders: async () => {
    await delay()
    syncFolders()
    return {
      surfist_folders: [...FOLDERS],
      human_review_queue: VIDEOS.filter(v => v.status === 'pending_review').length,
      unclassified: VIDEOS.filter(v => v.status === 'unclassified').length,
    }
  },
  similarity: async () => { await delay(); return { matrix: {}, names: {} } },
  verifyFolder: async (id) => { await delay(); return { ok: true } },
  mergeFolders: async (source, target) => {
    await delay()
    VIDEOS.forEach(v => { if (v.surfist_id === source) v.surfist_id = target })
    const idx = SURFISTS.findIndex(s => s.id === source)
    if (idx >= 0) SURFISTS.splice(idx, 1)
    syncFolders()
    return { ok: true }
  },
  folderVideos: async (id) => {
    await delay()
    syncFolders()
    return {
      folder: FOLDERS.find(f => f.surfist_id === id) || null,
      videos: VIDEOS.filter(v => v.surfist_id === id),
      all_surfists: [...SURFISTS],
    }
  },
  unclassifiedVideos: async () => {
    await delay()
    return {
      folder: { name: 'Não classificado', folder_name: 'unclassified' },
      videos: VIDEOS.filter(v => v.status === 'unclassified'),
      all_surfists: [...SURFISTS],
    }
  },
  queue: async (page = 1, size = 20) => {
    await delay()
    const items = VIDEOS.filter(v => v.status === 'pending_review')
    return { items, total: items.length, page, size }
  },
  videoDetail: async (id) => {
    await delay()
    const v = VIDEOS.find(v => v.id === id)
    if (!v) return null
    return {
      ...v,
      surfist: SURFISTS.find(s => s.id === v.surfist_id) || null,
      all_surfists: [...SURFISTS],
      agent_report: v.agent_report || null,
      face_crop_url: null,
      pose_sketch_url: null,
      board_crop_url: null,
    }
  },
  confirm: async (id) => {
    await delay()
    const v = VIDEOS.find(v => v.id === id)
    if (v) v.status = 'auto_classified'
    syncFolders()
    return { ok: true }
  },
  reject: async (id) => {
    await delay()
    const v = VIDEOS.find(v => v.id === id)
    if (v) { v.status = 'unclassified'; v.surfist_id = null }
    syncFolders()
    return { ok: true }
  },
  assign: async (id, surfistId) => {
    await delay()
    const v = VIDEOS.find(v => v.id === id)
    if (v) { v.surfist_id = surfistId; v.status = 'auto_classified' }
    syncFolders()
    return { ok: true }
  },
  skip: async (id) => { await delay(); return { ok: true } },
  moveVideo: async (id, payload) => {
    await delay()
    const v = VIDEOS.find(v => v.id === id)
    if (!v) return { ok: true }
    if (payload.target === 'unclassified') { v.status = 'unclassified'; v.surfist_id = null }
    else if (payload.target === 'review') { v.status = 'pending_review' }
    else if (payload.target === 'surfist' && payload.surfist_id) { v.surfist_id = payload.surfist_id; v.status = 'auto_classified' }
    syncFolders()
    return { ok: true }
  },
  deleteVideo: async (id) => {
    await delay()
    const idx = VIDEOS.findIndex(v => v.id === id)
    if (idx >= 0) { VIDEO_FILES.delete(VIDEOS[idx].id); VIDEOS.splice(idx, 1) }
    syncFolders()
    return { ok: true }
  },
  progress: async () => {
    await delay()
    const total = VIDEOS.length
    const reviewed = VIDEOS.filter(v => v.status === 'auto_classified').length
    return {
      total_videos: total,
      auto_classified: reviewed,
      pending_review: VIDEOS.filter(v => v.status === 'pending_review').length,
      unclassified: VIDEOS.filter(v => v.status === 'unclassified').length,
      review_completion_pct: total ? Math.round((reviewed / total) * 100) : 0,
    }
  },
}

export const mockUploadAPI = {
  createSession: async () => { await delay(); return { session_id: 'session-' + Date.now() } },
  uploadSimple: async (sessionId, file, onProgress) => {
    for (let pct = 0; pct <= 80; pct += 25) {
      await new Promise(r => setTimeout(r, 180))
      onProgress?.(pct)
    }
    const videoId = `v${++nextId}`
    const filename = file?.name || 'video.mp4'
    if (file) VIDEO_FILES.set(videoId, file)
    VIDEOS.push({
      id: videoId, filename,
      status: 'analyzing',
      final_confidence: 0,
      surfist_id: null,
      duration: 5 + Math.random() * 20,
      face_confidence: 0, pose_confidence: 0,
      board_confidence: 0, clothing_confidence: 0,
      thumbnail_url: null, video_url: null,
      decision_reason: null,
    })
    onProgress?.(100)
    return { video_id: videoId, filename }
  },
  sessionStatus: async (sessionId) => { await delay(); return { status: 'active' } },
}
