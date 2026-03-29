// ---------------------------------------------------------------------------
// Notification Senders — Constanza Anjarí, Kinesióloga
// ---------------------------------------------------------------------------
// Three fire-and-forget senders, one per notification channel:
//
//   sendTelegram(templateKey, variables, options?)
//     → Sends a Markdown message to the kinesiologist via Telegram Bot API.
//     → Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
//
//   sendWhatsApp(to, templateKey, variables, options?)
//     → Sends a WhatsApp message to a patient via Twilio Messaging API.
//     → Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
//
//   sendEmail(to, templateKey, variables, options?)
//     → Sends an HTML email to a patient via Resend.
//     → Env: RESEND_API_KEY, RESEND_FROM_EMAIL
//
// All three functions:
//   - Never throw — always return { ok: true, messageId } | { ok: false, error }
//   - Log failures via console.error so they appear in Vercel / server logs
//   - Accept an optional `options` object forwarded to renderTemplate
//     (e.g. { isFirstSession: true })
// ---------------------------------------------------------------------------

import { renderTemplate } from './templates'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a phone number to E.164 format for Twilio.
 * Strips spaces, dashes and parentheses.
 * Prepends +56 (Chile) when no country code prefix is present.
 *
 * Examples:
 *   "982927833"      → "+56982927833"
 *   "+56982927833"   → "+56982927833"
 *   "56982927833"    → "+56982927833"
 *   "+1 555-123-4567"→ "+15551234567"
 *
 * @param {string} raw  Raw phone number from the database.
 * @returns {string}    E.164 string.
 */
function toE164(raw) {
  // Strip all non-digit characters except a leading '+'
  const stripped = raw.replace(/[\s\-().]/g, '')
  if (stripped.startsWith('+')) return stripped
  // Already includes country code but without '+'
  if (stripped.startsWith('56') && stripped.length >= 11) return `+${stripped}`
  // Bare local Chilean number (9 digits starting with 9)
  return `+56${stripped}`
}

// ---------------------------------------------------------------------------
// 1. Telegram
// ---------------------------------------------------------------------------

/**
 * Send a Telegram message to the kinesiologist (Coni's chat).
 *
 * Uses the Telegram Bot API `sendMessage` endpoint with `parse_mode=Markdown`.
 * No SDK required — plain fetch to https://api.telegram.org.
 *
 * Required environment variables:
 *   TELEGRAM_BOT_TOKEN  — Bot token from @BotFather, e.g. "7123456789:AAH..."
 *   TELEGRAM_CHAT_ID    — Coni's personal chat ID with the bot, e.g. "-100123456789"
 *
 * @param {string} templateKey
 *   Key from TELEGRAM_TEMPLATES (e.g. 'nueva_cita', 'resumen_diario').
 * @param {Record<string, string|number>} variables
 *   Placeholder values for the template.
 * @param {{ isFirstSession?: boolean }} [options]
 *   Optional renderTemplate options.
 * @returns {Promise<{ ok: true, messageId: number } | { ok: false, error: string }>}
 */
