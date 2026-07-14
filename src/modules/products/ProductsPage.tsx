import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../app/BusinessProvider'
import { Alert, Button, Card, Field, TextInput } from '../../components/ui'
import { fmtMoney, fmtQty } from '../../lib/format'
import { UNITS, type CatalogProduct, type Product, type Supplier } from '../../lib/types'

// ---------- Vista de empleado: catálogo sin costo ----------
function CatalogView() {
  const [rows, setRows] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('product_catalog')
      .select('id, sku, name, category, unit, sale_price, stock_qty, min_stock, active')
      .order('name')
      .then(({ data }) => {
        setRows((data ?? []) as CatalogProduct[])
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Productos</h1>
        <p className="text-sm text-slate-500">Existencias y precios de venta.</p>
      </div>
      <Card>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Producto</th>
                  <th>Categoría</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Existencias</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2">{p.name}</td>
                    <td className="text-slate-500">{p.category ?? '—'}</td>
                    <td className="text-right">{fmtMoney(p.sale_price)}</td>
                    <td className={`text-right ${p.stock_qty <= p.min_stock ? 'text-red-600 font-medium' : ''}`}>
                      {fmtQty(p.stock_qty)} {p.unit}
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

// ---------- Vista de admin: gestión completa ----------
interface FormState {
  id: string | null
  name: string
  sku: string
  category: string
  unit: string
  sale_price: string
  min_stock: string
  active: boolean
  supplierIds: Set<string>
}

const emptyForm = (): FormState => ({
  id: null,
  name: '',
  sku: '',
  category: '',
  unit: 'unidad',
  sale_price: '',
  min_stock: '',
  active: true,
  supplierIds: new Set(),
})

function AdminView() {
  const { currentBusiness } = useBusiness()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!currentBusiness) return
    setLoading(true)
    const [{ data: prods, error: e1 }, { data: sups }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('id, name, phone, notes').order('name'),
    ])
    if (e1) setError(e1.message)
    setProducts((prods ?? []) as Product[])
    setSuppliers((sups ?? []) as Supplier[])
    setLoading(false)
  }, [currentBusiness])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))] as string[],
    [products],
  )

  const startNew = () => setForm(emptyForm())

  const startEdit = async (p: Product) => {
    const { data: links } = await supabase
      .from('product_suppliers')
      .select('supplier_id')
      .eq('product_id', p.id)
    setForm({
      id: p.id,
      name: p.name,
      sku: p.sku ?? '',
      category: p.category ?? '',
      unit: p.unit,
      sale_price: String(p.sale_price),
      min_stock: String(p.min_stock),
      active: p.active,
      supplierIds: new Set((links ?? []).map((l) => l.supplier_id as string)),
    })
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusiness || !form) return
    setError(null)
    setBusy(true)
    const payload = {
      business_id: currentBusiness.id,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category.trim() || null,
      unit: form.unit.trim() || 'unidad',
      sale_price: Number(form.sale_price) || 0,
      min_stock: Number(form.min_stock) || 0,
      active: form.active,
    }

    let productId = form.id
    if (form.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', form.id)
      if (error) { setError(error.message); setBusy(false); return }
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('id').single()
      if (error) { setError(error.message); setBusy(false); return }
      productId = data.id
    }

    // Sincronizar enlaces producto-proveedor (borrar y reinsertar seleccionados)
    if (productId) {
      await supabase.from('product_suppliers').delete().eq('product_id', productId)
      const links = [...form.supplierIds].map((sid) => ({
        business_id: currentBusiness.id,
        product_id: productId,
        supplier_id: sid,
      }))
      if (links.length) await supabase.from('product_suppliers').insert(links)
    }

    setBusy(false)
    setForm(null)
    await load()
  }

  const toggleSupplier = (id: string) => {
    if (!form) return
    const next = new Set(form.supplierIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setForm({ ...form, supplierIds: next })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Productos</h1>
          <p className="text-sm text-slate-500">
            El stock y el costo promedio se actualizan solos con cada compra.
          </p>
        </div>
        {!form && <Button onClick={startNew}>+ Nuevo producto</Button>}
      </div>

      {form && (
        <Card>
          <h2 className="mb-4 font-medium text-slate-800">
            {form.id ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Código / SKU (opcional)">
              <TextInput value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Categoría">
              <TextInput list="cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ej. Bebidas" />
              <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Unidad de medida">
              <TextInput list="units" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            </Field>
            <Field label="Precio de venta">
              <TextInput type="number" step="0.01" min="0" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
            </Field>
            <Field label="Stock mínimo (alerta)">
              <TextInput type="number" step="0.001" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Proveedores</span>
              {suppliers.length === 0 ? (
                <p className="text-sm text-slate-400">Aún no hay proveedores. Puedes agregarlos en el módulo Proveedores.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suppliers.map((s) => (
                    <label key={s.id} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${form.supplierIds.has(s.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'}`}>
                      <input type="checkbox" className="mr-1 hidden" checked={form.supplierIds.has(s.id)} onChange={() => toggleSupplier(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Activo
            </label>
            {error && <div className="sm:col-span-2"><Alert kind="error">{error}</Alert></div>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay productos. Crea el primero con “Nuevo producto”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Producto</th>
                  <th>Categoría</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Costo prom.</th>
                  <th className="text-right">Existencias</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2">
                      {p.name}
                      {!p.active && <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs text-slate-400">inactivo</span>}
                      {p.sku && <span className="ml-2 text-xs text-slate-400">{p.sku}</span>}
                    </td>
                    <td className="text-slate-500">{p.category ?? '—'}</td>
                    <td className="text-right">{fmtMoney(p.sale_price)}</td>
                    <td className="text-right text-slate-500">{fmtMoney(p.avg_cost)}</td>
                    <td className={`text-right ${p.stock_qty <= p.min_stock ? 'font-medium text-red-600' : ''}`}>
                      {fmtQty(p.stock_qty)} {p.unit}
                    </td>
                    <td className="text-right">
                      <button className="text-emerald-600 hover:underline" onClick={() => startEdit(p)}>Editar</button>
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

export default function ProductsPage() {
  const { role } = useBusiness()
  return role === 'admin' ? <AdminView /> : <CatalogView />
}
