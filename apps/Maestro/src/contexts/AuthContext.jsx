import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { demoUser } from '../data/demoData'
import { hasSupabaseConfig } from '../lib/config'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function mapSessionUser(session) {
  if (!session?.user) return null
  const metadata = session.user.user_metadata || {}
  const name = metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Criador'
  return {
    id: session.user.id,
    name,
    email: session.user.email,
    initials: name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),
    plan: 'Free',
  }
}

function finishAuthCallback(callbackPending) {
  if (!callbackPending.current) return
  callbackPending.current = false
  window.history.replaceState({}, document.title, window.location.pathname)
  const destination = sessionStorage.getItem('maestro-after-auth') || '/app/chat'
  sessionStorage.removeItem('maestro-after-auth')
  window.location.hash = destination
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (sessionStorage.getItem('maestro-demo') === 'true' ? demoUser : null))
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem('maestro-demo') === 'true')
  const callbackPending = useRef(new URLSearchParams(window.location.search).get('auth_callback') === '1')

  useEffect(() => {
    if (!supabase) return undefined
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (data.session) {
        setUser(mapSessionUser(data.session))
        setIsDemo(false)
        finishAuthCallback(callbackPending)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSessionUser(session))
      if (session) {
        setIsDemo(false)
        finishAuthCallback(callbackPending)
      }
      setLoading(false)
    })
    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isDemo,
      async enterDemo() {
        if (supabase) await supabase.auth.signOut({ scope: 'local' })
        sessionStorage.setItem('maestro-demo', 'true')
        setUser(demoUser)
        setIsDemo(true)
      },
      async signInWithEmail(email, displayName) {
        if (!supabase) {
          sessionStorage.setItem('maestro-demo', 'true')
          const fallbackName = displayName || email?.split('@')[0] || 'Criador'
          const initials = fallbackName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
          setUser({ ...demoUser, email, name: fallbackName, initials })
          setIsDemo(true)
          return { demo: true }
        }
        const redirectUrl = new URL(window.location.href)
        redirectUrl.hash = ''
        redirectUrl.search = ''
        redirectUrl.searchParams.set('auth_callback', '1')
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl.toString(),
            data: displayName ? { full_name: displayName } : undefined,
          },
        })
        if (error) throw error
        return { demo: false }
      },
      async signInWithPassword(email, password) {
        if (!supabase) {
          sessionStorage.setItem('maestro-demo', 'true')
          const fallbackName = email?.split('@')[0] || 'Criador'
          const initials = fallbackName.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
          setUser({ ...demoUser, email, name: fallbackName, initials })
          setIsDemo(true)
          return { demo: true }
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setUser(mapSessionUser(data.session))
        setIsDemo(false)
        return { demo: false }
      },
      async signOut() {
        sessionStorage.removeItem('maestro-demo')
        if (supabase && !isDemo) await supabase.auth.signOut()
        setUser(null)
        setIsDemo(false)
      },
    }),
    [isDemo, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
