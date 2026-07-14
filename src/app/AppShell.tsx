import { useState, type ComponentType, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useBusiness } from './BusinessProvider'
import type { Role } from '../lib/types'
import {
  IconHome, IconCart, IconLayers, IconTruck, IconDollar, IconBarChart,
  IconSearch, IconBell, IconCreditCard, IconInbox, IconTrendingDown, IconArchive, IconUsers, IconMenu,
} from '../components/icons'
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
  icon: ComponentType<{ className?: string }>
  roles: Role[]
  render: () => ReactNode
}

const NAV: NavItem[] = [
  { view: 'dashboard', label: 'Inicio', icon: IconHome, roles: ['admin', 'empleado'], render: () => <DashboardPage /> },
  { view: 'ventas', label: 'Ventas', icon: IconCart, roles: ['admin', 'empleado'], render: () => <SalesPage /> },
  { view: 'productos', label: 'Productos', icon: IconLayers, roles: ['admin', 'empleado'], render: () => <ProductsPage /> },
  { view: 'cxc', label: 'Cuentas por cobrar', icon: IconCreditCard, roles: ['admin', 'empleado'], render: () => <ReceivablesPage /> },
  { view: 'compras', label: 'Compras', icon: IconTruck, roles: ['admin'], render: () => <PurchasesPage /> },
  { view: 'proveedores', label: 'Proveedores', icon: IconArchive, roles: ['admin'], render: () => <SuppliersPage /> },
  { view: 'cxp', label: 'Cuentas por pagar', icon: IconCreditCard, roles: ['admin'], render: () => <PayablesPage /> },
  { view: 'caja', label: 'Caja', icon: IconInbox, roles: ['admin'], render: () => <CashPage /> },
  { view: 'gastos', label: 'Gastos', icon: IconTrendingDown, roles: ['admin'], render: () => <ExpensesPage /> },
  { view: 'reportes', label: 'Reportes', icon: IconBarChart, roles: ['admin'], render: () => <ReportsPage /> },
  { view: 'empleados', label: 'Empleados', icon: IconUsers, roles: ['admin'], render: () => <EmployeesPage /> },
]

function initials(email: string | null | undefined) {
  if (!email) return '?'
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

export default function AppShell() {
  const { user, signOut } = useAuth()
  const { currentBusiness, role, memberships, selectBusiness } = useBusiness()
  const [view, setView] = useState<View>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const items = NAV.filter((n) => role && n.roles.includes(role))
  const active = items.find((n) => n.view === view) ?? items[0]

  const go = (v: View) => {
    setView(v)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-page text-ink">
      {/* Barra superior (móvil) */}
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
        <button onClick={() => setMenuOpen((v) => !v)} className="text-ink-soft" aria-label="Menú">
          <IconMenu />
        </button>
        <span className="text-[15px] font-semibold">{currentBusiness?.name}</span>
        <span className="w-5" />
      </header>

      <div className="flex">
        {/* Barra lateral */}
        <aside
          className={`${menuOpen ? 'block' : 'hidden'} border-b border-line bg-sidebar md:block md:min-h-screen md:w-[232px] md:shrink-0 md:border-b-0 md:border-r md:border-r-[#e2ede4] md:p-3.5`}
        >
          <div className="hidden items-center gap-2.5 px-2.5 pb-[22px] pt-1.5 md:flex">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[15px] font-bold text-white">
              M
            </div>
            <span className="text-[15px] font-semibold text-ink">MYPE ERP</span>
          </div>

          {/* Selector de negocio */}
          <div className="px-2.5 pb-3 pt-2 md:pt-0">
            {memberships.length > 1 ? (
              <select
                className="w-full rounded-lg border border-input-line bg-white px-2 py-1.5 text-sm"
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
              <div className="truncate rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink-soft">
                {currentBusiness?.name}
              </div>
            )}
            <div className="mt-1 px-1 text-xs text-faint">
              {role === 'admin' ? 'Administrador' : 'Empleado'}
            </div>
          </div>

          <nav className="flex flex-col gap-0.5">
            {items.map((n) => {
              const Icon = n.icon
              const isActive = active?.view === n.view
              return (
                <button
                  key={n.view}
                  onClick={() => go(n.view)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] ${
                    isActive
                      ? 'bg-white font-semibold text-brand-dark shadow-[0_1px_3px_rgba(16,24,20,0.08)]'
                      : 'font-normal text-sidebar-ink hover:bg-white/60'
                  }`}
                >
                  <Icon className="shrink-0" />
                  {n.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-4 border-t border-[#e2ede4] px-2.5 pt-3">
            <div className="truncate text-xs text-faint" title={user?.email ?? ''}>
              {user?.email}
            </div>
            <button className="mt-1 text-sm text-sidebar-ink hover:text-danger" onClick={() => signOut()}>
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* Header (escritorio) */}
          <div className="hidden h-16 shrink-0 items-center justify-between border-b border-line bg-white px-7 md:flex">
            <div className="text-lg font-bold text-ink">{active?.label}</div>
            <div className="flex items-center gap-3.5">
              <div className="flex w-[190px] items-center gap-2 rounded-lg bg-[#f3f6f4] px-3.5 py-2 text-[13px] text-label">
                <IconSearch width={15} height={15} />
                Buscar…
              </div>
              <div className="relative text-label">
                <IconBell width={19} height={19} />
                <div className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full bg-accent" />
              </div>
              <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-brand text-[13px] font-bold text-white">
                {initials(user?.email)}
              </div>
            </div>
          </div>

          <main className="flex-1 p-4 md:p-7">{active?.render()}</main>
        </div>
      </div>
    </div>
  )
}
