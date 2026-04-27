import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, getSupabaseAdmin } from '../lib/supabase'

const AuthContext = createContext(null)

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) {
    console.warn('[Auth] profile fetch via anon key failed, retrying with admin:', error.message)
    const admin = getSupabaseAdmin()
    const { data: data2, error: error2 } = await admin.from('profiles').select('*').eq('id', userId).single()
    if (error2) {
      console.error('[Auth] profile fetch via admin key also failed:', error2.message)
      return null
    }
    return data2
  }
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mountedRef.current) return
        if (session?.user) {
          setUser(session.user)
          const data = await fetchProfile(session.user.id)
          if (mountedRef.current && data) setProfile(data)
        }
      } catch (err) {
        console.error('[Auth] init error:', err)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
          .then((data) => { if (mountedRef.current && data) setProfile(data) })
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
