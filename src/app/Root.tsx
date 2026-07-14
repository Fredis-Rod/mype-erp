import { hasSupabaseConfig } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useBusiness } from './BusinessProvider'
import { FullScreenSpinner } from '../components/ui'
import ConfigNeeded from './ConfigNeeded'
import LoginPage from '../modules/auth/LoginPage'
import ResetPasswordPage from './ResetPasswordPage'
import Onboarding from './Onboarding'
import AppShell from './AppShell'

export default function Root() {
  const { loading: authLoading, user, passwordRecovery } = useAuth()
  const { loading: bizLoading, memberships } = useBusiness()

  if (!hasSupabaseConfig) return <ConfigNeeded />
  if (authLoading) return <FullScreenSpinner />
  // Se revisa antes que nada: el enlace de "olvidé mi contraseña" también inicia sesión.
  if (passwordRecovery) return <ResetPasswordPage />
  if (!user) return <LoginPage />
  if (bizLoading) return <FullScreenSpinner label="Cargando tu negocio…" />
  if (memberships.length === 0) return <Onboarding />

  return <AppShell />
}
