import { useEffect, useMemo, useState } from 'react'
import { useBusiness } from '../../app/BusinessProvider'
import { supabase } from '../../lib/supabase'
import { Badge, Card, StatCard } from '../../components/ui'
import { IconDollar, IconTrendingDown, IconCreditCard, IconLayers } from '../../components/icons'
import { fmtMoney, fmtDate, today } from '../../lib/format'

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

interface LowStockRow {
  name: string
  stock_qty: number
  min_stock: number
}
interface RecentSale {
  id: string
  date: string
  total: number
  payment_type: 'contado' | 'credito'
}

function last7Days() {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function AdminSummary() {
  const { currentBusiness } = useBusiness()
  const [loading, setLoading] = useState(true)
  const [cash, setCash] = useState(0)
  const [salesToday, setSalesToday] = useState(0)
  const [lowStock, setLowStock] = useState<LowStockRow[]>([])
  const [cxc, setCxc] = useState(0)
  const [cxp, setCxp] = useState(0)
  const [weekSales, setWeekSales] = useState<Record<string, number>>({})
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])

  useEffect(() => {
    if (!currentBusiness) return
    setLoading(true)
    ;(async () => {
      const days = last7Days()
      const [
        { data: cashRows }, { data: sales }, { data: products },
        { data: creditSales }, { data: rp }, { data: purchases }, { data: pp },
        { data: weekRows }, { data: recent },
      ] = await Promise.all([
        supabase.from('cash_movements').select('amount'),
        supabase.from('sales').select('total').eq('date', today()),
        supabase.from('products').select('name, stock_qty, min_stock').eq('active', true),
        supabase.from('sales').select('id, total, amount_paid').eq('payment_type', 'credito'),
        supabase.from('receivable_payments').select('sale_id, amount'),
        supabase.from('purchases').select('id, total, amount_paid').eq('payment_type', 'credito'),
        supabase.from('payable_payments').select('purchase_id, amount'),
        supabase.from('sales').select('date, total').gte('date', days[0]),
        supabase.from('sales').select('id, date, total, payment_type').order('created_at', { ascending: false }).limit(5),
      ])

      setCash((cashRows ?? []).reduce((s, x) => s + Number(x.amount), 0))
      setSalesToday((sales ?? []).reduce((s, x) => s + Number(x.total), 0))
      setLowStock(
        (products ?? [])
          .filter((p) => Number(p.stock_qty) <= Number(p.min_stock))
          .slice(0, 3) as LowStockRow[],
      )

      const rpMap: Record<string, number> = {}
      for (const p of rp ?? []) rpMap[p.sale_id] = (rpMap[p.sale_id] ?? 0) + Number(p.amount)
      setCxc(
        (creditSales ?? []).reduce(
          (s, x) => s + Math.max(Number(x.total) - Number(x.amount_paid) - (rpMap[x.id] ?? 0), 0), 0,
        ),
      )

      const ppMap: Record<string, number> = {}
      for (const p of pp ?? []) ppMap[p.purchase_id] = (ppMap[p.purchase_id] ?? 0) + Number(p.amount)
      setCxp(
        (purchases ?? []).reduce(
          (s, x) => s + Math.max(Number(x.total) - Number(x.amount_paid) - (ppMap[x.id] ?? 0), 0), 0,
        ),
      )

      const byDay: Record<string, number> = {}
      for (const d of days) byDay[d] = 0
      for (const row of weekRows ?? []) {
        const key = String(row.date).slice(0, 10)
        if (key in byDay) byDay[key] += Number(row.total)
      }
      setWeekSales(byDay)
      setRecentSales((recent ?? []) as RecentSale[])

      setLoading(false)
    })()
  }, [currentBusiness])

  const days = useMemo(() => last7Days(), [])
  const maxWeek = Math.max(...days.map((d) => weekSales[d] ?? 0), 1)
  const todayStr = today()

  if (loading) return <p className="text-sm text-label">Cargando…</p>

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Caja" value={fmtMoney(cash)} icon={<IconDollar width={15} height={15} />} iconTone="brand" />
        <StatCard label="Ventas de hoy" value={fmtMoney(salesToday)} icon={<IconDollar width={15} height={15} />} iconTone="brand" />
        <StatCard label="Por cobrar" value={fmtMoney(cxc)} hint={cxc > 0 ? 'Pendiente de cobro' : undefined} hintTone="accent" icon={<IconCreditCard width={15} height={15} />} iconTone="accent" />
        <StatCard label="Por pagar" value={fmtMoney(cxp)} hint={cxp > 0 ? 'Pendiente de pago' : undefined} hintTone="accent" icon={<IconCreditCard width={15} height={15} />} iconTone="accent" />
        <StatCard
          label="Stock bajo"
          value={lowStock.length}
          hint={lowStock.length > 0 ? 'Requiere reposición' : 'Todo en orden'}
          hintTone={lowStock.length > 0 ? 'danger' : 'brand'}
          icon={<IconTrendingDown width={15} height={15} />}
          iconTone={lowStock.length > 0 ? 'danger' : 'brand'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="flex flex-col">
          <div className="mb-3.5 text-[13.5px] font-semibold text-ink">Ventas — últimos 7 días</div>
          <div className="flex flex-1 items-end gap-3.5 px-1">
            {days.map((d) => {
              const val = weekSales[d] ?? 0
              const h = Math.max(Math.round((val / maxWeek) * 100), 4)
              const isToday = d === todayStr
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-[100px] w-full items-end">
                    <div
                      className={`w-full rounded ${isToday ? 'bg-accent' : 'bg-brand-soft'}`}
                      style={{ height: `${h}%` }}
                      title={fmtMoney(val)}
                    />
                  </div>
                  <span className="text-[10.5px] text-faint">{DOW[new Date(d + 'T00:00:00').getDay()]}</span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="text-[13.5px] font-semibold text-ink">Stock bajo</div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-faint">Ningún producto por debajo del mínimo. 🎉</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {lowStock.map((p) => {
                const pct = p.min_stock > 0 ? Math.min((p.stock_qty / p.min_stock) * 100, 100) : 100
                return (
                  <div key={p.name}>
                    <div className="mb-1 flex justify-between text-[12.5px] text-ink-soft">
                      <span>{p.name}</span>
                      <span className="font-semibold text-danger">{p.stock_qty} uds.</span>
                    </div>
                    <div className="h-[5px] rounded-full bg-page">
                      <div className="h-full rounded-full bg-danger" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-3 text-[13.5px] font-semibold text-ink">Ventas recientes</div>
        {recentSales.length === 0 ? (
          <p className="text-sm text-faint">Aún no hay ventas registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                <th className="pb-2">Fecha</th><th className="pb-2">Monto</th><th className="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => (
                <tr key={s.id} className="border-t border-page">
                  <td className="py-2.5 text-ink-soft">{fmtDate(s.date)}</td>
                  <td className="py-2.5 font-medium text-ink">{fmtMoney(s.total)}</td>
                  <td className="py-2.5">
                    <Badge tone={s.payment_type === 'contado' ? 'brand' : 'accent'}>
                      {s.payment_type === 'contado' ? 'Contado' : 'Crédito'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { currentBusiness, role } = useBusiness()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{currentBusiness?.name}</h1>
        <p className="text-sm text-label">
          Panel principal · {role === 'admin' ? 'Administrador' : 'Empleado'}
        </p>
      </div>

      {role === 'admin' ? (
        <AdminSummary />
      ) : (
        <Card className="flex items-center gap-3">
          <IconLayers className="shrink-0 text-brand-dark" />
          <div>
            <h2 className="font-semibold text-ink">Bienvenido</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Usa <strong>Ventas</strong> para registrar una venta, <strong>Productos</strong> para
              consultar existencias y <strong>Cuentas por cobrar</strong> para registrar abonos de clientes.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
