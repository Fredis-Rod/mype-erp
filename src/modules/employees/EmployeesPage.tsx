import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { useAuth } from '../../auth/AuthProvider'
import { Alert, Button, Card, Field, TextInput } from '../../components/ui'
import type { Role } from '../../lib/types'

interface MemberRow {
  user_id: string
  role: Role
  email: string | null
}

export default function EmployeesPage() {
  const { currentBusiness } = useBusiness()
  const { user } = useAuth()
  const [rows, setRows] = useState<MemberRow[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('empleado')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    // Lista de miembros con su correo (vía RPC que puede leer auth.users).
    const { data, error } = await supabase.rpc('list_members', {
      p_business_id: currentBusiness.id,
    })
    if (error) setError(error.message)
    else setRows((data ?? []) as MemberRow[])
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusiness) return
    setError(null)
    setNotice(null)
    setBusy(true)
    const { error } = await supabase.rpc('add_employee', {
      p_business_id: currentBusiness.id,
      p_email: email.trim(),
      p_role: role,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setNotice(`${email} agregado como ${role}.`)
    setEmail('')
    await load()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Empleados y accesos</h1>
        <p className="text-sm text-label">
          Agrega a un empleado por su correo (debe crear su cuenta primero). El empleado solo
          registra ventas y consulta existencias; no ve costos ni finanzas.
        </p>
      </div>

      <Card>
        <form onSubmit={addMember} className="space-y-4">
          <Field label="Correo del empleado">
            <TextInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@correo.com"
            />
          </Field>
          <Field label="Rol">
            <select
              className="w-full rounded-lg border border-input-line px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="empleado">Empleado (acceso limitado)</option>
              <option value="admin">Administrador (acceso total)</option>
            </select>
          </Field>
          {error && <Alert kind="error">{error}</Alert>}
          {notice && <Alert kind="success">{notice}</Alert>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Agregando…' : 'Agregar'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Miembros del negocio</h2>
        {loading ? (
          <p className="text-sm text-faint">Cargando…</p>
        ) : (
          <ul className="divide-y divide-page">
            {rows.map((r) => (
              <li key={r.user_id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-soft">
                  {r.email ?? r.user_id}
                  {r.user_id === user?.id && <span className="ml-2 text-xs text-faint">(tú)</span>}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    r.role === 'admin'
                      ? 'bg-brand-soft text-brand-dark'
                      : 'bg-page text-ink-soft'
                  }`}
                >
                  {r.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
