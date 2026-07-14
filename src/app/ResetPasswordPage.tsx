import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Alert, Button, Card, Field, TextInput } from '../components/ui'

/** Se muestra cuando el usuario llega desde el enlace de "olvidé mi contraseña". */
export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }

    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) setError(error)
    // Si no hay error, el contexto ya limpió passwordRecovery y la app sigue a la sesión normal.
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 font-bold text-white">
            M
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Nueva contraseña</h1>
        </div>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nueva contraseña">
              <TextInput
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
            </Field>
            <Field label="Confirmar contraseña">
              <TextInput
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            {error && <Alert kind="error">{error}</Alert>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
