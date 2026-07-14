import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Business, Membership, Role } from '../lib/types'
import { useAuth } from '../auth/AuthProvider'

const STORAGE_KEY = 'mype.currentBusinessId'

interface BusinessContextValue {
  memberships: Membership[]
  currentBusiness: Business | null
  role: Role | null
  loading: boolean
  selectBusiness: (id: string) => void
  refresh: () => Promise<void>
  createBusiness: (name: string) => Promise<{ error: string | null }>
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [currentId, setCurrentId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setMemberships([])
      setLoading(false)
      return
    }
    setLoading(true)
    // IMPORTANTE: filtrar por el usuario actual. La política RLS permite a un
    // miembro ver TODAS las membresías de su negocio (para la lista de empleados),
    // así que sin este filtro el empleado también vería la membresía del admin y
    // podría resolver su rol como admin en la interfaz.
    const { data, error } = await supabase
      .from('memberships')
      .select('role, business:businesses(id, name, currency)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error cargando negocios:', error.message)
      setMemberships([])
    } else {
      // La relación business viene como objeto (FK a-uno).
      const rows = (data ?? []) as unknown as Membership[]
      setMemberships(rows)
    }
    setLoading(false)
    // Depende solo del id (estable), no del objeto `user` completo: Supabase
    // entrega un objeto nuevo en cada refresco silencioso del token, y si
    // dependiéramos del objeto, eso recargaría este provider y remontaría
    // <AppShell/>, perdiendo la pantalla en la que estaba el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const selectBusiness = (id: string) => {
    setCurrentId(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const createBusiness = async (name: string) => {
    const { data, error } = await supabase.rpc('create_business', { p_name: name })
    if (error) return { error: error.message }
    await load()
    if (typeof data === 'string') selectBusiness(data)
    return { error: null }
  }

  // Resolver negocio actual: el guardado, o el primero disponible.
  const current =
    memberships.find((m) => m.business.id === currentId) ?? memberships[0] ?? null

  return (
    <BusinessContext.Provider
      value={{
        memberships,
        currentBusiness: current?.business ?? null,
        role: current?.role ?? null,
        loading,
        selectBusiness,
        refresh: load,
        createBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness() {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness debe usarse dentro de <BusinessProvider>')
  return ctx
}
