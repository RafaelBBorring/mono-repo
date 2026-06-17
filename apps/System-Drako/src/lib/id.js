export function uid(prefix = 'id') {
  const r = Math.random().toString(36).slice(2, 10)
  const t = Date.now().toString(36)
  return `${prefix}_${t}${r}`
}

export function nowISO() {
  return new Date().toISOString()
}
