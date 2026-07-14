import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Alert, Button, Card, Field, TextInput } from '../../components/ui'
import type { Supplier } from '../../lib/types'

export default function SuppliersPage() {
  const { currentBusiness } = useBusiness()
  const [rows, setRows] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, phone, notes')
      .order('name')
    if (error) setError(error.message)
    else setRows((data ?? []) as Supplier[])
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusiness) return
    setError(null)
    setBusy(true)
    const { error } = await supabase.from('suppliers').insert({
      business_id: currentBusiness.id,
      name: name.trim(),
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    setPhone('')
    setNotes('')
    await load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) setError(error.message)
    else await load()
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Proveedores</h1>
        <p className="text-sm text-label">
          A quién le compras la mercadería. Un producto puede tener varios proveedores.
        </p>
      </div>

      <Card>
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <TextInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Distribuidora XYZ" />
          </Field>
          <Field label="Teléfono (opcional)">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0000-0000" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notas (opcional)">
              <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condiciones, contacto…" />
            </Field>
          </div>
          {error && <div className="sm:col-span-2"><Alert kind="error">{error}</Alert></div>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Agregar proveedor'}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Lista de proveedores</h2>
        {loading ? (
          <p className="text-sm text-faint">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-faint">Aún no hay proveedores.</p>
        ) : (
          <ul className="divide-y divide-page">
            {rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium text-ink-soft">{s.name}</span>
                  {s.phone && <span className="ml-2 text-faint">{s.phone}</span>}
                  {s.notes && <span className="ml-2 text-faint">· {s.notes}</span>}
                </span>
                <button className="text-faint hover:text-danger" onClick={() => remove(s.id)} title="Eliminar">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
