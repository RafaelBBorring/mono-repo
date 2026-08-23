export async function functionErrorMessage(error) {
  const fallback = error?.message || 'Não foi possível concluir a operação no servidor.'
  const response = error?.context
  if (!response || typeof response.json !== 'function') return fallback

  try {
    const payload = await (typeof response.clone === 'function' ? response.clone() : response).json()
    return payload?.error || payload?.message || fallback
  } catch {
    return fallback
  }
}
