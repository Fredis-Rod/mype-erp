import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/** Botón con variantes (sistema visual del handoff de diseño) */
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'
  const styles: Record<string, string> = {
    primary: 'bg-brand text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:bg-brand-dark',
    secondary: 'bg-accent text-white shadow-[0_2px_6px_rgba(47,111,237,0.3)] hover:opacity-90',
    danger: 'bg-danger text-white hover:opacity-90',
    ghost: 'text-ink-soft hover:bg-page',
  }
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />
}

/** Campo con etiqueta */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

/** Input de texto */
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-[9px] border border-input-line px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft ${props.className ?? ''}`}
    />
  )
}

/** Tarjeta */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-white p-[18px] ${className}`}>
      {children}
    </div>
  )
}

/** Mensaje de alerta */
export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles: Record<string, string> = {
    error: 'bg-danger-soft text-danger border-danger/20',
    success: 'bg-brand-soft text-brand-dark border-brand/20',
    info: 'bg-accent-soft text-accent border-accent/20',
  }
  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles[kind]}`}>{children}</div>
}

/** Insignia de estado (Pagado, Pendiente, Stock bajo, Agotado, ...) */
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'brand' | 'accent' | 'danger' | 'warn' | 'neutral'
  children: ReactNode
}) {
  const styles: Record<string, string> = {
    brand: 'bg-brand-soft text-brand-dark',
    accent: 'bg-accent-soft text-accent',
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn',
    neutral: 'bg-page text-label',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${styles[tone]}`}>
      {children}
    </span>
  )
}

/** Tarjeta de indicador (KPI) con icono opcional */
export function StatCard({
  label,
  value,
  hint,
  hintTone = 'neutral',
  icon,
  iconTone = 'brand',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  hintTone?: 'brand' | 'accent' | 'danger' | 'neutral'
  icon?: ReactNode
  iconTone?: 'brand' | 'accent' | 'danger'
}) {
  const hintColor: Record<string, string> = {
    brand: 'text-brand-dark',
    accent: 'text-accent',
    danger: 'text-danger',
    neutral: 'text-faint',
  }
  const iconColor: Record<string, string> = {
    brand: 'bg-brand-soft text-brand-dark',
    accent: 'bg-accent-soft text-accent',
    danger: 'bg-danger-soft text-danger',
  }
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-label">{label}</span>
        {icon && (
          <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${iconColor[iconTone]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      {hint && <div className={`text-xs font-semibold ${hintColor[hintTone]}`}>{hint}</div>}
    </Card>
  )
}

/** Clases reutilizables para encabezados de <table> (mayúsculas, tracking, color tenue) */
export const tableHeadCellClass = 'py-2 text-[11.5px] font-semibold uppercase tracking-wide text-faint'
export const tableRowClass = 'border-t border-page text-[13px] text-ink-soft'

/** Spinner de carga a pantalla completa */
export function FullScreenSpinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-page text-label">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  )
}
