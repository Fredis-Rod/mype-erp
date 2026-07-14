import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true solo si hay credenciales reales configuradas en .env.local */
export const hasSupabaseConfig = Boolean(url && anon)

// Si faltan credenciales usamos un placeholder válido (no se usará: la UI
// muestra primero la pantalla de configuración). Así evitamos que createClient
// lance una excepción al arrancar.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anon || 'anon-placeholder',
)
