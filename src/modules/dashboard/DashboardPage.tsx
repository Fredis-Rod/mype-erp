import { useEffect, useState } from 'react'
import { useBusiness } from '../../app/BusinessProvider'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui'
import { fmtMoney, today } from '../../lib/format'

function AdminSummary() {
  const { currentBusiness } = useBusiness()
  const [loading, setLoading] = useState(true)
  const [cash, setCash] = useState(0)
  const [salesToday, setSalesToday] = useState(0)
  const [lowStock, setLowStock] = useState(0)
  const [cxc, setCxc] = useState(0)
  const [cxp, setCxp] = useState(0)

  useEffect(() => {
    if (!currentBusiness) return
    setLoading(true)
    ;(async () => {
      const [{ data: cashRows }, { data: sales }, { data: products }, { data: creditSales }, { data: rp }, { data: purchases }, { data: pp }] =
        await Promise.all([
          supabase.from('cash_movements').select('amount'),
          supabase.from('sales').select('total').eq('date', today()),
          supabase.from('products').select('stock_qty, min_stock').eq('active', true),
          supabase.from('sales').select('id, total, amount_paid').eq('payment_type', 'credito'),
          supabase.from('receivable_payments').select('sale_id, amount'),
          supabase.from('purchases').select('id, total, amount_paid').eq('payment_type', 'credito'),
          supabase.from('payable_payments').select('purchase_id, amount'),
        ])

      setCash((cashRows ?? []).reduce((s, x) => s + Number(x.amount), 0))
      setSalesToday((sales ?? []).reduce((s, x) => s + Number(x.total), 0))
      setLowStock((products ?? []).filter((p) => Number(p.stock_qty) <= Number(p.min_stock)).length)

      const rpMap: Record<string, number> = {}
      for (const p of rp ?? []) rpMap[p.sale_id] = (rpMap[p.sale_id] ?? 0) + Number(p.amount)
      const cxcTotal = (creditSales ?? []).reduce(
        (s, x) => s + Math.max(Number(x.total) - Number(x.amount_paid) - (rpMap[x.id] ?? 0), 0), 0,
      )
      setCxc(cxcTotal)

      const ppMap: Record<string, number> = {}
      for (const p of pp ?? []) ppMap[p.purchase_id] = (ppMap[p.purchase_id] ?? 0) + Number(p.amount)
      const cxpTotal = (purchases ?? []).reduce(
        (s, x) => s + Math.max(Number(x.total) - Number(x.amount_paid) - (ppMap[x.id] ?? 0), 0), 0,
      )
      setCxp(cxpTotal)

      setLoading(false)
    })()
  }, [currentBusiness])

  if (loading) return <p className="text-sm text-slate-400">Cargando…</p>

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card><div className="text-sm text-slate-500">Caja</div><div className="text-xl font-semibold">{fmtMoney(cash)}</div></Card>
      <Card><div className="text-sm text-slate-500">Ventas de hoy</div><div className="text-xl font-semibold">{fmtMoney(salesToday)}</div></Card>
      <Card><div className="text-sm text-slate-500">Por cobrar</div><div className="text-xl font-semibold">{fmtMoney(cxc)}</div></Card>
      <Card><div className="text-sm text-slate-500">Por pagar</div><div className="text-xl font-semibold">{fmtMoney(cxp)}</div></Card>
      <Card>
        <div className="text-sm text-slate-500">Stock bajo</div>
        <div className={`text-xl font-semibold ${lowStock > 0 ? 'text-red-600' : ''}`}>{lowStock}</div>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { currentBusiness, role } = useBusiness()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">{currentBusiness?.name}</h1>
        <p className="text-sm text-slate-500">
          Panel principal · {role === 'admin' ? 'Administrador' : 'Empleado'}
        </p>
      </div>

      {role === 'admin' ? (
        <AdminSummary />
      ) : (
        <Card>
          <h2 className="font-medium text-slate-800">Bienvenido</h2>
          <p className="mt-1 text-sm text-slate-600">
            Usa <strong>Ventas</strong> para registrar una venta, <strong>Productos</strong> para
            consultar existencias y <strong>Cuentas por cobrar</strong> para registrar abonos de clientes.
          </p>
        </Card>
      )}
    </div>
  )
}
