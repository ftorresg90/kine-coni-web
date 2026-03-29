// ---------------------------------------------------------------------------
// Notification Templates — Constanza Anjarí, Kinesióloga
// ---------------------------------------------------------------------------
// Channel coverage:
//   whatsapp  → paciente  (≤ 300 chars when possible, plain text)
//   telegram  → kine      (Markdown, puede ser más extenso)
//   email     → paciente  (subject + body HTML/text, solo si tiene email)
//
// Cada template declara:
//   template   → string con placeholders {{variable}}
//   variables  → array de claves requeridas para renderizar
//   first_session_variant (opcional) → override para primera sesión
//
// Para emails:
//   subject    → asunto del correo
//   body       → cuerpo en HTML (puede incluir \n para salto de línea)
//
// Firma canónica usada en todos los canales:
//   "Constanza Anjarí, Kinesióloga | +56 9 8292 7833"
// ---------------------------------------------------------------------------

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP  (paciente)
// ─────────────────────────────────────────────────────────────────────────────

export const WHATSAPP_TEMPLATES = {

  /**
   * 1. Confirmación de cita
   * Disparador: cita creada/confirmada.
   * Target: ≤ 300 chars en variante de seguimiento.
   */
  confirmacion: {
    variables: [
      'nombre_paciente_corto',
      'fecha_cita',
      'hora_cita',
      'hora_fin_cita',
      'servicio',
    ],
    template:
      'Hola {{nombre_paciente_corto}} 👋 Tu cita de *{{servicio}}* quedó confirmada para el {{fecha_cita}} de {{hora_cita}} a {{hora_fin_cita}} hrs.\n\nAny duda me avisas.\n_Constanza Anjarí, Kinesióloga | +56 9 8292 7833_',

    first_session_variant: {
      variables: [
        'nombre_paciente_corto',
        'fecha_cita',
        'hora_cita',
        'hora_fin_cita',
        'servicio',
        'direccion_paciente',
      ],
      template:
        'Hola {{nombre_paciente_corto}} 👋 Tu *primera sesión* de {{servicio}} quedó confirmada para el {{fecha_cita}} de {{hora_cita}} a {{hora_fin_cita}} hrs.\n\n📍 Dirección: {{direccion_paciente}}\n\nTe espero puntual. Cualquier duda me escribes aquí.\n_Constanza Anjarí, Kinesióloga | +56 9 8292 7833_',
    },
  },

  /**
   * 2. Recordatorio 24 horas antes
   * Disparador: cron que corre a las 09:00 del día anterior.
   */
  recordatorio_24h: {
    variables: [
      'nombre_paciente_corto',
      'fecha_cita',
      'hora_cita',
      'servicio',
    ],
    template:
      '⏰ Recuerda que mañana {{fecha_cita}} tienes tu sesión de *{{servicio}}* a las {{hora_cita}} hrs.\n\n¿Tienes alguna consulta? Escríbeme.\n_Constanza Anjarí, Kinesióloga | +56 9 8292 7833_',

    first_session_variant: {
      variables: [
        'nombre_paciente_corto',
        'fecha_cita',
        'hora_cita',
        'servicio',
        'direccion_paciente',
      ],
      template:
        '⏰ Recuerda que mañana {{fecha_cita}} tienes tu *primera sesión* de {{servicio}} a las {{hora_cita}} hrs.\n\n📍 {{direccion_paciente}}\n\nTe recomiendo llegar con ropa cómoda.\n_Constanza Anjarí, Kinesióloga | +56 9 8292 7833_',
    },
  },

  /**
   * 3. Recordatorio 2 horas antes
   * Disparador: cron que corre con 2 horas de anticipación.
   * Debe ser muy corto; no superar 200 chars.
   */
  recordatorio_2h: {
    variables: [
      'nombre_paciente_corto',
      'hora_cita',
      'servicio',
    ],
    template:
      '⏳ {{nombre_paciente_corto}}, en 2 horas tienes tu sesión de *{{servicio}}* ({{hora_cita}} hrs). ¡Nos vemos pronto!\n_Constanza Anjarí, Kinesióloga_',

    first_session_variant: {
      variables: [
        'nombre_paciente_corto',
        'hora_cita',
        'servicio',
        'direccion_paciente',
      ],
      template:
        '⏳ {{nombre_paciente_corto}}, en 2 horas es tu *primera sesión* de {{servicio}} ({{hora_cita}} hrs).\n📍 {{direccion_paciente}}\n¡Nos vemos!\n_Constanza Anjarí, Kinesióloga_',
    },
  },

  /**
   * 4. Cita cancelada (por la kinesióloga)
   * Disparador: cambio de estado → 'cancelled' hecho desde el admin.
   */
  cancelacion: {
    variables: [
      'nombre_paciente_corto',
      'fecha_cita',
      'hora_cita',
      'servicio',
    ],
    template:
      'Hola {{nombre_paciente_corto}}, lamentablemente debo cancelar tu sesión de *{{servicio}}* del {{fecha_cita}} a las {{hora_cita}} hrs.\n\nMe comunico contigo para reagendar. Disculpa los inconvenientes.\n_Constanza Anjarí, Kinesióloga | +56 9 8292 7833_',

    first_session_variant: {
      variables: [
        'nombre_paciente_corto',
        'fecha_cita',
        'hora_cita',
        'servicio',
      ],
      template:
        'Hola {{nombre_paciente_corto}}, lamentablemente debo cancelar tu *primera sesión* de {{servicio}} del {{fecha_cita}} a las {{hora_cita}} hrs.\n\nTe contacto a la brevedad para fijar una nueva fecha.\n_Constanza Anjarí, Kinesióloga | +56 9 8292 7833_',
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM  (kinesióloga — formato Markdown compatible con Bot API)
// ─────────────────────────────────────────────────────────────────────────────

export const TELEGRAM_TEMPLATES = {

  /**
   * 5. Nueva cita creada
   * Disparador: POST /api/admin/appointments — nueva fila insertada.
   */
  nueva_cita: {
    variables: [
      'nombre_paciente',
      'telefono_paciente',
      'fecha_cita',
      'hora_cita',
      'hora_fin_cita',
      'servicio',
      'direccion_paciente',
      'numero_sesion',
    ],
    template:
      '📅 *Nueva cita registrada*\n\n' +
      '👤 *Paciente:* {{nombre_paciente}}\n' +
      '📞 *Teléfono:* {{telefono_paciente}}\n' +
      '🗓 *Fecha:* {{fecha_cita}}\n' +
      '🕐 *Horario:* {{hora_cita}} — {{hora_fin_cita}} hrs\n' +
      '💆 *Servicio:* {{servicio}}\n' +
      '📍 *Dirección:* {{direccion_paciente}}\n' +
      '🔢 *N° sesión:* {{numero_sesion}}\n',

    first_session_variant: {
      variables: [
        'nombre_paciente',
        'telefono_paciente',
        'fecha_cita',
        'hora_cita',
        'hora_fin_cita',
        'servicio',
        'direccion_paciente',
      ],
      template:
        '🌟 *Primera sesión registrada*\n\n' +
        '👤 *Paciente:* {{nombre_paciente}}\n' +
        '📞 *Teléfono:* {{telefono_paciente}}\n' +
        '🗓 *Fecha:* {{fecha_cita}}\n' +
        '🕐 *Horario:* {{hora_cita}} — {{hora_fin_cita}} hrs\n' +
        '💆 *Servicio:* {{servicio}}\n' +
        '📍 *Dirección:* {{direccion_paciente}}\n',
    },
  },

  /**
   * 6. Cita próxima en 1 hora
   * Disparador: cron que corre 60 min antes de cada cita.
   * Recordatorio rápido para que la kine se prepare.
   */
  proxima_en_1h: {
    variables: [
      'nombre_paciente',
      'hora_cita',
      'servicio',
      'direccion_paciente',
      'numero_sesion',
    ],
    template:
      '⏰ *En 1 hora tienes cita*\n\n' +
      '👤 {{nombre_paciente}}\n' +
      '🕐 {{hora_cita}} hrs — {{servicio}}\n' +
      '📍 {{direccion_paciente}}\n' +
      '🔢 Sesión N° {{numero_sesion}}',

    first_session_variant: {
      variables: [
        'nombre_paciente',
        'hora_cita',
        'servicio',
        'direccion_paciente',
      ],
      template:
        '⏰ *En 1 hora: PRIMERA SESIÓN*\n\n' +
        '👤 {{nombre_paciente}}\n' +
        '🕐 {{hora_cita}} hrs — {{servicio}}\n' +
        '📍 {{direccion_paciente}}',
    },
  },

  /**
   * 7. Resumen diario
   * Disparador: cron a las 07:30 cada mañana.
   * {{citas_del_dia}} es un bloque de texto pre-formateado que debe
   * construirse iterando la lista de citas antes de llamar a renderTemplate.
   * Formato sugerido para cada ítem:
   *   "• 10:00 - 11:00 | María G. | Neurorehabilitación | Av. Libertad 1234"
   */
  resumen_diario: {
    variables: [
      'fecha_cita',
      'total_citas',
      'citas_del_dia',
    ],
    template:
      '📋 *Agenda del {{fecha_cita}}*\n' +
      '────────────────────\n' +
      '{{citas_del_dia}}\n' +
      '────────────────────\n' +
      '📊 Total: *{{total_citas}} cita(s)*\n\n' +
      '_Constanza Anjarí, Kinesióloga_',
  },

  /**
   * Variante resumen diario sin citas
   */
  resumen_diario_vacio: {
    variables: ['fecha_cita'],
    template:
      '📋 *Agenda del {{fecha_cita}}*\n\n' +
      '✅ No tienes citas programadas para hoy. ¡Disfruta el día!\n\n' +
      '_Constanza Anjarí, Kinesióloga_',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL  (paciente — solo si tiene email registrado)
// Proveedor recomendado: Resend (resend.com) o SendGrid
// body: texto plano con saltos de línea \n (adaptar a HTML en el servicio)
// ─────────────────────────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES = {

  /**
   * 8. Confirmación formal de cita
   * Disparador: cita creada/confirmada.
   * Más detallado que WhatsApp; incluye instrucciones y datos completos.
   */
  confirmacion: {
    variables: [
      'nombre_paciente',
      'fecha_cita',
      'hora_cita',
      'hora_fin_cita',
      'servicio',
      'direccion_paciente',
      'numero_sesion',
    ],

    subject: 'Confirmación de tu cita — {{fecha_cita}} a las {{hora_cita}} hrs',

    body:
      'Hola {{nombre_paciente}},\n\n' +
      'Te confirmo tu sesión de kinesiología con todos los detalles:\n\n' +
      '  Servicio:    {{servicio}}\n' +
      '  Fecha:       {{fecha_cita}}\n' +
      '  Horario:     {{hora_cita}} — {{hora_fin_cita}} hrs\n' +
      '  Dirección:   {{direccion_paciente}}\n' +
      '  N° de sesión: {{numero_sesion}}\n\n' +
      'Si necesitas reagendar o cancelar, por favor avísame con al menos 24 horas de anticipación ' +
      'al +56 9 8292 7833 (WhatsApp).\n\n' +
      '¡Nos vemos pronto!\n\n' +
      'Constanza Anjarí\n' +
      'Kinesióloga\n' +
      '+56 9 8292 7833 | klga.conianjari@gmail.com\n' +
      'Viña del Mar · Valparaíso · Quilpué · Con Con · Villa Alemana',

    first_session_variant: {
      variables: [
        'nombre_paciente',
        'fecha_cita',
        'hora_cita',
        'hora_fin_cita',
        'servicio',
        'direccion_paciente',
      ],

      subject: 'Bienvenida/o — Tu primera sesión el {{fecha_cita}}',

      body:
        'Hola {{nombre_paciente}},\n\n' +
        '¡Bienvenida/o! Estoy muy contenta de acompañarte en tu proceso de rehabilitación. ' +
        'Te confirmo todos los datos de tu primera sesión:\n\n' +
        '  Servicio:  {{servicio}}\n' +
        '  Fecha:     {{fecha_cita}}\n' +
        '  Horario:   {{hora_cita}} — {{hora_fin_cita}} hrs\n' +
        '  Dirección: {{direccion_paciente}}\n\n' +
        'Recomendaciones para la primera sesión:\n' +
        '  • Usa ropa cómoda que permita movilidad.\n' +
        '  • Si tienes informes médicos o exámenes previos, tráelos contigo.\n' +
        '  • Llega 5 minutos antes para que podamos comenzar a tiempo.\n\n' +
        'Cualquier duda me escribes al +56 9 8292 7833 (WhatsApp).\n\n' +
        '¡Hasta pronto!\n\n' +
        'Constanza Anjarí\n' +
        'Kinesióloga\n' +
        '+56 9 8292 7833 | klga.conianjari@gmail.com\n' +
        'Viña del Mar · Valparaíso · Quilpué · Con Con · Villa Alemana',
    },
  },

  /**
   * 9. Recordatorio 24 horas
   * Disparador: cron a las 09:00 del día anterior.
   */
  recordatorio_24h: {
    variables: [
      'nombre_paciente',
      'fecha_cita',
      'hora_cita',
      'hora_fin_cita',
      'servicio',
      'direccion_paciente',
    ],

    subject: 'Recordatorio: tu sesión es mañana {{fecha_cita}} a las {{hora_cita}} hrs',

    body:
      'Hola {{nombre_paciente}},\n\n' +
      'Te recuerdo que mañana tienes tu sesión de kinesiología:\n\n' +
      '  Servicio:  {{servicio}}\n' +
      '  Fecha:     {{fecha_cita}}\n' +
      '  Horario:   {{hora_cita}} — {{hora_fin_cita}} hrs\n' +
      '  Dirección: {{direccion_paciente}}\n\n' +
      'Recomendaciones:\n' +
      '  • Llega puntual para aprovechar al máximo tu sesión.\n' +
      '  • Usa ropa cómoda.\n' +
      '  • Si no puedes asistir, avísame con al menos 24 horas de anticipación.\n\n' +
      '¡Nos vemos mañana!\n\n' +
      'Constanza Anjarí\n' +
      'Kinesióloga\n' +
      '+56 9 8292 7833 | klga.conianjari@gmail.com\n' +
      'Viña del Mar · Valparaíso · Quilpué · Con Con · Villa Alemana',

    first_session_variant: {
      variables: [
        'nombre_paciente',
        'fecha_cita',
        'hora_cita',
        'hora_fin_cita',
        'servicio',
        'direccion_paciente',
      ],

      subject: 'Mañana es tu primera sesión — {{fecha_cita}} a las {{hora_cita}} hrs',

      body:
        'Hola {{nombre_paciente}},\n\n' +
        'Mañana es tu primera sesión de kinesiología. ¡Ya falta poco!\n\n' +
        '  Servicio:  {{servicio}}\n' +
        '  Fecha:     {{fecha_cita}}\n' +
        '  Horario:   {{hora_cita}} — {{hora_fin_cita}} hrs\n' +
        '  Dirección: {{direccion_paciente}}\n\n' +
        'Checklist para tu primera sesión:\n' +
        '  • Ropa cómoda y transpirable.\n' +
        '  • Informes médicos o exámenes previos si los tienes.\n' +
        '  • Llega 5 minutos antes.\n' +
        '  • Hidratación: trae agua si lo deseas.\n\n' +
        'Ante cualquier duda escríbeme al +56 9 8292 7833 (WhatsApp).\n\n' +
        '¡Hasta mañana!\n\n' +
        'Constanza Anjarí\n' +
        'Kinesióloga\n' +
        '+56 9 8292 7833 | klga.conianjari@gmail.com\n' +
        'Viña del Mar · Valparaíso · Quilpué · Con Con · Villa Alemana',
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reemplaza todos los placeholders {{variable}} en un string por los valores
 * del objeto `variables`. Las claves no encontradas se dejan tal cual para
 * facilitar la detección de errores en desarrollo.
 *
 * @param {string} template  String con placeholders {{clave}}.
 * @param {Record<string, string|number>} variables  Mapa clave → valor.
 * @returns {string}
 */
export function interpolate(template, variables = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key])
    }
    // En producción podrías retornar '' para no exponer nombres de variables.
    return match
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// renderTemplate — API principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve y renderiza un template de notificación.
 *
 * @param {'whatsapp'|'telegram'|'email'} channel
 *   Canal de notificación.
 *
 * @param {string} templateKey
 *   Clave del template dentro del canal (ej. 'confirmacion', 'recordatorio_24h').
 *
 * @param {Record<string, string|number>} variables
 *   Variables dinámicas para rellenar los placeholders.
 *
 * @param {{ isFirstSession?: boolean }} [options]
 *   Opciones adicionales:
 *   - isFirstSession: si es true usa `first_session_variant` cuando exista.
 *
 * @returns {{ subject?: string, body?: string, template?: string, text?: string }}
 *   Para email retorna { subject, body, text }.
 *   Para whatsapp/telegram retorna { text }.
 *   Lanza Error si el canal o clave no existe.
 *
 * @example
 * // WhatsApp — confirmación primera sesión
 * const msg = renderTemplate('whatsapp', 'confirmacion', {
 *   nombre_paciente_corto: 'María',
 *   fecha_cita:            'martes 10 de junio',
 *   hora_cita:             '10:00',
 *   hora_fin_cita:         '11:00',
 *   servicio:              'Neurorehabilitación',
 *   direccion_paciente:    'Av. Libertad 1234, Viña del Mar',
 * }, { isFirstSession: true })
 * // → { text: 'Hola María ...' }
 *
 * @example
 * // Email — recordatorio 24h
 * const { subject, body } = renderTemplate('email', 'recordatorio_24h', {
 *   nombre_paciente: 'María González',
 *   fecha_cita:      'martes 10 de junio',
 *   hora_cita:       '10:00',
 *   hora_fin_cita:   '11:00',
 *   servicio:        'Neurorehabilitación',
 *   direccion_paciente: 'Av. Libertad 1234, Viña del Mar',
 * })
 */
export function renderTemplate(channel, templateKey, variables = {}, options = {}) {
  const { isFirstSession = false } = options

  const channelMap = {
    whatsapp: WHATSAPP_TEMPLATES,
    telegram: TELEGRAM_TEMPLATES,
    email:    EMAIL_TEMPLATES,
  }

  const store = channelMap[channel]
  if (!store) {
    throw new Error(
      `renderTemplate: canal desconocido "${channel}". ` +
      `Canales válidos: ${Object.keys(channelMap).join(', ')}.`
    )
  }

  const definition = store[templateKey]
  if (!definition) {
    throw new Error(
      `renderTemplate: template "${templateKey}" no existe en canal "${channel}". ` +
      `Templates disponibles: ${Object.keys(store).join(', ')}.`
    )
  }

  // Seleccionar variante
  const variant =
    isFirstSession && definition.first_session_variant
      ? definition.first_session_variant
      : definition

  // Email: renderizar subject + body + body como texto plano
  if (channel === 'email') {
    const subject = interpolate(variant.subject, variables)
    const body    = interpolate(variant.body, variables)
    // Versión HTML básica: saltos de línea → <br>, negrita no aplica en texto plano
    const html = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>\n')
    return { subject, body, html }
  }

  // WhatsApp / Telegram: renderizar template
  const text = interpolate(variant.template, variables)
  return { text }
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON snapshot — útil para integraciones externas o testing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna todos los templates en formato JSON plano compatible con
 * integraciones de terceros (Twilio Content API, Telegram Bot API schemas, etc.).
 *
 * @returns {object}
 */
export function getTemplatesAsJSON() {
  return {
    whatsapp: {
      confirmacion: {
        template:  WHATSAPP_TEMPLATES.confirmacion.template,
        variables: WHATSAPP_TEMPLATES.confirmacion.variables,
        first_session_variant: {
          template:  WHATSAPP_TEMPLATES.confirmacion.first_session_variant.template,
          variables: WHATSAPP_TEMPLATES.confirmacion.first_session_variant.variables,
        },
      },
      recordatorio_24h: {
        template:  WHATSAPP_TEMPLATES.recordatorio_24h.template,
        variables: WHATSAPP_TEMPLATES.recordatorio_24h.variables,
        first_session_variant: {
          template:  WHATSAPP_TEMPLATES.recordatorio_24h.first_session_variant.template,
          variables: WHATSAPP_TEMPLATES.recordatorio_24h.first_session_variant.variables,
        },
      },
      recordatorio_2h: {
        template:  WHATSAPP_TEMPLATES.recordatorio_2h.template,
        variables: WHATSAPP_TEMPLATES.recordatorio_2h.variables,
        first_session_variant: {
          template:  WHATSAPP_TEMPLATES.recordatorio_2h.first_session_variant.template,
          variables: WHATSAPP_TEMPLATES.recordatorio_2h.first_session_variant.variables,
        },
      },
      cancelacion: {
        template:  WHATSAPP_TEMPLATES.cancelacion.template,
        variables: WHATSAPP_TEMPLATES.cancelacion.variables,
        first_session_variant: {
          template:  WHATSAPP_TEMPLATES.cancelacion.first_session_variant.template,
          variables: WHATSAPP_TEMPLATES.cancelacion.first_session_variant.variables,
        },
      },
    },
    telegram: {
      nueva_cita: {
        template:  TELEGRAM_TEMPLATES.nueva_cita.template,
        variables: TELEGRAM_TEMPLATES.nueva_cita.variables,
        first_session_variant: {
          template:  TELEGRAM_TEMPLATES.nueva_cita.first_session_variant.template,
          variables: TELEGRAM_TEMPLATES.nueva_cita.first_session_variant.variables,
        },
      },
      proxima_en_1h: {
        template:  TELEGRAM_TEMPLATES.proxima_en_1h.template,
        variables: TELEGRAM_TEMPLATES.proxima_en_1h.variables,
        first_session_variant: {
          template:  TELEGRAM_TEMPLATES.proxima_en_1h.first_session_variant.template,
          variables: TELEGRAM_TEMPLATES.proxima_en_1h.first_session_variant.variables,
        },
      },
      resumen_diario: {
        template:  TELEGRAM_TEMPLATES.resumen_diario.template,
        variables: TELEGRAM_TEMPLATES.resumen_diario.variables,
      },
      resumen_diario_vacio: {
        template:  TELEGRAM_TEMPLATES.resumen_diario_vacio.template,
        variables: TELEGRAM_TEMPLATES.resumen_diario_vacio.variables,
      },
    },
    email: {
      confirmacion: {
        subject:   EMAIL_TEMPLATES.confirmacion.subject,
        body:      EMAIL_TEMPLATES.confirmacion.body,
        variables: EMAIL_TEMPLATES.confirmacion.variables,
        first_session_variant: {
          subject:   EMAIL_TEMPLATES.confirmacion.first_session_variant.subject,
          body:      EMAIL_TEMPLATES.confirmacion.first_session_variant.body,
          variables: EMAIL_TEMPLATES.confirmacion.first_session_variant.variables,
        },
      },
      recordatorio_24h: {
        subject:   EMAIL_TEMPLATES.recordatorio_24h.subject,
        body:      EMAIL_TEMPLATES.recordatorio_24h.body,
        variables: EMAIL_TEMPLATES.recordatorio_24h.variables,
        first_session_variant: {
          subject:   EMAIL_TEMPLATES.recordatorio_24h.first_session_variant.subject,
          body:      EMAIL_TEMPLATES.recordatorio_24h.first_session_variant.body,
          variables: EMAIL_TEMPLATES.recordatorio_24h.first_session_variant.variables,
        },
      },
    },
  }
}
