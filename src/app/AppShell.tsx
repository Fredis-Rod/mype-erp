import { useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useBusiness } from './BusinessProvider'
import type { Role } from '../lib/types'
import DashboardPage from '../modules/dashboard/DashboardPage'
import EmployeesPage from '../modules/employees/EmployeesPage'
import ProductsPage from '../modules/products/ProductsPage'
import PurchasesPage from '../modules/purchases/PurchasesPage'
import SuppliersPage from '../modules/suppliers/SuppliersPage'
import PayablesPage from '../modules/payables/PayablesPage'
import SalesPage from '../modules/sales/SalesPage'
import ReceivablesPage from '../modules/receivables/ReceivablesPage'
import CashPage from '../modules/cash/CashPage'
import ExpensesPage from '../modules/expenses/ExpensesPage'
import ReportsPage from '../modules/reports/ReportsPage'

/** Vistas activas. Se irán agregando módulos por fase. */
type View =
  | 'dashboard' | 'ventas' | 'productos' | 'cxc'
  | 'compras' | 'proveedores' | 'cxp' | 'caja'
  | 'gastos' | 'reportes' | 'empleados'

interface NavItem {
  view: View
  label: string
  icon: string
  roles: Role[]
  render: () => ReactNode
}

// Módulos activos hoy.
const NAV: NavItem[] = [
  { view: 'dashboard', label: 'Inicio', icon: '🏠', roles: ['admin', 'empleado'], render: () => <DashboardPage /> },
  { view: 'ventas', label: 'Ventas', icon: '🧾', roles: ['admin', 'empleado'], render: () => <SalesPage /> },
  { view: 'productos', label: 'Productos', icon: '📦', roles: ['admin', 'empleado'], render: () => <ProductsPage /> },
  { view: 'cxc', label: 'Cuentas por cobrar', icon: '💳', roles: ['admin', 'empleado'], render: () => <ReceivablesPage /> },
  { view: 'compras', label: 'Compras', icon: '🚚', roles: ['admin'], render: () => <PurchasesPage /> },
  { view: 'proveedores', label: 'Proveedores', icon: '🏭', roles: ['admin'], render: () => <SuppliersPage /> },
  { view: 'cxp', label: 'Cuentas por pagar', icon: '📥', roles: ['admin'], render: () => <PayablesPage /> },
  { view: 'caja', label: 'Caja', icon: '💵', roles: ['admin'], render: () => <CashPage /> },
  { view: 'gastos', label: 'Gastos', icon: '📉', roles: ['admin'], render: () => <ExpensesPage /> },
  { view: 'reportes', label: 'Reportes', icon: '📊', roles: ['admin'], render: () => <ReportsPage /> },
  { view: 'empleados', label: 'Empleados', icon: '👤', roles: ['admin'], render: () => <EmployeesPage /> },
]

// Módulos que llegan en fases siguientes (se muestran deshabilitados).
const SOON: { label: string; icon: string; roles: Role[] }[] = []

export default function AppShell() {
  const { user, signOut } = useAuth()
  const { currentBusiness, role, memberships, selectBusiness } = useBusiness()
  const [view, setView] = useState<View>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const items = NAV.filter((n) => role && n.roles.includes(role))
  const soonItems = SOON.filter((n) => role && n.roles.includes(role))

  // Guarda: si la vista actual no está permitida para el rol, volver a inicio.
  const active = items.find((n) => n.view === view) ?? items[0]

  const go = (v: View) => {
    setView(v)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Barra superior (móvil) */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <button onClick={() => setMenuOpen((v) => !v)} className="text-xl text-slate-600" aria-label="Menú">
          ☰
        </button>
        <span className="font-semibold">{currentBusiness?.name}</span>
        <span className="w-5" />
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Barra lateral */}
        <aside
          className={`${menuOpen ? 'block' : 'hidden'} border-b border-slate-200 bg-white md:block md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r`}
        >
          <div className="hidden items-center gap-2 px-5 py-4 md:flex">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              M
            </div>
            <span className="font-semibold">MYPE ERP</span>
          </div>

          {/* Selector de negocio */}
          <div className="px-4 pb-2 pt-2 md:pt-0">
            {memberships.length > 1 ? (
              <select
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={currentBusiness?.id ?? ''}
                onChange={(e) => selectBusiness(e.target.value)}
              >
                {memberships.map((m) => (
                  <option key={m.business.id} value={m.business.id}>
                    {m.business.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                {currentBusiness?.name}
              </div>
            )}
            <div className="mt-1 px-1 text-xs text-slate-400">
              {role === 'admin' ? 'Administrador' : 'Empleado'}
            </div>
          </div>

          <nav className="space-y-0.5 px-3 py-2">
            {items.map((n) => (
              <button
                key={n.view}
                onClick={() => go(n.view)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  active?.view === n.view
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </button>
            ))}

            {soonItems.length > 0 && (
              <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Próximas fases
              </div>
            )}
            {soonItems.map((n) => (
              <div
                key={n.label}
                className="flex cursor-default items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-400"
                title="Disponible en una próxima fase"
              >
                <span className="flex items-center gap-3">
                  <span>{n.icon}</span>
                  {n.label}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">pronto</span>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-100 px-4 py-3">
            <div className="truncate text-xs text-slate-400" title={user?.email ?? ''}>
              {user?.email}
            </div>
            <button className="mt-1 text-sm text-slate-600 hover:text-red-600" onClick={() => signOut()}>
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 p-4 md:p-8">{active?.render()}</main>
      </div>
    </div>
  )
}
