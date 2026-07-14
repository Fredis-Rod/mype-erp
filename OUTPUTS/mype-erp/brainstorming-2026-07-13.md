# Brainstorming — Sistema MYPE (inventario, ventas y finanzas)
Fecha: 2026-07-13

## Resumen

**Idea refinada:** Un producto web multiempresa ligero para tiendas de comercio de productos, donde cada negocio (dueño + 1 empleado) tiene sus datos aislados. El eje no es "muchos módulos" sino que registrar una venta tome segundos y de ahí salgan solos el inventario, los costos, las ventas, las cuentas por cobrar y la utilidad. Alcance v1 deliberadamente acotado: costeo promedio ponderado (único), estados financieros simplificados pero ampliables, ventas al contado y al crédito (CxC), control interno sin DTE/IVA, y offline mínimo (la venta no se pierde si cae la señal). Objetivo de costo: operar en capa gratuita.

## Los 3 riesgos principales

1. **Adopción por fricción de registro** — es el riesgo que mata al proyecto. Si el POS es lento, se abandona igual que el Excel. Mitigación: el registro de ventas (Fase 2) se diseña para velocidad máxima y se prueba con un negocio real antes de construir el resto.
2. **Correctitud de costeo y finanzas** — un solo número mal calculado destruye la confianza del dueño. Mitigación: lógica atómica en el servidor (RPC de Postgres) y verificación numérica manual en cada fase; TypeScript.
3. **Fuga de datos entre clientes** — al ser multiempresa, un negocio viendo datos de otro sería grave. Mitigación: aislamiento a nivel de base de datos (RLS), no solo en la interfaz, probado explícitamente en la Fase 0.

## Siguiente paso más pequeño para validar

No construir todos los módulos primero. Hacer un corte vertical delgado — login + un producto + una venta que descuente stock — y ponerlo frente a un dueño de tienda real para ver si de verdad registra sus ventas. Eso valida el riesgo #1 (adopción) con el mínimo esfuerzo, antes de invertir en reportería y finanzas.

## Decisiones tomadas
- Producto multiempresa ligero (no ERP complejo); comercio de productos; USD.
- Roles: Administrador (dueño) y Empleado (acceso limitado).
- Web responsive (PC + celular), sin app nativa.
- Offline mínimo (reintento de venta, sin motor de sync).
- Costeo: promedio ponderado (único).
- Contabilidad: simplificada ampliable (Estado de Resultados + Caja + Inventario valorizado + Cuentas por Cobrar).
- Sin DTE ni IVA en v1 (diseñado para añadirlos luego).
- Stack: React + Vite + TypeScript + Tailwind (frontend estático gratis) + Supabase (Postgres + Auth + RLS).
- Costo objetivo: capa gratuita; pago (~US$25/mes de BD) solo si el volumen lo exige.

Ver el plan de implementación completo en: `C:\Users\mar_r\.claude\plans\quiero-crear-un-sistema-merry-whistle.md`
