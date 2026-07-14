import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Card } from '../../components/ui'
import { fmtMoney, fmtDate } from '../../lib/format'

interface Movement {
  id: string
  date: string
  type: string
  amount: number
  reference: string | null
  created_at: string
}

const LABELS: Record<string, string> = {
  venta_efectivo: 'Venta (efectivo)',
  abono_cxc: 'Abono de cliente',
  compra_efectivo: 'Compra (efectivo)',
  pago_cxp: 'Pago a proveedor',
  gasto: 'Gasto',
  deposito: 'Depósito',
  retiro: 'Retiro',
}

export default function CashPage() {
  const { currentBusiness } = useBusiness()
  const [rows, setRows] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    const { data } = await supabase
      .from('cash_movements')
      .select('id, date, type, amount, reference, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    setRows((data ?? []) as Movement[])
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const balance = useMemo(() => rows.reduce((s, m) => s + Number(m.amount), 0), [rows])
  const inflow = useMemo(() => rows.filter((m) => m.amount > 0).reduce((s, m) => s + Number(m.amount), 0), [rows])
  const outflow = useMemo(() => rows.filter((m) => m.amount < 0).reduce((s, m) => s + Number(m.amount), 0), [rows])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Caja</h1>
        <p className="text-sm text-label">Movimientos de efectivo. Tarjeta y transferencia no entran a la caja física.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-label">Saldo en caja</div>
          <div className="text-2xl font-bold text-ink">{fmtMoney(balance)}</div>
        </Card>
        <Card>
          <div className="text-sm text-label">Entradas</div>
          <div className="text-xl font-semibold text-brand-dark">{fmtMoney(inflow)}</div>
        </Card>
        <Card>
          <div className="text-sm text-label">Salidas</div>
          <div className="text-xl font-semibold text-danger">{fmtMoney(outflow)}</div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Movimientos recientes</h2>
        {loading ? (
          <p className="text-sm text-faint">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-faint">Aún no hay movimientos de caja.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                  <th className="py-2">Fecha</th><th>Concepto</th><th>Referencia</th><th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-t border-page">
                    <td className="py-2">{fmtDate(m.date)}</td>
                    <td>{LABELS[m.type] ?? m.type}</td>
                    <td className="text-faint">{m.reference}</td>
                    <td className={`text-right font-medium ${m.amount >= 0 ? 'text-brand-dark' : 'text-danger'}`}>
                      {m.amount >= 0 ? '+' : ''}{fmtMoney(m.amount)}
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
