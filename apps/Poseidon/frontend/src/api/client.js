import axios from 'axios'
import { mockSurfistsAPI, mockReviewAPI, mockUploadAPI, updateVideoMedia, getVideoFile, applyClustering } from './mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const API_URL = import.meta.env.VITE_API_URL || ''

export { updateVideoMedia, getVideoFile, applyClustering }

const BASE = API_URL ? `${API_URL}/api` : '/api'

export function mediaUrl(path) {
  if (!path) return path
  if (API_URL && path.startsWith('/')) return `${API_URL}${path}`
  return path
}

export const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
})

// ── Upload ────────────────────────────────────────────────────────────────────

export const uploadAPI = {
  createSession: () =>
    USE_MOCK ? mockUploadAPI.createSession() :
    api.post('/upload/session').then(r => r.data),

  uploadSimple: (sessionId, file, onProgress) =>
    USE_MOCK ? mockUploadAPI.uploadSimple(sessionId, file, onProgress) :
    (() => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/upload/simple/${sessionId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => onProgress?.(Math.round(e.loaded / e.total * 100)),
      }).then(r => r.data)
    })(),

  uploadChunk: (sessionId, chunkIndex, blob) => {
    const form = new FormData()
    form.append('chunk_index', chunkIndex)
    form.append('data', blob)
    return api.post(`/upload/chunk/${sessionId}`, form).then(r => r.data)
  },

  finalizeChunked: (sessionId, filename, totalChunks) => {
    const form = new FormData()
    form.append('filename', filename)
    form.append('total_chunks', totalChunks)
    return api.post(`/upload/finalize/${sessionId}`, form).then(r => r.data)
  },

  sessionStatus: sessionId =>
    api.get(`/upload/session/${sessionId}/status`).then(r => r.data),
}

export async function uploadFile(sessionId, file, onProgress) {
  if (USE_MOCK) {
    return mockUploadAPI.uploadSimple(sessionId, file, onProgress)
  }
  const CHUNK_SIZE = 10 * 1024 * 1024
  if (file.size <= CHUNK_SIZE) {
    return uploadAPI.uploadSimple(sessionId, file, onProgress)
  }
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const blob  = file.slice(start, start + CHUNK_SIZE)
    await uploadAPI.uploadChunk(sessionId, i, blob)
    onProgress?.(Math.round(((i + 1) / totalChunks) * 90))
  }
  const result = await uploadAPI.finalizeChunked(sessionId, file.name, totalChunks)
  onProgress?.(100)
  return result
}

// ── Surfists ──────────────────────────────────────────────────────────────────

export const surfistsAPI = {
  list: () =>
    USE_MOCK ? mockSurfistsAPI.list() :
    api.get('/surfists').then(r => r.data),

  get: id =>
    USE_MOCK ? mockSurfistsAPI.get(id) :
    api.get(`/surfists/${id}`).then(r => r.data),

  create: (name, colorHex = '#4A90E2') =>
    USE_MOCK ? mockSurfistsAPI.create(name, colorHex) :
    api.post('/surfists', { name, color_hex: colorHex }).then(r => r.data),

  update: (id, data) =>
    USE_MOCK ? mockSurfistsAPI.update(id, data) :
    api.put(`/surfists/${id}`, data).then(r => r.data),

  delete: id =>
    USE_MOCK ? mockSurfistsAPI.delete(id) :
    api.delete(`/surfists/${id}`).then(r => r.data),

  registerImage: (id, file) =>
    USE_MOCK ? mockSurfistsAPI.registerImage(id) :
    (() => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/surfists/${id}/register/image`, form).then(r => r.data)
    })(),

  registerVideo: (id, file) =>
    USE_MOCK ? mockSurfistsAPI.registerVideo(id) :
    (() => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/surfists/${id}/register/video`, form).then(r => r.data)
    })(),

  clearEmbeddings: id =>
    USE_MOCK ? mockSurfistsAPI.clearEmbeddings(id) :
    api.delete(`/surfists/${id}/embeddings`).then(r => r.data),
}

// ── Review ────────────────────────────────────────────────────────────────────

export const reviewAPI = {
  folders: () =>
    USE_MOCK ? mockReviewAPI.folders() :
    api.get('/review/folders').then(r => r.data),

  similarity: () =>
    USE_MOCK ? mockReviewAPI.similarity() :
    api.get('/review/folders/similarity').then(r => r.data),

  verifyFolder: id =>
    USE_MOCK ? mockReviewAPI.verifyFolder(id) :
    api.post(`/review/folders/${id}/verify`).then(r => r.data),

  mergeFolders: (source, target) =>
    USE_MOCK ? mockReviewAPI.mergeFolders(source, target) :
    api.post('/review/folders/merge', {
      source_surfist_id: source,
      target_surfist_id: target,
    }).then(r => r.data),

  folderVideos: id =>
    USE_MOCK ? mockReviewAPI.folderVideos(id) :
    api.get(`/review/folders/${id}/videos`).then(r => r.data),

  unclassifiedVideos: () =>
    USE_MOCK ? mockReviewAPI.unclassifiedVideos() :
    api.get('/review/unclassified/videos').then(r => r.data),

  queue: (page = 1, size = 20, status = 'pending_review') =>
    USE_MOCK ? mockReviewAPI.queue(page, size) :
    api.get('/review/queue', { params: { page, size, status } }).then(r => r.data),

  videoDetail: id =>
    USE_MOCK ? mockReviewAPI.videoDetail(id) :
    api.get(`/review/video/${id}`).then(r => r.data),

  confirm: id =>
    USE_MOCK ? mockReviewAPI.confirm(id) :
    api.post(`/review/video/${id}/confirm`).then(r => r.data),

  reject: id =>
    USE_MOCK ? mockReviewAPI.reject(id) :
    api.post(`/review/video/${id}/reject`).then(r => r.data),

  assign: (id, surfistId) =>
    USE_MOCK ? mockReviewAPI.assign(id, surfistId) :
    api.post(`/review/video/${id}/assign`, { surfist_id: surfistId }).then(r => r.data),

  skip: id =>
    USE_MOCK ? mockReviewAPI.skip(id) :
    api.post(`/review/video/${id}/skip`).then(r => r.data),

  moveVideo: (id, payload) =>
    USE_MOCK ? mockReviewAPI.moveVideo(id, payload) :
    api.post(`/review/video/${id}/move`, payload).then(r => r.data),

  deleteVideo: id =>
    USE_MOCK ? mockReviewAPI.deleteVideo(id) :
    api.delete(`/review/video/${id}`).then(r => r.data),

  progress: () =>
    USE_MOCK ? mockReviewAPI.progress() :
    api.get('/review/progress').then(r => r.data),
}
