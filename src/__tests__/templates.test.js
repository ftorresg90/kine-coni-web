/**
 * Unit tests for src/lib/notifications/templates.js
 *
 * Covers:
 *   - interpolate() — placeholder substitution and missing-key preservation
 *   - renderTemplate() — channel/key routing, variant selection, email output
 *   - WhatsApp message length constraint (≤ 300 chars for reminder/confirmation)
 *   - renderTemplate() error cases (unknown channel, unknown key)
 */

import { describe, it, expect } from 'vitest'
import {
  interpolate,
  renderTemplate,
  WHATSAPP_TEMPLATES,
} from '@/lib/notifications/templates.js'

// ---------------------------------------------------------------------------
// interpolate()
// ---------------------------------------------------------------------------

describe('interpolate', () => {
  it('replaces a single placeholder', () => {
    expect(interpolate('Hola {{nombre}}', { nombre: 'María' })).toBe('Hola María')
  })

  it('replaces multiple distinct placeholders', () => {
    const result = interpolate('{{a}} y {{b}}', { a: 'uno', b: 'dos' })
    expect(result).toBe('uno y dos')
  })

  it('replaces the same placeholder that appears more than once', () => {
    const result = interpolate('{{x}} {{x}}', { x: 'hola' })
    expect(result).toBe('hola hola')
  })

  it('converts numeric values to strings', () => {
    const result = interpolate('Sesión N° {{n}}', { n: 5 })
    expect(result).toBe('Sesión N° 5')
  })

  it('leaves missing placeholders intact (does NOT remove them)', () => {
    const result = interpolate('Hola {{nombre}}, tu cita es el {{fecha}}', { nombre: 'Ana' })
    // {{fecha}} must remain untouched
    expect(result).toBe('Hola Ana, tu cita es el {{fecha}}')
    expect(result).toContain('{{fecha}}')
  })

  it('returns the original string when variables is empty', () => {
    const tpl = 'Sin {{variables}} aqui'
    expect(interpolate(tpl, {})).toBe(tpl)
  })

  it('handles templates with no placeholders', () => {
    expect(interpolate('Sin placeholders', { x: '1' })).toBe('Sin placeholders')
  })
})

// ---------------------------------------------------------------------------
// renderTemplate() — routing and output shape
// ---------------------------------------------------------------------------

/** Minimal complete variables for the WhatsApp confirmacion template. */
const VARS_WA_CONFIRMACION = {
  nombre_paciente_corto: 'María',
  fecha_cita:            'martes 10 de junio',
  hora_cita:             '10:00',
  hora_fin_cita:         '11:00',
  servicio:              'Neurorehabilitación',
}

const VARS_WA_CONFIRMACION_FIRST = {
  ...VARS_WA_CONFIRMACION,
  direccion_paciente: 'Av. Libertad 1234, Viña del Mar',
}

const VARS_WA_RECORDATORIO_24H = {
  nombre_paciente_corto: 'María',
  fecha_cita:            'martes 10 de junio',
  hora_cita:             '10:00',
  servicio:              'Neurorehabilitación',
}

const VARS_WA_RECORDATORIO_2H = {
  nombre_paciente_corto: 'María',
  hora_cita:             '10:00',
  servicio:              'Neurorehabilitación',
}

const VARS_EMAIL_CONFIRMACION = {
  nombre_paciente:    'María González',
  fecha_cita:         'martes 10 de junio',
  hora_cita:          '10:00',
  hora_fin_cita:      '11:00',
  servicio:           'Neurorehabilitación',
  direccion_paciente: 'Av. Libertad 1234',
  numero_sesion:      3,
}

describe('renderTemplate — WhatsApp channel', () => {
  it('returns { text } for whatsapp channel', () => {
    const result = renderTemplate('whatsapp', 'confirmacion', VARS_WA_CONFIRMACION)
    expect(result).toHaveProperty('text')
    expect(typeof result.text).toBe('string')
  })

  it('interpolates all variables in the standard confirmacion template', () => {
    const { text } = renderTemplate('whatsapp', 'confirmacion', VARS_WA_CONFIRMACION)
    expect(text).toContain('María')
    expect(text).toContain('Neurorehabilitación')
    expect(text).toContain('10:00')
    expect(text).toContain('11:00')
    expect(text).toContain('martes 10 de junio')
  })

  it('does not contain unresolved {{placeholders}} in the standard variant', () => {
    const { text } = renderTemplate('whatsapp', 'confirmacion', VARS_WA_CONFIRMACION)
    expect(text).not.toMatch(/\{\{[^}]+\}\}/)
  })

  it('uses first_session_variant when isFirstSession is true', () => {
    const standard  = renderTemplate('whatsapp', 'confirmacion', VARS_WA_CONFIRMACION_FIRST)
    const firstSess = renderTemplate('whatsapp', 'confirmacion', VARS_WA_CONFIRMACION_FIRST, { isFirstSession: true })
    expect(firstSess.text).toContain('primera sesión')
    // Standard variant should NOT contain 'primera sesión'
    expect(standard.text).not.toContain('primera sesión')
  })

  it('first_session_variant includes the address placeholder', () => {
    const { text } = renderTemplate('whatsapp', 'confirmacion', VARS_WA_CONFIRMACION_FIRST, { isFirstSession: true })
    expect(text).toContain('Av. Libertad 1234, Viña del Mar')
  })

  it('standard variant falls back when isFirstSession is false', () => {
    const result = renderTemplate('whatsapp', 'confirmacion', VARS_WA_CONFIRMACION, { isFirstSession: false })
    expect(result.text).not.toContain('primera sesión')
  })
})

