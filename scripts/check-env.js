// scripts/check-env.js
// Verifica que todas las variables de entorno requeridas estén definidas.
// Ejecutar con: node scripts/check-env.js
// Retorna exit code 1 si falta alguna variable (apto para CI/CD).

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'CRON_SECRET',
]

const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error('\n[check-env] ERROR: Faltan las siguientes variables de entorno:\n')
  missing.forEach((key) => console.error(`  - ${key}`))
  console.error(
    '\nDefine estas variables en .env.local (desarrollo) o en Vercel → Project Settings → Environment Variables (produccion).\n'
  )
  process.exit(1)
}

console.log('[check-env] OK: Todas las variables de entorno requeridas estan definidas.')
process.exit(0)
