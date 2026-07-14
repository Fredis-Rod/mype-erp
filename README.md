# MYPE ERP

Sistema web de **inventario, ventas y finanzas** para pequeños negocios (MYPES).
Multiempresa: cada negocio tiene sus datos aislados, con roles **administrador** y **empleado**.

- **Frontend:** React + TypeScript + Vite + Tailwind (app web responsive, PC y celular)
- **Backend:** Supabase (Postgres + Auth + Row-Level Security)
- **Costeo:** promedio ponderado · **Moneda:** USD

## Requisitos
- Node.js LTS (instalado en `C:\Program Files\nodejs`)
- Una cuenta gratuita de [Supabase](https://supabase.com)

## Puesta en marcha

1. **Instalar dependencias**
   ```
   npm install
   ```

2. **Crear el proyecto en Supabase** (capa gratuita)
   - Entra a supabase.com y crea un proyecto nuevo.
   - En **SQL Editor**, pega y ejecuta el contenido de [`supabase/apply_all.sql`](supabase/apply_all.sql).
   - En **Authentication → Sign In / Providers → Email**, desactiva *Confirm email*
     (solo para desarrollo, así puedes iniciar sesión sin confirmar correo).

3. **Configurar credenciales**
   - Copia `.env.example` a `.env.local` y completa con **Project URL** y **anon key**
     (Supabase → Project Settings → API).

4. **Levantar la app**
   ```
   npm run dev
   ```
   Abre http://localhost:5173

## Scripts
- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run typecheck` — verificación de tipos

## Estructura
```
src/
  auth/           Autenticación (sesión de usuario)
  app/            Contexto de negocio/rol, shell y enrutado por estado
  components/     UI compartida
  modules/        Módulos por dominio (auth, dashboard, employees, …)
  lib/            Cliente Supabase, tipos, helpers
supabase/
  migrations/     Migraciones SQL (esquema, RLS, RPCs)
  apply_all.sql   Todo el esquema en un solo archivo (para pegar en Supabase)
```

## Estado
- ✅ Fase 0 — Fundaciones: auth, multiempresa, roles, RLS
- ⏳ Fase 1 — Inventario y compras (costeo promedio)
- ⏳ Fase 2 — Ventas, crédito (CxC) y caja
- ⏳ Fase 3 — Gastos, estados financieros y reportería
- ⏳ Fase 4 — Pulido, PWA y verificación end-to-end
