// Offline mínimo: si una venta no se puede enviar por falta de conexión,
// se guarda en una cola local y se reintenta al reconectar. La función RPC
// register_sale es idempotente por client_uuid, así que reintentar es seguro.

export interface SalePayload {
  p_business_id: string
  p_customer_id: string | null
  p_date: string | null
  p_payment_type: 'contado' | 'credito'
  p_payment_method: string
  p_amount_paid: number | null
  p_discount: number
  p_items: { product_id: string; qty: number; unit_price: number }[]
  p_client_uuid: string
}

interface Queued {
  business_id: string
  client_uuid: string
  payload: SalePayload
  createdAt: number
}

const KEY = 'mype.saleQueue'

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
function write(q: Queued[]) {
  localStorage.setItem(KEY, JSON.stringify(q))
}

export function enqueueSale(payload: SalePayload) {
  const q = read()
  q.push({ business_id: payload.p_business_id, client_uuid: payload.p_client_uuid, payload, createdAt: Date.now() })
  write(q)
}

export function pendingCount(businessId: string): number {
  return read().filter((s) => s.business_id === businessId).length
}

export function isNetworkError(error: { message?: string } | null): boolean {
  if (navigator.onLine === false) return true
  const m = (error?.message || '').toLowerCase()
  return m.includes('fetch') || m.includes('network') || m.includes('failed to')
}

type RpcFn = (payload: SalePayload) => Promise<{ error: { message?: string } | null }>

/** Reintenta enviar las ventas en cola. Devuelve cuántas se sincronizaron. */
export async function processQueue(rpc: RpcFn): Promise<number> {
  let q = read()
  let done = 0
  for (const item of [...q]) {
    const { error } = await rpc(item.payload)
    if (!error) {
      q = q.filter((x) => x.client_uuid !== item.client_uuid)
      done++
    } else if (isNetworkError(error)) {
      break // sigue sin conexión: reintentar después
    } else {
      // Error del servidor (no de red): quitarla para no reintentar en bucle.
      console.error('Venta en cola rechazada por el servidor:', error.message)
      q = q.filter((x) => x.client_uuid !== item.client_uuid)
    }
  }
  write(q)
  return done
}