export async function sendTelegram(templateKey, variables, options = {}) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    const error = 'sendTelegram: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados.'
    console.error(error)
    return { ok: false, error }
  }

  let text
  try {
    const rendered = renderTemplate('telegram', templateKey, variables, options)
    text = rendered.text
  } catch (err) {
    console.error('[sendTelegram] renderTemplate error:', err.message)
    return { ok: false, error: err.message }
  }

  try {
    const url  = `https://api.telegram.org/bot${token}/sendMessage`
    const body = {
      chat_id:    chatId,
      text,
      parse_mode: 'Markdown',
      // Disable link previews to keep messages compact
      disable_web_page_preview: true,
    }

    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      const error = `Telegram API error ${data.error_code ?? res.status}: ${data.description ?? 'Unknown error'}`
      console.error('[sendTelegram]', error, '| template:', templateKey)
      return { ok: false, error }
    }

    return { ok: true, messageId: data.result.message_id }
  } catch (err) {
    console.error('[sendTelegram] fetch error:', err.message, '| template:', templateKey)
    return { ok: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// 2. WhatsApp via Twilio
// ---------------------------------------------------------------------------

/**
 * Send a WhatsApp message to a patient via the Twilio Messaging API.
 *
 * Uses HTTP Basic Auth (AccountSid:AuthToken) with `fetch` — no Twilio SDK
 * needed. The Twilio Messaging API endpoint for WhatsApp is the same REST
 * endpoint as SMS but with a `whatsapp:+E164` scheme on both From and To.
 *
 * IMPORTANT — Twilio WhatsApp sandbox vs. production:
 *   In sandbox mode any text can be sent after the patient opts in.
 *   In production (approved WhatsApp Business), outbound messages outside a
 *   24-hour conversation window must use pre-approved HSM (Content Templates).
 *   For reminder/confirmation use cases outside the 24h window you must:
 *     1. Create a Content Template in Twilio Console.
 *     2. Use the ContentSid in the `ContentSid` field instead of `Body`.
 *   The current implementation sends free-text via `Body`, which works in
 *   sandbox and inside open conversation windows.
 *
 * Required environment variables:
 *   TWILIO_ACCOUNT_SID      — e.g. "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *   TWILIO_AUTH_TOKEN       — e.g. "your_auth_token"
 *   TWILIO_WHATSAPP_FROM    — e.g. "whatsapp:+14155238886" (sandbox) or
 *                             your approved number "whatsapp:+56XXXXXXXXX"
 *
 * @param {string} to
 *   Recipient phone number. Accepts bare Chilean numbers ("982927833"),
 *   with country code ("56982927833"), or E.164 ("+56982927833").
 * @param {string} templateKey
 *   Key from WHATSAPP_TEMPLATES (e.g. 'confirmacion', 'recordatorio_24h').
 * @param {Record<string, string|number>} variables
 *   Placeholder values for the template.
 * @param {{ isFirstSession?: boolean }} [options]
 *   Optional renderTemplate options.
 * @returns {Promise<{ ok: true, messageId: string } | { ok: false, error: string }>}
 */
export async function sendWhatsApp(to, templateKey, variables, options = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const from       = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    const error = 'sendWhatsApp: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM no configurados.'
    console.error(error)
    return { ok: false, error }
  }

  if (!to) {
    const error = 'sendWhatsApp: destinatario (to) vacío.'
    console.error(error)
    return { ok: false, error }
  }

  let text
  try {
    const rendered = renderTemplate('whatsapp', templateKey, variables, options)
    text = rendered.text
  } catch (err) {
    console.error('[sendWhatsApp] renderTemplate error:', err.message)
    return { ok: false, error: err.message }
  }

  // Normalise recipient to Twilio's "whatsapp:+E164" scheme
  const toE164Phone = toE164(String(to))
  const toWhatsApp  = `whatsapp:${toE164Phone}`

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    // Twilio requires application/x-www-form-urlencoded
    const params = new URLSearchParams({
      From: from,
      To:   toWhatsApp,
      Body: text,
    })

    // HTTP Basic Auth: base64(AccountSid:AuthToken)
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: params.toString(),
    })

    const data = await res.json()

    if (!res.ok) {
      const error = `Twilio API error ${data.status ?? res.status}: ${data.message ?? 'Unknown error'} (code ${data.code ?? 'N/A'})`
      console.error('[sendWhatsApp]', error, '| to:', toWhatsApp, '| template:', templateKey)
      return { ok: false, error }
    }

    return { ok: true, messageId: data.sid }
  } catch (err) {
    console.error('[sendWhatsApp] fetch error:', err.message, '| to:', toWhatsApp, '| template:', templateKey)
    return { ok: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// 3. Email via Resend
// ---------------------------------------------------------------------------

/**
 * Send an HTML email to a patient via Resend (resend.com).
 *
 * Uses the Resend REST API with `fetch` — no SDK required.
 * The email body is the HTML generated by renderTemplate (which escapes
 * HTML entities and converts `\n` to `<br>` tags).
 *
 * Required environment variables:
 *   RESEND_API_KEY    — e.g. "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 *   RESEND_FROM_EMAIL — e.g. "Constanza Anjarí <citas@tudominio.cl>"
 *                       Must be a verified domain/address in Resend.
 *
 * @param {string} to
 *   Recipient email address, e.g. "paciente@gmail.com".
 * @param {string} templateKey
 *   Key from EMAIL_TEMPLATES (e.g. 'confirmacion', 'recordatorio_24h').
 * @param {Record<string, string|number>} variables
 *   Placeholder values for the template.
 * @param {{ isFirstSession?: boolean }} [options]
 *   Optional renderTemplate options.
 * @returns {Promise<{ ok: true, messageId: string } | { ok: false, error: string }>}
 */
export async function sendEmail(to, templateKey, variables, options = {}) {
  const apiKey  = process.env.RESEND_API_KEY
  const from    = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    const error = 'sendEmail: RESEND_API_KEY o RESEND_FROM_EMAIL no configurados.'
    console.error(error)
    return { ok: false, error }
  }

  if (!to) {
    const error = 'sendEmail: destinatario (to) vacío.'
    console.error(error)
    return { ok: false, error }
  }

  let subject, html
  try {
    const rendered = renderTemplate('email', templateKey, variables, options)
    subject = rendered.subject
    html    = rendered.html
  } catch (err) {
    console.error('[sendEmail] renderTemplate error:', err.message)
    return { ok: false, error: err.message }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    })

    const data = await res.json()

    if (!res.ok) {
      const error = `Resend API error ${res.status}: ${data.message ?? data.name ?? 'Unknown error'}`
      console.error('[sendEmail]', error, '| to:', to, '| template:', templateKey)
      return { ok: false, error }
    }

    return { ok: true, messageId: data.id }
  } catch (err) {
    console.error('[sendEmail] fetch error:', err.message, '| to:', to, '| template:', templateKey)
    return { ok: false, error: err.message }
  }
}
