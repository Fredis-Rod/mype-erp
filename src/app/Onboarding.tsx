import { useState } from 'react'
import { useBusiness } from './BusinessProvider'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Card, Field, TextInput } from '../components/ui'

export default function Onboarding() {
  const { createBusiness } = useBusiness()
  const { signOut, user } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await createBusiness(name.trim())
    setBusy(false)
    if (error) setError(error)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-page p-6">
      <div className="w-full max-w-md">
        <Card>
          <h1 className="text-lg font-bold text-ink">Crea tu negocio</h1>
          <p className="mt-1 mb-5 text-sm text-label">
            Este será tu espacio de trabajo. Quedarás como administrador y podrás agregar a un
            empleado después.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nombre del negocio">
              <TextInput
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Tienda La Esquina"
              />
            </Field>
            {error && <Alert kind="error">{error}</Alert>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Creando…' : 'Crear negocio'}
            </Button>
          </form>
        </Card>
        <div className="mt-4 flex items-center justify-between px-1 text-xs text-faint">
          <span>{user?.email}</span>
          <button className="hover:text-ink-soft" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
