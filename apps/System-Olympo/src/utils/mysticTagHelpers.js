export function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag || '').trim()).filter(Boolean)
  if (typeof tags === 'string') return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  return []
}

export function getTagValue(tags, prefix) {
  const normalizedPrefix = `${String(prefix || '').trim().toLowerCase()}:`
  return normalizeTags(tags)
    .find((tag) => tag.toLowerCase().startsWith(normalizedPrefix))
    ?.slice(normalizedPrefix.length)
    ?.trim() || ''
}

export function setTagValue(tags, prefix, value) {
  const normalizedPrefix = `${String(prefix || '').trim().toLowerCase()}:`
  const next = normalizeTags(tags).filter((tag) => !tag.toLowerCase().startsWith(normalizedPrefix))
  if (String(value || '').trim()) {
    next.push(`${prefix}:${String(value).trim()}`)
  }
  return next
}

export function stripTagPrefix(tags, prefix) {
  const normalizedPrefix = `${String(prefix || '').trim().toLowerCase()}:`
  return normalizeTags(tags).filter((tag) => !tag.toLowerCase().startsWith(normalizedPrefix))
}
