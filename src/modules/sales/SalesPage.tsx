import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Alert, Button, Card, Field, TextInput } from '../../components/ui'
import { fmtMoney, fmtQty, today } from '../../lib/format'
import { PAYMENT_METHODS, type CatalogProduct, type Customer } from '../../lib/types'
import { enqueueSale, isNetworkError, pendingCount, processQueue, type SalePayload } from '../../offline/saleQueue'

interface CartLine {
  product_id: string
  name: string
  unit: string
  stock: number
  qty: number
  unit_price: number
}

export default function SalesPage() {
  const { currentBusiness } = useBusiness()
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [discount, setDiscount] = useState('')
  const [paymentType, setPaymentType] = useState<'contado' | 'credito'>('contado')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [customerId, setCustomerId] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [newCustomer, setNewCustomer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(0)

  const bizId = currentBusiness?.id

  const load = useCallback(async () => {
    if (!bizId) return
    const [{ data: cat }, { data: cust }] = await Promise.all([
      supabase.from('product_catalog').select('*').eq('active', true).order('name'),
      supabase.from('customers').select('id, name, phone, notes').order('name'),
    ])
    setCatalog((cat ?? []) as CatalogProduct[])
    setCustomers((cust ?? []) as Customer[])
    setPending(pendingCount(bizId))
  }, [bizId])

  // Sincronizar ventas en cola al montar y al recuperar conexión
  const sync = useCallback(async () => {
    if (!bizId) return
    const n = await processQueue(async (payload) => {
      const r = await supabase.rpc('register_sale', payload)
      return { error: r.error }
    })
    if (n > 0) setNotice(`${n} venta(s) pendiente(s) sincronizada(s).`)
    await load()
  }, [bizId, load])

  useEffect(() => {
    load()
    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [load, sync])

  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog.slice(0, 8)
    return catalog
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
      .slice(0, 12)
  }, [search, catalog])

  const addToCart = (p: CatalogProduct) => {
    setCart((c) => {
      const found = c.find((l) => l.product_id === p.id)
      if (found) return c.map((l) => (l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l))
      return [...c, { product_id: p.id, name: p.name, unit: p.unit, stock: p.stock_qty, qty: 1, unit_price: p.sale_price }]
    })
    setSearch('')
  }
  const setLine = (id: string, patch: Partial<CartLine>) =>
    setCart((c) => c.map((l) => (l.product_id === id ? { ...l, ...patch } : l)))
  const removeLine = (id: string) => setCart((c) => c.filter((l) => l.product_id !== id))

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.qty * l.unit_price, 0), [cart])
  const total = Math.max(subtotal - (Number(discount) || 0), 0)

  const createCustomer = async () => {
    if (!bizId || !newCustomer.trim()) return
    const { data, error } = await supabase
      .from('customers')
      .insert({ business_id: bizId, name: newCustomer.trim() })
      .select('id, name, phone, notes')
      .single()
    if (error) { setError(error.message); return }
    setCustomers((c) => [...c, data as Customer])
    setCustomerId((data as Customer).id)
    setNewCustomer('')
  }

  const reset = () => {
    setCart([])
    setDiscount('')
    setPaymentType('contado')
    setPaymentMethod('efectivo')
    setCustomerId('')
    setAmountPaid('')
  }

  const submit = async () => {
    if (!bizId) return
    setError(null)
    setNotice(null)
    if (cart.length === 0) { setError('Agrega al menos un producto.'); return }
    if (paymentType === 'credito' && !customerId) { setError('Elige un cliente para la venta al crédito.'); return }

    const payload: SalePayload = {
      p_business_id: bizId,
      p_customer_id: paymentType === 'credito' ? customerId : null,
      p_date: today(),
      p_payment_type: paymentType,
      p_payment_method: paymentMethod,
      p_amount_paid: paymentType === 'credito' ? Number(amountPaid) || 0 : null,
      p_discount: Number(discount) || 0,
      p_items: cart.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_price: l.unit_price })),
      p_client_uuid: crypto.randomUUID(),
    }

    setBusy(true)
    const { error } = await supabase.rpc('register_sale', payload)
    setBusy(false)

    if (error) {
      if (isNetworkError(error)) {
        enqueueSale(payload)
        setPending(pendingCount(bizId))
        setNotice('Sin conexión: la venta se guardó y se enviará al reconectar.')
        reset()
      } else {
        setError(error.message)
      }
      return
    }
    setNotice(`Venta registrada por ${fmtMoney(total)}.`)
    reset()
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Nueva venta</h1>
          <p className="text-sm text-slate-500">Busca productos, agrégalos y cobra.</p>
        </div>
        {pending > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
            {pending} venta(s) por sincronizar
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Buscador + resultados */}
        <Card>
          <Field label="Buscar producto">
            <TextInput autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o código…" />
          </Field>
          <ul className="mt-3 divide-y divide-slate-100">
            {results.map((p) => (
              <li key={p.id}>
                <button onClick={() => addToCart(p)} className="flex w-full items-center justify-between py-2 text-left text-sm hover:bg-slate-50">
                  <span>
                    <span className="font-medium text-slate-700">{p.name}</span>
                    <span className={`ml-2 text-xs ${p.stock_qty <= p.min_stock ? 'font-medium text-red-600' : 'text-slate-400'}`}>
                      {fmtQty(p.stock_qty)} {p.unit}
                    </span>
                  </span>
                  <span className="text-slate-600">{fmtMoney(p.sale_price)}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="py-2 text-sm text-slate-400">Sin resultados.</li>}
          </ul>
        </Card>

        {/* Carrito + cobro */}
        <Card>
          {cart.length === 0 ? (
            <p className="text-sm text-slate-400">El carrito está vacío. Agrega productos desde la búsqueda.</p>
          ) : (
            <div className="space-y-2">
              {cart.map((l) => (
                <div key={l.product_id} className="grid grid-cols-[1fr_64px_84px_28px] items-center gap-2 text-sm">
                  <span className="truncate" title={l.name}>{l.name}</span>
                  <TextInput type="number" step="0.001" min="0" value={l.qty} onChange={(e) => setLine(l.product_id, { qty: Number(e.target.value) })} />
                  <TextInput type="number" step="0.01" min="0" value={l.unit_price} onChange={(e) => setLine(l.product_id, { unit_price: Number(e.target.value) })} />
                  <button className="text-slate-400 hover:text-red-600" onClick={() => removeLine(l.product_id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-500">Descuento</span>
              <TextInput type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" className="w-28 text-right" />
            </div>
            <div className="flex items-center justify-between text-lg font-semibold text-slate-800">
              <span>Total</span><span>{fmtMoney(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Cobro">
                <select className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value as 'contado' | 'credito')}>
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito (fiado)</option>
                </select>
              </Field>
              <Field label="Método">
                <select className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            {paymentType === 'credito' && (
              <div className="space-y-2 rounded-lg bg-amber-50 p-3">
                <Field label="Cliente">
                  <select className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">Elegir cliente…</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label="Nuevo cliente">
                      <TextInput value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="Nombre" />
                    </Field>
                  </div>
                  <Button type="button" variant="secondary" onClick={createCustomer}>Crear</Button>
                </div>
                <Field label="Abono ahora (opcional)">
                  <TextInput type="number" step="0.01" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" />
                </Field>
              </div>
            )}

            {error && <Alert kind="error">{error}</Alert>}
            {notice && <Alert kind="success">{notice}</Alert>}

            <Button onClick={submit} disabled={busy || cart.length === 0} className="w-full">
              {busy ? 'Procesando…' : `Cobrar ${fmtMoney(total)}`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
