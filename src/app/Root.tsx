import { hasSupabaseConfig } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useBusiness } from './BusinessProvider'
import { FullScreenSpinner } from '../components/ui'
import ConfigNeeded from './ConfigNeeded'
import LoginPage from '../modules/auth/LoginPage'
import Onboarding from './Onboarding'
import AppShell from './AppShell'

export default function Root() {
  const { loading: authLoading, user } = useAuth()
  const { loading: bizLoading, memberships } = useBusiness()

  if (!hasSupabaseConfig) return <ConfigNeeded />
  if (authLoading) return <FullScreenSpinner />
  if (!user) return <LoginPage />
  if (bizLoading) return <FullScreenSpinner label="Cargando tu negocio…" />
  if (memberships.length === 0) return <Onboarding />

  return <AppShell />
}
