import { z } from 'zod'

// ---------------------------------------------------------------------------
// ISO 8601 datetime with timezone offset.
// Zod's z.iso.datetime() requires a Z suffix; we accept any offset because
// the frontend sends America/Santiago times as "+HH:MM" strings in ISO 8601.
// We parse with the native Date constructor and re-validate the result.
// ---------------------------------------------------------------------------
const isoDatetime = z
  .string()
  .trim()
  .refine(
    (val) => {
      const d = new Date(val)
      return !isNaN(d.getTime())
    },
    { message: 'Fecha/hora inválida. Use formato ISO 8601 con timezone (ej: 2025-06-10T09:00:00-04:00).' }
  )

// Minimum appointment duration: 15 minutes
const MIN_DURATION_MS = 15 * 60 * 1000

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------
export const createAppointmentSchema = z
  .object({
    patient_id: z.string().uuid({ message: 'patient_id debe ser un UUID válido.' }),
    starts_at:  isoDatetime,
    ends_at:    isoDatetime,
    status:     z
                  .enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'])
                  .default('scheduled'),
    service:    z.string().trim().min(2).max(200),
    location:   z.string().trim().max(500).nullable().optional(),
    notes:      z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.starts_at)
    const end   = new Date(data.ends_at)

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'ends_at debe ser posterior a starts_at.',
      })
      return
    }

    if (end - start < MIN_DURATION_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'La duración mínima de una cita es de 15 minutos.',
      })
    }
  })

// ---------------------------------------------------------------------------
// UPDATE — partial; cross-field check only when both times are supplied
// ---------------------------------------------------------------------------
export const updateAppointmentSchema = z
  .object({
    patient_id: z.string().uuid().optional(),
    starts_at:  isoDatetime.optional(),
    ends_at:    isoDatetime.optional(),
    status:     z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
    service:    z.string().trim().min(2).max(200).optional(),
    location:   z.string().trim().max(500).nullable().optional(),
    notes:      z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.starts_at || !data.ends_at) return  // partial update, skip cross-field check

    const start = new Date(data.starts_at)
    const end   = new Date(data.ends_at)

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'ends_at debe ser posterior a starts_at.',
      })
      return
    }

    if (end - start < MIN_DURATION_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_at'],
        message: 'La duración mínima de una cita es de 15 minutos.',
      })
    }
  })

// ---------------------------------------------------------------------------
// List query params — supports weekly view and generic range filter
// ---------------------------------------------------------------------------
export const listAppointmentsSchema = z
  .object({
    // Date range (ISO date strings or full datetimes)
    from:       z.string().optional(),
    to:         z.string().optional(),
    // Status filter (comma-separated: "scheduled,confirmed").
    // Each token must be a valid status value.
    status:     z.string().optional().refine(
      (val) => {
        if (!val) return true
        const VALID = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
        return val.split(',').map((s) => s.trim()).every((s) => VALID.includes(s))
      },
      { message: 'status contiene valores inválidos. Valores permitidos: scheduled, confirmed, completed, cancelled, no_show.' }
    ),
    patient_id: z.string().uuid().optional(),
    // Convenience shorthand: "week" fills from/to for the current 7-day window
    view:       z.enum(['week', 'range']).default('range'),
    // Pagination
    page:       z.coerce.number().int().min(1).default(1),
    pageSize:   z.coerce.number().int().min(1).max(200).default(50),
  })
  .superRefine((data, ctx) => {
    if (data.from && isNaN(new Date(data.from).getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'from debe ser fecha válida.' })
    }
    if (data.to && isNaN(new Date(data.to).getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'to debe ser fecha válida.' })
    }
  })
