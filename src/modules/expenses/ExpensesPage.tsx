import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Alert, Button, Card, Field, TextInput } from '../../components/ui'
import { fmtMoney, fmtDate, today } from '../../lib/format'

interface Expense {
  id: string
  date: string
  category: string | null
  amount: number
  description: string | null
}

export default function ExpensesPage() {
  const { currentBusiness } = useBusiness()
  const [rows, setRows] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [date, setDate] = useState(today())
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('id, date, category, amount, description')
      .order('date', { ascending: false })
      .limit(100)
    if (error) setError(error.message)
    else setRows((data ?? []) as Expense[])
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))] as string[],
    [rows],
  )
  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount), 0), [rows])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusiness) return
    setError(null)
    setBusy(true)
    const { error } = await supabase.from('expenses').insert({
      business_id: currentBusiness.id,
      date,
      category: category.trim() || null,
      amount: Number(amount) || 0,
      description: description.trim() || null,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setCategory('')
    setAmount('')
    setDescription('')
    await load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) setError(error.message)
    else await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Gastos</h1>
        <p className="text-sm text-label">Gastos operativos (alquiler, servicios, planilla, etc.), distintos del costo de mercadería.</p>
      </div>

      <Card>
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-4">
          <Field label="Fecha">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Categoría">
            <TextInput list="expcats" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej. Alquiler" />
            <datalist id="expcats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Monto">
            <TextInput type="number" step="0.01" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Descripción (opcional)">
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          {error && <div className="sm:col-span-4"><Alert kind="error">{error}</Alert></div>}
          <div className="sm:col-span-4">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Agregar gasto'}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Gastos recientes</h2>
          <span className="text-sm text-label">Total: <strong>{fmtMoney(total)}</strong></span>
        </div>
        {loading ? (
          <p className="text-sm text-faint">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-faint">Aún no hay gastos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  <th className="py-2">Fecha</th><th>Categoría</th><th>Descripción</th>
                  <th className="text-right">Monto</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-page">
                    <td className="py-2">{fmtDate(r.date)}</td>
                    <td className="text-ink-soft">{r.category ?? '—'}</td>
                    <td className="text-label">{r.description ?? '—'}</td>
                    <td className="text-right font-medium">{fmtMoney(r.amount)}</td>
                    <td className="text-right">
                      <button className="text-faint hover:text-danger" onClick={() => remove(r.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
