import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Alert, Button, Field, TextInput } from '../../components/ui'

type Mode = 'login' | 'signup' | 'recover'

export default function LoginPage() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
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

  const title = mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Recuperar contraseña'
  const subtitle =
    mode === 'login'
      ? 'Ingresa tus datos para continuar'
      : mode === 'signup'
        ? 'Crea tu cuenta para empezar a usar MYPE ERP'
        : 'Te enviaremos un enlace a tu correo'

  return (
    <div className="flex min-h-screen font-sans">
      {/* Panel izquierdo — marca */}
      <div className="hidden w-[460px] shrink-0 flex-col justify-between bg-brand-dark p-12 text-white md:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-white/20 text-base font-bold">M</div>
          <span className="text-base font-semibold">MYPE ERP</span>
        </div>
        <div>
          <div className="mb-3.5 text-[28px] font-bold leading-tight">
            Gestiona tu negocio
            <br />
            desde un solo lugar
          </div>
          <div className="text-sm leading-relaxed text-white/80">
            Ventas, inventario, compras y finanzas — todo en un panel simple, pensado para emprendedores.
          </div>
        </div>
        <div className="text-xs text-white/60">© 2026 MYPE ERP</div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-[360px]">
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <div className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-brand text-base font-bold text-white">M</div>
            <span className="text-base font-semibold text-ink">MYPE ERP</span>
          </div>

          <div className="mb-5">
            <div className="mb-1.5 text-[22px] font-bold text-ink">{title}</div>
            <div className="text-[13.5px] text-label">{subtitle}</div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-[22px]">
            <Field label="Correo electrónico">
              <TextInput
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@miempresa.com"
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
                  placeholder="••••••••"
                />
              </Field>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-[12.5px]">
                <label className="flex items-center gap-2 text-ink-soft">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-[15px] w-[15px] rounded border-[#cdd8d1] accent-brand-dark"
                  />
                  Recordarme
                </label>
                <button
                  type="button"
                  className="font-semibold text-brand-dark hover:underline"
                  onClick={() => { setMode('recover'); setError(null); setNotice(null) }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {error && <Alert kind="error">{error}</Alert>}
            {notice && <Alert kind="success">{notice}</Alert>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy
                ? 'Procesando…'
                : mode === 'login'
                  ? 'Iniciar sesión'
                  : mode === 'signup'
                    ? 'Registrarme'
                    : 'Enviar enlace'}
            </Button>

            <div className="text-center text-[13px] text-label">
              {mode === 'login' && (
                <>
                  ¿No tienes cuenta?{' '}
                  <button type="button" className="font-semibold text-brand-dark hover:underline" onClick={() => { setMode('signup'); setError(null); setNotice(null) }}>
                    Regístrate
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button type="button" className="font-semibold text-brand-dark hover:underline" onClick={() => { setMode('login'); setError(null); setNotice(null) }}>
                  Ya tengo cuenta, iniciar sesión
                </button>
              )}
              {mode === 'recover' && (
                <button type="button" className="font-semibold text-brand-dark hover:underline" onClick={() => { setMode('login'); setError(null); setNotice(null) }}>
                  Volver a iniciar sesión
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-faint">
            El administrador de un negocio agrega a sus empleados por correo, después de que ellos creen su cuenta aquí.
          </p>
        </div>
      </div>
    </div>
  )
}
