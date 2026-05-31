const SURFISTS = []
const FOLDERS  = []
const VIDEOS   = []

let nextId = 100

function delay(ms = 400) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200))
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
      sample_thumbs: [],
    })
  }
}

function classifyVideo() {
  if (SURFISTS.length === 0) {
    return {
      surfist_id: null,
      final_confidence: 0.15 + Math.random() * 0.2,
      status: 'unclassified',
      decision_reason: 'Nenhum surfista registrado. Registre surfistas e suba referências antes de classificar vídeos.',
    }
  }
  const surfist = SURFISTS[Math.floor(Math.random() * SURFISTS.length)]
  const rand = Math.random()
  if (rand < 0.50) {
    return {
      surfist_id: surfist.id,
      final_confidence: 0.85 + Math.random() * 0.13,
      status: 'auto_classified',
      decision_reason: null,
    }
  }
  if (rand < 0.85) {
    return {
      surfist_id: surfist.id,
      final_confidence: 0.40 + Math.random() * 0.44,
      status: 'pending_review',
      decision_reason: 'Confiança intermediária — enviando para revisão humana.',
    }
  }
  return {
    surfist_id: null,
    final_confidence: 0.15 + Math.random() * 0.2,
    status: 'unclassified',
    decision_reason: 'Nenhum agente atingiu confiança suficiente para classificação.',
  }
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
      embedding_counts: { face: 0, pose: 0, style: 0, board: 0 },
    }
    SURFISTS.push(s)
    syncFolders()
    return s
  },
  update: async (id, data) => { await delay(); return { ok: true } },
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
      s.embedding_counts.style += 1
    }
    return { updated: { face: true, pose: true, style: true } }
  },
  registerVideo: async (id) => {
    await delay(1200)
    const s = SURFISTS.find(s => s.id === id)
    if (s) {
      s.embedding_counts.face += 1
      s.embedding_counts.pose += 1
      s.embedding_counts.style += 1
      s.embedding_counts.board += 1
    }
    return { updated: { face: true, pose: true, style: true, board: true } }
  },
  clearEmbeddings: async (id) => {
    await delay()
    const s = SURFISTS.find(s => s.id === id)
    if (s) s.embedding_counts = { face: 0, pose: 0, style: 0, board: 0 }
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
    if (idx >= 0) VIDEOS.splice(idx, 1)
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
    const videoId  = `v${++nextId}`
    const filename = file?.name || 'video.mp4'
    const cls = classifyVideo()
    VIDEOS.push({
      id: videoId, filename, status: cls.status,
      final_confidence: cls.final_confidence,
      surfist_id: cls.surfist_id,
      duration: 5 + Math.random() * 20,
      face_confidence: 0.3 + Math.random() * 0.7,
      pose_confidence: 0.3 + Math.random() * 0.7,
      board_confidence: 0.3 + Math.random() * 0.7,
      style_confidence: 0.3 + Math.random() * 0.7,
      thumbnail_url: null, video_url: null,
      decision_reason: cls.decision_reason,
    })
    syncFolders()
    onProgress?.(100)
    return {
      video_id: videoId, filename,
      classStatus: cls.status,
      confidence: cls.final_confidence,
      reason: cls.decision_reason,
    }
  },
  sessionStatus: async (sessionId) => { await delay(); return { status: 'active' } },
}
