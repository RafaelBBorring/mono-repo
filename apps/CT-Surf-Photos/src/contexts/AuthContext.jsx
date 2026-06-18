import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ct-surf-auth')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  useEffect(() => {
    if (user) localStorage.setItem('ct-surf-auth', JSON.stringify(user))
    else localStorage.removeItem('ct-surf-auth')
  }, [user])

  const loginClient = (email, password) => {
    const name = email.split('@')[0]
    setUser({ email, name, role: 'client' })
    return true
  }

  const loginGuest = (name) => {
    setUser({ email: null, name, role: 'client' })
    return true
  }

  const loginAdmin = (email, password) => {
    if (email === 'admin@ctsurf.com' && password === 'admin123') {
      setUser({ email, name: 'Admin', role: 'admin' })
      return true
    }
    return false
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin: user?.role === 'admin', loginClient, loginGuest, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
