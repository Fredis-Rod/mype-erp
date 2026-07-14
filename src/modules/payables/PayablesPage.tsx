import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Alert, Button, Card, TextInput } from '../../components/ui'
import { fmtMoney, fmtDate, today } from '../../lib/format'
import type { Supplier } from '../../lib/types'

interface CreditPurchase {
  id: string
  date: string
  supplier_id: string | null
  total: number
  amount_paid: number
}

export default function PayablesPage() {
  const { currentBusiness } = useBusiness()
  const [purchases, setPurchases] = useState<CreditPurchase[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    const [{ data: purs }, { data: pays }, { data: sups }] = await Promise.all([
      supabase.from('purchases').select('id, date, supplier_id, total, amount_paid').eq('payment_type', 'credito').order('date'),
      supabase.from('payable_payments').select('purchase_id, amount'),
      supabase.from('suppliers').select('id, name, phone, notes').order('name'),
    ])
    setPurchases((purs ?? []) as CreditPurchase[])
    const m: Record<string, number> = {}
    for (const p of (pays ?? []) as { purchase_id: string; amount: number }[]) {
      m[p.purchase_id] = (m[p.purchase_id] ?? 0) + Number(p.amount)
    }
    setPaidMap(m)
    setSuppliers((sups ?? []) as Supplier[])
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const supplierName = useMemo(() => {
    const m = new Map(suppliers.map((s) => [s.id, s.name]))
    return (id: string | null) => (id ? m.get(id) ?? '—' : 'Sin proveedor')
  }, [suppliers])

  const balanceOf = (p: CreditPurchase) => p.total - p.amount_paid - (paidMap[p.id] ?? 0)
  const pending = purchases.filter((p) => balanceOf(p) > 0.001)
  const totalDebt = pending.reduce((s, p) => s + balanceOf(p), 0)

  // Totales por proveedor
  const bySupplier = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pending) {
      const key = supplierName(p.supplier_id)
      m.set(key, (m.get(key) ?? 0) + balanceOf(p))
    }
    return [...m.entries()]
  }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async (purchaseId: string) => {
    if (!currentBusiness) return
    setError(null)
    setBusy(true)
    const { error } = await supabase.rpc('register_payable_payment', {
      p_business_id: currentBusiness.id,
      p_purchase_id: purchaseId,
      p_amount: Number(amount) || 0,
      p_date: today(),
      p_method: 'efectivo',
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setPayingId(null)
    setAmount('')
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Cuentas por pagar</h1>
        <p className="text-sm text-label">Lo que le debes a tus proveedores por compras al crédito.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <div className="text-sm text-label">Deuda total</div>
          <div className="text-2xl font-bold text-ink">{fmtMoney(totalDebt)}</div>
        </Card>
        <Card className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-ink-soft">Por proveedor</div>
          {bySupplier.length === 0 ? (
            <p className="text-sm text-faint">Sin saldos pendientes.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {bySupplier.map(([name, amt]) => (
                <li key={name} className="flex justify-between">
                  <span className="text-ink-soft">{name}</span>
                  <span className="font-medium">{fmtMoney(amt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Compras al crédito pendientes</h2>
        {loading ? (
          <p className="text-sm text-faint">Cargando…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-faint">No tienes cuentas por pagar. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  <th className="py-2">Fecha</th><th>Proveedor</th>
                  <th className="text-right">Total</th><th className="text-right">Saldo</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id} className="border-t border-page align-top">
                    <td className="py-2">{fmtDate(p.date)}</td>
                    <td className="text-ink-soft">{supplierName(p.supplier_id)}</td>
                    <td className="text-right">{fmtMoney(p.total)}</td>
                    <td className="text-right font-medium">{fmtMoney(balanceOf(p))}</td>
                    <td className="text-right">
                      {payingId === p.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <TextInput type="number" step="0.01" min="0" placeholder="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24" />
                          <Button type="button" disabled={busy} onClick={() => pay(p.id)}>{busy ? '…' : 'Pagar'}</Button>
                          <button className="px-1 text-faint" onClick={() => { setPayingId(null); setAmount('') }}>✕</button>
                        </div>
                      ) : (
                        <button className="text-brand-dark hover:underline" onClick={() => { setPayingId(p.id); setAmount(String(balanceOf(p))) }}>Registrar pago</button>
                      )}
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
