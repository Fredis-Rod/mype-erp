import { Card } from '../components/ui'

/** Se muestra cuando faltan las credenciales de Supabase (.env.local). */
export default function ConfigNeeded() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        <Card>
          <h1 className="text-lg font-semibold text-slate-800">Falta conectar Supabase</h1>
          <p className="mt-1 text-sm text-slate-600">
            La app necesita las credenciales de tu proyecto Supabase para funcionar. Crea el archivo
            <code className="mx-1 rounded bg-slate-100 px-1">.env.local</code> en la raíz del
            proyecto (puedes copiar <code className="mx-1 rounded bg-slate-100 px-1">.env.example</code>)
            con:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
{`VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY`}
          </pre>
          <p className="mt-3 text-sm text-slate-600">
            Los encuentras en el panel de Supabase → <strong>Project Settings → API</strong>. Luego
            reinicia el servidor de desarrollo.
          </p>
        </Card>
      </div>
    </div>
  )
}
