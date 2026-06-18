const DEFAULT_MODEL = 'google/gemma-4-26b-a4b-it:free'

let _runtime = {}
let _ready = null

export function loadConfig() {
  if (_ready) return _ready
  _ready = (async () => {
    // Se a chave já está "baked" no build (ex.: GitHub Pages), não tentamos
    // buscar config.json — evita um 404 desnecessário no console.
    const bakedKey = import.meta.env.VITE_OPENROUTER_API_KEY || ''
    if (bakedKey && !bakedKey.includes('coloque-sua')) return
    try {
      const res = await fetch('config.json', { cache: 'no-cache' })
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object') _runtime = data
      }
    } catch {
      // dev local ou ausente — cai no fallback do import.meta.env
    }
  })()
  return _ready
}

export function getConfig() {
  const w = typeof window !== 'undefined' ? window.__DRAKO_CONFIG__ : null
  const apiKey =
    _runtime.OPENROUTER_API_KEY ||
    (w && w.OPENROUTER_API_KEY) ||
    import.meta.env.VITE_OPENROUTER_API_KEY ||
    ''
  const model =
    _runtime.OPENROUTER_MODEL ||
    (w && w.OPENROUTER_MODEL) ||
    import.meta.env.VITE_OPENROUTER_MODEL ||
    DEFAULT_MODEL
  return { apiKey, model }
}
