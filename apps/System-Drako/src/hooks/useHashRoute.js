import { useEffect, useState, useCallback } from 'react'

export function useHashRoute() {
  const get = () => {
    const h = window.location.hash.replace(/^#\/?/, '')
    const parts = h.split('/').filter(Boolean)
    return { path: parts, raw: h }
  }
  const [route, setRoute] = useState(get)

  useEffect(() => {
    const onHash = () => setRoute(get())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((to) => {
    const target = to.startsWith('#') ? to : `#/${to.replace(/^\/+/, '')}`
    if (window.location.hash === target) setRoute(get())
    else window.location.hash = target
  }, [])

  return { route, navigate }
}

export function routeTo(to) {
  const target = to.startsWith('#') ? to : `#/${to.replace(/^\/+/, '')}`
  window.location.hash = target
}
