// Aplica un archivo SQL a la base de datos de Supabase usando la cadena de
// conexión en SUPABASE_DB_URL (definida en .env.local, nunca en el chat).
// Uso: node --env-file=.env.local scripts/migrate.mjs supabase/apply_faseN.sql
import { readFileSync } from 'node:fs'
import pg from 'pg'

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Falta SUPABASE_DB_URL en .env.local.')
  process.exit(1)
}
const file = process.argv[2]
if (!file) {
  console.error('Uso: node --env-file=.env.local scripts/migrate.mjs <archivo.sql>')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(sql)
  console.log(`OK: aplicado ${file}`)
} catch (e) {
  // No imprimir la cadena de conexión, solo el mensaje de error.
  console.error('ERROR al aplicar el SQL:', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
