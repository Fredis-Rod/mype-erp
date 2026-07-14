import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Alert, Button, Card, Field, TextInput } from '../../components/ui'

type Mode = 'login' | 'signup' | 'recover'

export default function LoginPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)

    if (mode === 'recover') {
      const { error } = await requestPasswordReset(email.trim())
      setBusy(false)
      if (error) { setError(error); return }
      setNotice('Si ese correo tiene una cuenta, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja (y spam).')
      return
    }

    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(email.trim(), password)
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    if (mode === 'signup') {
      setNotice(
        'Cuenta creada. Si tu proyecto exige confirmar correo, revisa tu email; si no, ya puedes iniciar sesión.',
      )
      setMode('login')
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 font-bold text-white">
            M
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">MYPE ERP</h1>
            <p className="text-xs text-slate-500">Inventario · Ventas · Finanzas</p>
          </div>
        </div>

        <Card>
          {mode !== 'recover' && (
            <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm">
              <button
                className={`flex-1 rounded-md py-1.5 font-medium ${mode === 'login' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                onClick={() => { setMode('login'); setError(null); setNotice(null) }}
                type="button"
              >
                Iniciar sesión
              </button>
              <button
                className={`flex-1 rounded-md py-1.5 font-medium ${mode === 'signup' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                onClick={() => { setMode('signup'); setError(null); setNotice(null) }}
                type="button"
              >
                Crear cuenta
              </button>
            </div>
          )}

          {mode === 'recover' && (
            <h2 className="mb-4 text-sm font-medium text-slate-700">Recuperar contraseña</h2>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Field label="Correo">
              <TextInput
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </Field>

            {mode !== 'recover' && (
              <Field label="Contraseña">
                <TextInput
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </Field>
            )}

            {mode === 'login' && (
              <button
                type="button"
                className="text-xs text-emerald-600 hover:underline"
                onClick={() => { setMode('recover'); setError(null); setNotice(null) }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {error && <Alert kind="error">{error}</Alert>}
            {notice && <Alert kind="success">{notice}</Alert>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? 'Procesando…'
                : mode === 'login'
                  ? 'Entrar'
                  : mode === 'signup'
                    ? 'Registrarme'
                    : 'Enviar enlace'}
            </Button>

            {mode === 'recover' && (
              <button
                type="button"
                className="w-full text-center text-xs text-slate-500 hover:underline"
                onClick={() => { setMode('login'); setError(null); setNotice(null) }}
              >
                Volver a iniciar sesión
              </button>
            )}
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-400">
          El administrador de un negocio agrega a sus empleados por correo, después de que ellos
          creen su cuenta aquí.
        </p>
      </div>
    </div>
  )
}
