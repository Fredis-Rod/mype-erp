// Formato para El Salvador (USD)

const money = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const qty = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 3 })

export const fmtMoney = (n: number | null | undefined) => money.format(Number(n ?? 0))
export const fmtQty = (n: number | null | undefined) => qty.format(Number(n ?? 0))

/** Fecha corta (YYYY-MM-DD -> DD/MM/YYYY) sin problemas de zona horaria */
export const fmtDate = (d: string | null | undefined) => {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

/** Fecha de hoy en formato YYYY-MM-DD (para inputs date) */
export const today = () => new Date().toISOString().slice(0, 10)
