import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Usuario, Empresa } from '../types'

interface AuthContextType {
  user: Usuario | null
  empresa: Empresa | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, nome: string, empresaNome: string) => Promise<string | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUser(session.user.id)
      else { setUser(null); setEmpresa(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(authUserId: string) {
    const { data } = await supabase
      .from('usuarios')
      .select('*, empresas(*)')
      .eq('id', authUserId)
      .single()

    if (data) {
      setUser(data as unknown as Usuario)
      setEmpresa((data as unknown as { empresas: Empresa }).empresas)
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signUp(email: string, password: string, nome: string, empresaNome: string): Promise<string | null> {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) return authError.message

    if (authData.user) {
      const { data: empresaData, error: empError } = await supabase
        .from('empresas').insert({ nome: empresaNome }).select().single()
      if (empError) return empError.message

      const { error: userError } = await supabase
        .from('usuarios').insert({
          id: authData.user.id, email, nome, empresa_id: empresaData.id, cargo: 'admin'
        })
      if (userError) return userError.message
    }
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setEmpresa(null)
  }

  async function resetPassword(email: string): Promise<string | null> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/recuperar-senha`,
    })
    return error?.message ?? null
  }

  return (
    <AuthContext.Provider value={{ user, empresa, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