describe('renderTemplate — email channel', () => {
  it('returns { subject, body, html } for email channel', () => {
    const result = renderTemplate('email', 'confirmacion', VARS_EMAIL_CONFIRMACION)
    expect(result).toHaveProperty('subject')
    expect(result).toHaveProperty('body')
    expect(result).toHaveProperty('html')
  })

  it('interpolates placeholders in email subject', () => {
    const { subject } = renderTemplate('email', 'confirmacion', VARS_EMAIL_CONFIRMACION)
    expect(subject).toContain('martes 10 de junio')
    expect(subject).toContain('10:00')
    expect(subject).not.toMatch(/\{\{[^}]+\}\}/)
  })

  it('interpolates placeholders in email body', () => {
    const { body } = renderTemplate('email', 'confirmacion', VARS_EMAIL_CONFIRMACION)
    expect(body).toContain('María González')
    expect(body).toContain('Neurorehabilitación')
    expect(body).not.toMatch(/\{\{[^}]+\}\}/)
  })

  it('html output converts newlines to <br> tags', () => {
    const { html } = renderTemplate('email', 'confirmacion', VARS_EMAIL_CONFIRMACION)
    expect(html).toContain('<br>')
  })

  it('html output escapes ampersands', () => {
    const vars = { ...VARS_EMAIL_CONFIRMACION, servicio: 'Kine & Rehab' }
    const { html } = renderTemplate('email', 'confirmacion', vars)
    expect(html).toContain('Kine &amp; Rehab')
    expect(html).not.toContain('Kine & Rehab')
  })

  it('first_session_variant for email uses the welcome subject', () => {
    const vars = { ...VARS_EMAIL_CONFIRMACION }
    delete vars.numero_sesion
    const { subject } = renderTemplate('email', 'confirmacion', vars, { isFirstSession: true })
    expect(subject).toMatch(/primera sesión|Bienvenida/i)
  })
})

// ---------------------------------------------------------------------------
// WhatsApp message length constraints (≤ 300 chars)
// ---------------------------------------------------------------------------

describe('WhatsApp template length', () => {
  /**
   * Returns the rendered length for a given template key under worst-case
   * realistic variable values (longer strings).
   */
  function maxLenStandard(templateKey, extraVars = {}) {
    const vars = {
      nombre_paciente_corto: 'Constanza',
      fecha_cita:            'miércoles 15 de octubre',
      hora_cita:             '18:00',
      hora_fin_cita:         '19:00',
      servicio:              'Neurorehabilitación',
      ...extraVars,
    }
    const { text } = renderTemplate('whatsapp', templateKey, vars)
    return text.length
  }

  it('confirmacion standard variant is ≤ 300 characters', () => {
    const len = maxLenStandard('confirmacion')
    expect(len).toBeLessThanOrEqual(300)
  })

  it('recordatorio_24h standard variant is ≤ 300 characters', () => {
    const len = maxLenStandard('recordatorio_24h')
    expect(len).toBeLessThanOrEqual(300)
  })

  it('recordatorio_2h standard variant is ≤ 200 characters', () => {
    const vars = {
      nombre_paciente_corto: 'Constanza',
      hora_cita:             '18:00',
      servicio:              'Neurorehabilitación',
    }
    const { text } = renderTemplate('whatsapp', 'recordatorio_2h', vars)
    expect(text.length).toBeLessThanOrEqual(200)
  })

  it('cancelacion standard variant is ≤ 300 characters', () => {
    const len = maxLenStandard('cancelacion')
    expect(len).toBeLessThanOrEqual(300)
  })
})

// ---------------------------------------------------------------------------
// renderTemplate() — error handling
// ---------------------------------------------------------------------------

describe('renderTemplate — error cases', () => {
  it('throws for an unknown channel', () => {
    expect(() => renderTemplate('sms', 'confirmacion', {})).toThrow(/canal desconocido/i)
  })

  it('throws for an unknown template key within a valid channel', () => {
    expect(() => renderTemplate('whatsapp', 'no_existe', {})).toThrow(/no existe/i)
  })

  it('includes the channel name in the error for unknown channel', () => {
    expect(() => renderTemplate('push', 'confirmacion', {})).toThrow('push')
  })

  it('includes the template key in the error for unknown template', () => {
    expect(() => renderTemplate('whatsapp', 'ghost_template', {})).toThrow('ghost_template')
  })
})

// ---------------------------------------------------------------------------
// Telegram channel smoke test
// ---------------------------------------------------------------------------

describe('renderTemplate — telegram channel', () => {
  it('renders nueva_cita template', () => {
    const vars = {
      nombre_paciente:    'María González',
      telefono_paciente:  '+56982927833',
      fecha_cita:         'martes 10 de junio',
      hora_cita:          '10:00',
      hora_fin_cita:      '11:00',
      servicio:           'Neurorehabilitación',
      direccion_paciente: 'Av. Libertad 1234',
      numero_sesion:      1,
    }
    const { text } = renderTemplate('telegram', 'nueva_cita', vars)
    expect(text).toContain('María González')
    expect(text).not.toMatch(/\{\{[^}]+\}\}/)
  })

  it('first_session_variant for telegram says "Primera sesión"', () => {
    const vars = {
      nombre_paciente:    'Ana',
      telefono_paciente:  '+56912345678',
      fecha_cita:         'lunes 1 de julio',
      hora_cita:          '09:00',
      hora_fin_cita:      '10:00',
      servicio:           'Kinesiotaping',
      direccion_paciente: 'Calle 1',
    }
    const { text } = renderTemplate('telegram', 'nueva_cita', vars, { isFirstSession: true })
    expect(text).toContain('Primera sesión')
  })
})
