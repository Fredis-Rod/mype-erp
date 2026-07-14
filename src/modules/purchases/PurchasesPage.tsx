import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Alert, Button, Card, Field, TextInput } from '../../components/ui'
import { fmtMoney, fmtDate, today } from '../../lib/format'
import type { Product, Supplier } from '../../lib/types'

interface Line {
  product_id: string
  qty: string
  unit_cost: string
}

interface PurchaseRow {
  id: string
  date: string
  supplier_id: string | null
  payment_type: 'contado' | 'credito'
  total: number
  amount_paid: number
}

export default function PurchasesPage() {
  const { currentBusiness } = useBusiness()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [history, setHistory] = useState<PurchaseRow[]>([])
  const [laterPaid, setLaterPaid] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Formulario
  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(today())
  const [paymentType, setPaymentType] = useState<'contado' | 'credito'>('contado')
  const [amountPaid, setAmountPaid] = useState('')
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: '', unit_cost: '' }])

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    const [{ data: prods }, { data: sups }, { data: hist }, { data: pays }] = await Promise.all([
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('suppliers').select('id, name, phone, notes').order('name'),
      supabase.from('purchases').select('id, date, supplier_id, payment_type, total, amount_paid').order('date', { ascending: false }).limit(50),
      supabase.from('payable_payments').select('purchase_id, amount'),
    ])
    setProducts((prods ?? []) as Product[])
    setSuppliers((sups ?? []) as Supplier[])
    setHistory((hist ?? []) as PurchaseRow[])
    const paidMap: Record<string, number> = {}
    for (const p of (pays ?? []) as { purchase_id: string; amount: number }[]) {
      paidMap[p.purchase_id] = (paidMap[p.purchase_id] ?? 0) + Number(p.amount)
    }
    setLaterPaid(paidMap)
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const supplierName = useMemo(() => {
    const m = new Map(suppliers.map((s) => [s.id, s.name]))
    return (id: string | null) => (id ? m.get(id) ?? '—' : '—')
  }, [suppliers])

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unit_cost) || 0), 0),
    [lines],
  )

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, { product_id: '', qty: '', unit_cost: '' }])
  const removeLine = (i: number) => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls))

  // Al elegir producto, sugerir su último costo promedio
  const onPickProduct = (i: number, pid: string) => {
    const p = products.find((x) => x.id === pid)
    setLine(i, { product_id: pid, unit_cost: p && !lines[i].unit_cost ? String(p.avg_cost || '') : lines[i].unit_cost })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusiness) return
    setError(null)

    const items = lines
      .filter((l) => l.product_id && Number(l.qty) > 0)
      .map((l) => ({ product_id: l.product_id, qty: Number(l.qty), unit_cost: Number(l.unit_cost) || 0 }))
    if (items.length === 0) {
      setError('Agrega al menos un producto con cantidad.')
      return
    }

    setBusy(true)
    const { error } = await supabase.rpc('register_purchase', {
      p_business_id: currentBusiness.id,
      p_supplier_id: supplierId || null,
      p_date: date,
      p_payment_type: paymentType,
      p_amount_paid: paymentType === 'credito' ? Number(amountPaid) || 0 : null,
      p_items: items,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    // Reset
    setSupplierId('')
    setPaymentType('contado')
    setAmountPaid('')
    setLines([{ product_id: '', qty: '', unit_cost: '' }])
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Compras (ingreso de inventario)</h1>
        <p className="text-sm text-label">
          Cada compra aumenta el stock y recalcula el costo promedio. Las compras al crédito generan una cuenta por pagar.
        </p>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Proveedor">
              <select className="w-full rounded-lg border border-input-line px-3 py-2 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">(Sin proveedor)</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Fecha">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Forma de pago">
              <select className="w-full rounded-lg border border-input-line px-3 py-2 text-sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value as 'contado' | 'credito')}>
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
            </Field>
          </div>

          {/* Renglones */}
          <div className="space-y-2">
            <div className="hidden gap-2 text-xs font-medium text-label sm:grid sm:grid-cols-[1fr_100px_120px_40px]">
              <span>Producto</span><span>Cantidad</span><span>Costo unitario</span><span></span>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_100px_120px_40px]">
                <select className="w-full min-w-0 rounded-lg border border-input-line px-2 py-2 text-sm" value={l.product_id} onChange={(e) => onPickProduct(i, e.target.value)}>
                  <option value="">Elegir producto…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
                <TextInput type="number" step="0.001" min="0" placeholder="Cant." value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                <TextInput type="number" step="0.0001" min="0" placeholder="Costo" value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} />
                <button type="button" className="text-faint hover:text-danger" onClick={() => removeLine(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="text-sm text-brand-dark hover:underline" onClick={addLine}>+ Agregar renglón</button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-page pt-4">
            <div className="text-lg font-bold text-ink">Total: {fmtMoney(total)}</div>
            {paymentType === 'credito' && (
              <Field label="Abono inicial (pagado ahora)">
                <TextInput type="number" step="0.01" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" className="w-40" />
              </Field>
            )}
          </div>

          {error && <Alert kind="error">{error}</Alert>}
          <Button type="submit" disabled={busy}>{busy ? 'Registrando…' : 'Registrar compra'}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Compras recientes</h2>
        {loading ? (
          <p className="text-sm text-faint">Cargando…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-faint">Aún no hay compras registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  <th className="py-2">Fecha</th><th>Proveedor</th><th>Pago</th>
                  <th className="text-right">Total</th><th className="text-right">Pagado</th><th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-t border-page">
                    <td className="py-2">{fmtDate(p.date)}</td>
                    <td className="text-ink-soft">{supplierName(p.supplier_id)}</td>
                    <td><span className={`rounded px-1.5 py-0.5 text-xs ${p.payment_type === 'credito' ? 'bg-warn-soft text-warn' : 'bg-page text-ink-soft'}`}>{p.payment_type}</span></td>
                    <td className="text-right">{fmtMoney(p.total)}</td>
                    <td className="text-right text-label">{fmtMoney(p.amount_paid + (laterPaid[p.id] ?? 0))}</td>
                    <td className="text-right font-medium">{fmtMoney(p.total - p.amount_paid - (laterPaid[p.id] ?? 0))}</td>
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
