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

function createSurfer(name) {
  const num = SURFISTS.length + 1
  const s = {
    id: `s${++nextId}`,
    display_id: nextId,
    name: name || `Surfista ${num}`,
    folder_name: (name || `surfista_${num}`).toLowerCase().replace(/\s+/g, '_'),
    color_hex: COLORS[(num - 1) % COLORS.length],
    video_count: 0,
    embedding_counts: { face: 0, pose: 0, style: 0, board: 0 },
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
      reference_image: null,
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

export function applyClustering(assignments, fingerprints, videoIds) {
  const clusterIds = [...new Set(assignments.values())]
  const surfistMap = new Map()

  for (const cid of clusterIds) {
    const indices = [...assignments.entries()].filter(([, c]) => c === cid).map(([i]) => i)
    const hasGoodFp = indices.some(i => fingerprints[i] && fingerprints[i].pixRatio > 0.04)
    if (!hasGoodFp) continue
    const s = createSurfer()
    surfistMap.set(cid, s)
  }

  const results = []

  for (let i = 0; i < videoIds.length; i++) {
    const v = VIDEOS.find(v => v.id === videoIds[i])
    if (!v) continue

    const cid = assignments.get(i)
    const fp = fingerprints[i]

    if (cid !== undefined && surfistMap.has(cid) && fp) {
      const s = surfistMap.get(cid)
      v.surfist_id = s.id

      const { boardConf, clothConf, poseConf, faceConf, report } = generateAgentReports(fp)
      const finalConf = computeFinalConfidence(boardConf, clothConf, poseConf, faceConf)

      v.board_confidence     = boardConf
      v.clothing_confidence  = clothConf
      v.pose_confidence      = poseConf
      v.face_confidence      = faceConf
      v.final_confidence     = finalConf
      v.agent_report         = report

      if (finalConf >= 0.55) {
        v.status = 'auto_classified'
        v.decision_reason = null
      } else {
        v.status = 'pending_review'
        v.decision_reason = 'Confiança intermediária — enviando para revisão humana.'
      }

      results.push({
        video_id: v.id,
        surfistName: s.name,
        classStatus: v.status,
        confidence: v.final_confidence,
        reason: v.decision_reason,
        newSurfer: true,
      })
    } else {
      const fpData = fingerprints[i]
      const { boardConf, clothConf, poseConf, faceConf, report } = generateAgentReports(fpData)

      v.status = 'unclassified'
      v.surfist_id = null
      v.final_confidence     = computeFinalConfidence(boardConf, clothConf, poseConf, faceConf)
      v.decision_reason      = 'Não foi possível identificar o surfista com confiança suficiente.'
      v.board_confidence     = boardConf
      v.clothing_confidence  = clothConf
      v.pose_confidence      = poseConf
      v.face_confidence      = faceConf
      v.agent_report         = report

      results.push({
        video_id: v.id,
        surfistName: null,
        classStatus: 'unclassified',
        confidence: v.final_confidence,
        reason: v.decision_reason,
        newSurfer: false,
      })
    }
  }

  // Fix any videos that weren't processed (null fingerprints etc)
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
    const s = {
      id: `s${++nextId}`, display_id: nextId, name,
      folder_name: name.toLowerCase().replace(/\s+/g, '_'),
      color_hex: colorHex, video_count: 0,
    embedding_counts: { face: 0, pose: 0, clothing: 0, board: 0 },
    }
    SURFISTS.push(s)
    syncFolders()
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
