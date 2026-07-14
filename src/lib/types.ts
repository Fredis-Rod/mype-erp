// Tipos del dominio. Se irán ampliando por fase.

export type Role = 'admin' | 'empleado'

export interface Business {
  id: string
  name: string
  currency: string
}

export interface Membership {
  role: Role
  business: Business
}

// --- Fase 1 ---

export interface Supplier {
  id: string
  name: string
  phone: string | null
  notes: string | null
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  notes: string | null
}

export const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia'] as const

/** Producto completo (solo admin: incluye avg_cost) */
export interface Product {
  id: string
  sku: string | null
  name: string
  category: string | null
  unit: string
  sale_price: number
  stock_qty: number
  avg_cost: number
  min_stock: number
  active: boolean
}

/** Catálogo sin costo (visible a empleados) */
export interface CatalogProduct {
  id: string
  sku: string | null
  name: string
  category: string | null
  unit: string
  sale_price: number
  stock_qty: number
  min_stock: number
  active: boolean
}

export interface Purchase {
  id: string
  date: string
  supplier_id: string | null
  payment_type: 'contado' | 'credito'
  total: number
  amount_paid: number
}

/** Unidades de medida sugeridas */
export const UNITS = ['unidad', 'libra', 'kg', 'gramo', 'litro', 'ml', 'caja', 'bolsa', 'docena', 'metro', 'paquete']
