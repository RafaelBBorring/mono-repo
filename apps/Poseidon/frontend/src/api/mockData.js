const SURFISTS = [
  {
    id: 's1', display_id: 1, name: 'João Silva', folder_name: 'joao_silva',
    color_hex: '#0EA5E9', video_count: 12,
    embedding_counts: { face: 5, pose: 5, style: 5, board: 4 },
  },
  {
    id: 's2', display_id: 2, name: 'Ana Santos', folder_name: 'ana_santos',
    color_hex: '#10B981', video_count: 8,
    embedding_counts: { face: 4, pose: 4, style: 3, board: 3 },
  },
  {
    id: 's3', display_id: 3, name: 'Pedro Lima', folder_name: 'pedro_lima',
    color_hex: '#F59E0B', video_count: 5,
    embedding_counts: { face: 3, pose: 2, style: 2, board: 2 },
  },
]

const FOLDERS = [
  {
    surfist_id: 's1', name: 'João Silva', folder_name: 'joao_silva',
    color_hex: '#0EA5E9', total_videos: 12, verified_count: 8,
    pending_review: 4, avg_confidence: 0.88,
    reference_image: null, sample_thumbs: [],
  },
  {
    surfist_id: 's2', name: 'Ana Santos', folder_name: 'ana_santos',
    color_hex: '#10B981', total_videos: 8, verified_count: 6,
    pending_review: 2, avg_confidence: 0.82,
    reference_image: null, sample_thumbs: [],
  },
  {
    surfist_id: 's3', name: 'Pedro Lima', folder_name: 'pedro_lima',
    color_hex: '#F59E0B', total_videos: 5, verified_count: 2,
    pending_review: 3, avg_confidence: 0.71,
    reference_image: null, sample_thumbs: [],
  },
]

const VIDEOS = [
  {
    id: 'v1', filename: 'session1_joao_cut01.mp4', status: 'pending_review',
    final_confidence: 0.72, surfist_id: 's1', duration: 14.3,
    face_confidence: 0.85, pose_confidence: 0.65, board_confidence: 0.70, style_confidence: 0.68,
    thumbnail_url: null, video_url: null, decision_reason: 'Face match alta (85%), mas pose parcialmente visível — enviando para revisão humana.',
  },
  {
    id: 'v2', filename: 'session1_ana_wave03.mp4', status: 'pending_review',
    final_confidence: 0.58, surfist_id: 's2', duration: 8.7,
    face_confidence: 0.60, pose_confidence: 0.55, board_confidence: 0.62, style_confidence: 0.53,
    thumbnail_url: null, video_url: null, decision_reason: 'Confiabilidade média — rosto parcialmente obscurecido pelo spray.',
  },
  {
    id: 'v3', filename: 'session2_pedro_tube.mp4', status: 'pending_review',
    final_confidence: 0.66, surfist_id: 's3', duration: 22.1,
    face_confidence: 0.50, pose_confidence: 0.78, board_confidence: 0.72, style_confidence: 0.64,
    thumbnail_url: null, video_url: null, decision_reason: 'Boa detecção de pose e prancha, mas face não visível durante o tubo.',
  },
  {
    id: 'v4', filename: 'session1_joao_air02.mp4', status: 'auto_classified',
    final_confidence: 0.92, surfist_id: 's1', duration: 6.2,
    face_confidence: 0.95, pose_confidence: 0.90, board_confidence: 0.88, style_confidence: 0.94,
    thumbnail_url: null, video_url: null,
  },
  {
    id: 'v5', filename: 'session3_unknown_wave1.mp4', status: 'unclassified',
    final_confidence: 0.28, surfist_id: null, duration: 11.5,
    face_confidence: 0.15, pose_confidence: 0.35, board_confidence: 0.30, style_confidence: 0.22,
    thumbnail_url: null, video_url: null, decision_reason: 'Nenhum agente atingiu confiança suficiente. Possível novo surfista.',
  },
]

let nextId = 100

function delay(ms = 400) {
  return new Promise(r => setTimeout(r, ms + Math.random() * 200))
}

export const mockSurfistsAPI = {
  list: async () => { await delay(); return SURFISTS },
  get: async (id) => { await delay(); return SURFISTS.find(s => s.id === id) },
  create: async (name, colorHex = '#4A90E2') => {
    await delay()
    const s = {
      id: `s${++nextId}`, display_id: nextId, name, folder_name: name.toLowerCase().replace(/\s+/g, '_'),
      color_hex: colorHex, video_count: 0,
      embedding_counts: { face: 0, pose: 0, style: 0, board: 0 },
    }
    SURFISTS.push(s)
    return s
  },
  update: async (id, data) => { await delay(); return { ok: true } },
  delete: async (id) => {
    await delay()
    const idx = SURFISTS.findIndex(s => s.id === id)
    if (idx >= 0) SURFISTS.splice(idx, 1)
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
    return {
      surfist_folders: FOLDERS,
      human_review_queue: VIDEOS.filter(v => v.status === 'pending_review').length,
      unclassified: VIDEOS.filter(v => v.status === 'unclassified').length,
    }
  },
  similarity: async () => {
    await delay()
    return { matrix: {}, names: {} }
  },
  verifyFolder: async (id) => { await delay(); return { ok: true } },
  mergeFolders: async (source, target) => { await delay(); return { ok: true } },
  folderVideos: async (id) => {
    await delay()
    return {
      folder: FOLDERS.find(f => f.surfist_id === id),
      videos: VIDEOS.filter(v => v.surfist_id === id),
      all_surfists: SURFISTS,
    }
  },
  unclassifiedVideos: async () => {
    await delay()
    return {
      folder: { name: 'Não classificado', folder_name: 'unclassified' },
      videos: VIDEOS.filter(v => v.status === 'unclassified'),
      all_surfists: SURFISTS,
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
      surfist: SURFISTS.find(s => s.id === v.surfist_id),
      all_surfists: SURFISTS,
      face_crop_url: null,
      pose_sketch_url: null,
      board_crop_url: null,
    }
  },
  confirm: async (id) => { await delay(); return { ok: true } },
  reject: async (id) => { await delay(); return { ok: true } },
  assign: async (id, surfistId) => { await delay(); return { ok: true } },
  skip: async (id) => { await delay(); return { ok: true } },
  moveVideo: async (id, payload) => { await delay(); return { ok: true } },
  deleteVideo: async (id) => { await delay(); return { ok: true } },
  progress: async () => {
    await delay()
    const total = VIDEOS.length
    const reviewed = VIDEOS.filter(v => v.status === 'auto_classified').length
    return {
      total_videos: total,
      auto_classified: reviewed,
      pending_review: VIDEOS.filter(v => v.status === 'pending_review').length,
      unclassified: VIDEOS.filter(v => v.status === 'unclassified').length,
      review_completion_pct: Math.round((reviewed / total) * 100),
    }
  },
}

export const mockUploadAPI = {
  createSession: async () => { await delay(); return { session_id: 'demo-session-' + Date.now() } },
  uploadSimple: async (sessionId, file, onProgress) => {
    await delay(1500)
    onProgress?.(100)
    return { video_id: `v${++nextId}`, filename: file?.name || 'video.mp4' }
  },
  sessionStatus: async (sessionId) => { await delay(); return { status: 'active' } },
}
