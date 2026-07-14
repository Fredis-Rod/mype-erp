import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Alert, Button, Card, TextInput } from '../../components/ui'
import { fmtMoney, fmtDate, today } from '../../lib/format'
import type { Customer } from '../../lib/types'

interface CreditSale {
  id: string
  date: string
  customer_id: string | null
  total: number
  amount_paid: number
}

export default function ReceivablesPage() {
  const { currentBusiness } = useBusiness()
  const [sales, setSales] = useState<CreditSale[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    const [{ data: s }, { data: pays }, { data: cust }] = await Promise.all([
      supabase.from('sales').select('id, date, customer_id, total, amount_paid').eq('payment_type', 'credito').order('date'),
      supabase.from('receivable_payments').select('sale_id, amount'),
      supabase.from('customers').select('id, name, phone, notes').order('name'),
    ])
    setSales((s ?? []) as CreditSale[])
    const m: Record<string, number> = {}
    for (const p of (pays ?? []) as { sale_id: string; amount: number }[]) {
      m[p.sale_id] = (m[p.sale_id] ?? 0) + Number(p.amount)
    }
    setPaidMap(m)
    setCustomers((cust ?? []) as Customer[])
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const customerName = useMemo(() => {
    const m = new Map(customers.map((c) => [c.id, c.name]))
    return (id: string | null) => (id ? m.get(id) ?? '—' : 'Sin cliente')
  }, [customers])

  const balanceOf = (s: CreditSale) => s.total - s.amount_paid - (paidMap[s.id] ?? 0)
  const pending = sales.filter((s) => balanceOf(s) > 0.001)
  const totalDebt = pending.reduce((sum, s) => sum + balanceOf(s), 0)

  const byCustomer = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of pending) {
      const key = customerName(s.customer_id)
      m.set(key, (m.get(key) ?? 0) + balanceOf(s))
    }
    return [...m.entries()]
  }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async (saleId: string) => {
    if (!currentBusiness) return
    setError(null)
    setBusy(true)
    const { error } = await supabase.rpc('register_receivable_payment', {
      p_business_id: currentBusiness.id,
      p_sale_id: saleId,
      p_amount: Number(amount) || 0,
      p_date: today(),
      p_method: 'efectivo',
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setPayingId(null)
    setAmount('')
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Cuentas por cobrar</h1>
        <p className="text-sm text-slate-500">Lo que te deben tus clientes por ventas al crédito (fiado).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <div className="text-sm text-slate-500">Total por cobrar</div>
          <div className="text-2xl font-semibold text-slate-800">{fmtMoney(totalDebt)}</div>
        </Card>
        <Card className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-slate-700">Por cliente</div>
          {byCustomer.length === 0 ? (
            <p className="text-sm text-slate-400">Sin saldos pendientes.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {byCustomer.map(([name, amt]) => (
                <li key={name} className="flex justify-between">
                  <span className="text-slate-600">{name}</span>
                  <span className="font-medium">{fmtMoney(amt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <Card>
        <h2 className="mb-3 font-medium text-slate-800">Ventas al crédito pendientes</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-slate-400">Nadie te debe. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Fecha</th><th>Cliente</th>
                  <th className="text-right">Total</th><th className="text-right">Saldo</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-2">{fmtDate(s.date)}</td>
                    <td className="text-slate-600">{customerName(s.customer_id)}</td>
                    <td className="text-right">{fmtMoney(s.total)}</td>
                    <td className="text-right font-medium">{fmtMoney(balanceOf(s))}</td>
                    <td className="text-right">
                      {payingId === s.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <TextInput type="number" step="0.01" min="0" placeholder="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24" />
                          <Button type="button" disabled={busy} onClick={() => pay(s.id)}>{busy ? '…' : 'Cobrar'}</Button>
                          <button className="px-1 text-slate-400" onClick={() => { setPayingId(null); setAmount('') }}>✕</button>
                        </div>
                      ) : (
                        <button className="text-emerald-600 hover:underline" onClick={() => { setPayingId(s.id); setAmount(String(balanceOf(s))) }}>Registrar abono</button>
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
