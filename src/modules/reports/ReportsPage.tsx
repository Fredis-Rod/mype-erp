import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Card, TextInput } from '../../components/ui'
import { fmtMoney, fmtQty, today } from '../../lib/format'
import type { Product } from '../../lib/types'

type Tab = 'inventario' | 'faltante' | 'ventas' | 'resultados'

const TABS: { id: Tab; label: string }[] = [
  { id: 'inventario', label: 'Inventario' },
  { id: 'faltante', label: 'Inventario faltante' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'resultados', label: 'Estado de resultados' },
]

function firstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ---------- Inventario (valorizado + faltante comparten los mismos datos) ----------
function useProducts() {
  const { currentBusiness } = useBusiness()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!currentBusiness) return
    setLoading(true)
    supabase.from('products').select('*').eq('active', true).order('name').then(({ data }) => {
      setProducts((data ?? []) as Product[])
      setLoading(false)
    })
  }, [currentBusiness])
  return { products, loading }
}

function InventoryReport() {
  const { products, loading } = useProducts()
  const totalValue = useMemo(() => products.reduce((s, p) => s + p.stock_qty * p.avg_cost, 0), [products])
  if (loading) return <p className="text-sm text-faint">Cargando…</p>
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-sm text-label">Valor total del inventario (a costo)</div>
        <div className="text-2xl font-bold text-ink">{fmtMoney(totalValue)}</div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                <th className="py-2">Producto</th><th className="text-right">Existencias</th>
                <th className="text-right">Costo prom.</th><th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-page">
                  <td className="py-2">{p.name}</td>
                  <td className="text-right">{fmtQty(p.stock_qty)} {p.unit}</td>
                  <td className="text-right text-label">{fmtMoney(p.avg_cost)}</td>
                  <td className="text-right font-medium">{fmtMoney(p.stock_qty * p.avg_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function LowStockReport() {
  const { products, loading } = useProducts()
  const low = products.filter((p) => p.stock_qty <= p.min_stock)
  if (loading) return <p className="text-sm text-faint">Cargando…</p>
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-ink">Productos en o por debajo del mínimo</h2>
      {low.length === 0 ? (
        <p className="text-sm text-faint">Todo el inventario está en niveles saludables. 🎉</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">
                <th className="py-2">Producto</th><th className="text-right">Existencias</th><th className="text-right">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {low.map((p) => (
                <tr key={p.id} className="border-t border-page">
                  <td className="py-2">{p.name}</td>
                  <td className="text-right font-medium text-danger">{fmtQty(p.stock_qty)} {p.unit}</td>
                  <td className="text-right text-label">{fmtQty(p.min_stock)} {p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ---------- Selector de periodo compartido ----------
function PeriodPicker({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Desde</span>
        <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-ink-soft">Hasta</span>
        <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </label>
    </div>
  )
}

// ---------- Ventas por periodo ----------
interface SaleRow { id: string; date: string; total: number; payment_type: string; discount: number }

function SalesReport() {
  const { currentBusiness } = useBusiness()
  const [from, setFrom] = useState(firstDayOfMonth())
  const [to, setTo] = useState(today())
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentBusiness) return
    setLoading(true)
    supabase
      .from('sales')
      .select('id, date, total, payment_type, discount')
      .gte('date', from)
      .lte('date', to)
      .then(({ data }) => {
        setSales((data ?? []) as SaleRow[])
        setLoading(false)
      })
  }, [currentBusiness, from, to])

  const totalSales = sales.reduce((s, x) => s + Number(x.total), 0)
  const totalDiscount = sales.reduce((s, x) => s + Number(x.discount), 0)
  const cash = sales.filter((x) => x.payment_type === 'contado').reduce((s, x) => s + Number(x.total), 0)
  const credit = sales.filter((x) => x.payment_type === 'credito').reduce((s, x) => s + Number(x.total), 0)

  return (
    <div className="space-y-4">
      <PeriodPicker from={from} to={to} setFrom={setFrom} setTo={setTo} />
      {loading ? (
        <p className="text-sm text-faint">Cargando…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><div className="text-sm text-label">Total ventas</div><div className="text-xl font-semibold">{fmtMoney(totalSales)}</div></Card>
            <Card><div className="text-sm text-label">Contado</div><div className="text-xl font-semibold">{fmtMoney(cash)}</div></Card>
            <Card><div className="text-sm text-label">Crédito</div><div className="text-xl font-semibold">{fmtMoney(credit)}</div></Card>
            <Card><div className="text-sm text-label">Descuentos otorgados</div><div className="text-xl font-semibold">{fmtMoney(totalDiscount)}</div></Card>
          </div>
          <Card>
            <div className="text-sm text-label">{sales.length} venta(s) en el periodo</div>
          </Card>
        </>
      )}
    </div>
  )
}

// ---------- Estado de resultados ----------
function IncomeStatement() {
  const { currentBusiness } = useBusiness()
  const [from, setFrom] = useState(firstDayOfMonth())
  const [to, setTo] = useState(today())
  const [loading, setLoading] = useState(true)
  const [revenue, setRevenue] = useState(0)
  const [cogs, setCogs] = useState(0)
  const [expenses, setExpenses] = useState(0)

  useEffect(() => {
    if (!currentBusiness) return
    setLoading(true)
    ;(async () => {
      const { data: sales } = await supabase.from('sales').select('id, total').gte('date', from).lte('date', to)
      const saleIds = (sales ?? []).map((s) => s.id)
      const rev = (sales ?? []).reduce((s, x) => s + Number(x.total), 0)

      let cogsSum = 0
      if (saleIds.length > 0) {
        const { data: items } = await supabase.from('sale_items').select('qty, unit_cost, sale_id').in('sale_id', saleIds)
        cogsSum = (items ?? []).reduce((s, it) => s + Number(it.qty) * Number(it.unit_cost), 0)
      }

      const { data: exp } = await supabase.from('expenses').select('amount').gte('date', from).lte('date', to)
      const expSum = (exp ?? []).reduce((s, x) => s + Number(x.amount), 0)

      setRevenue(rev)
      setCogs(cogsSum)
      setExpenses(expSum)
      setLoading(false)
    })()
  }, [currentBusiness, from, to])

  const grossProfit = revenue - cogs
  const netProfit = grossProfit - expenses

  return (
    <div className="space-y-4">
      <PeriodPicker from={from} to={to} setFrom={setFrom} setTo={setTo} />
      {loading ? (
        <p className="text-sm text-faint">Cargando…</p>
      ) : (
        <Card className="max-w-md">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Ventas</dt><dd className="font-medium">{fmtMoney(revenue)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">(−) Costo de ventas</dt><dd className="font-medium text-danger">{fmtMoney(cogs)}</dd></div>
            <div className="flex justify-between border-t border-page pt-2"><dt className="font-medium text-ink-soft">Utilidad bruta</dt><dd className="font-semibold">{fmtMoney(grossProfit)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">(−) Gastos</dt><dd className="font-medium text-danger">{fmtMoney(expenses)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base"><dt className="font-semibold text-ink">Utilidad neta</dt><dd className={`font-bold ${netProfit >= 0 ? 'text-brand-dark' : 'text-danger'}`}>{fmtMoney(netProfit)}</dd></div>
          </dl>
        </Card>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('inventario')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Reportes</h1>
        <p className="text-sm text-label">Lo esencial para entender tu negocio de un vistazo.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? 'border-brand-dark text-brand-dark' : 'border-transparent text-label hover:text-ink-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'inventario' && <InventoryReport />}
      {tab === 'faltante' && <LowStockReport />}
      {tab === 'ventas' && <SalesReport />}
      {tab === 'resultados' && <IncomeStatement />}
    </div>
  )
}
