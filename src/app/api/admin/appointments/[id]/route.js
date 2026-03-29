import { requireAuth }          from '@/lib/api/auth'
import { ok, notFound, badRequest, internalError, parseBody } from '@/lib/api/response'
import { updateAppointmentSchema } from '@/lib/validations/appointments'
import { checkOverlap }           from '@/lib/api/overlap'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUuid(val) {
  return typeof val === 'string' && UUID_RE.test(val)
}

// ---------------------------------------------------------------------------
// GET /api/admin/appointments/[id]
// ---------------------------------------------------------------------------
export async function GET(_request, { params }) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  if (!isValidUuid(id)) return badRequest('ID de cita inválido.', 'INVALID_ID')

  const { data, error } = await supabase
    .from('appointments')
    .select(`*, patients ( id, full_name, rut, phone, email, address )`)
    .eq('id', id)
    .single()

  if (error || !data) {
    return notFound('Cita no encontrada.')
  }

  return ok(data)
}

// ---------------------------------------------------------------------------
// PUT /api/admin/appointments/[id]
// Partial update with overlap re-validation when times change.
// ---------------------------------------------------------------------------
export async function PUT(request, { params }) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  if (!isValidUuid(id)) return badRequest('ID de cita inválido.', 'INVALID_ID')

  // Fetch the current appointment to have its existing times available
  const { data: existing, error: findError } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at, status, patient_id')
    .eq('id', id)
    .single()

  if (findError || !existing) {
    return notFound('Cita no encontrada.')
  }

  let body
  try {
    body = await request.json()
  } catch {
    return badRequest('El cuerpo de la solicitud no es JSON válido.')
  }

  const { data: payload, response: validationError } = parseBody(updateAppointmentSchema, body)
  if (validationError) return validationError

  if (Object.keys(payload).length === 0) {
    return badRequest('No se enviaron campos a actualizar.', 'EMPTY_UPDATE')
  }

  // If patient_id is being changed, verify the new patient exists
  if (payload.patient_id && payload.patient_id !== existing.patient_id) {
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', payload.patient_id)
      .is('deleted_at', null)
      .single()

    if (patientError || !patient) {
      return badRequest('El paciente indicado no existe o ha sido eliminado.', 'PATIENT_NOT_FOUND')
    }
  }

  // Overlap check only when at least one time boundary is changing.
  // Merge proposed times with existing times to build the full proposed window.
  const isTimeChanging = payload.starts_at || payload.ends_at

  if (isTimeChanging) {
    const proposedStart = payload.starts_at ?? existing.starts_at
    const proposedEnd   = payload.ends_at   ?? existing.ends_at

    // Cross-field time validation for partial updates
    if (new Date(proposedEnd) <= new Date(proposedStart)) {
      return badRequest('ends_at debe ser posterior a starts_at.', 'VALIDATION_ERROR')
    }

    const overlapResult = await checkOverlap({
      supabase,
      startsAt:  proposedStart,
      endsAt:    proposedEnd,
      excludeId: id,   // exclude this appointment from its own overlap check
    })
    if (overlapResult) return overlapResult.response
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id)
    .select(`*, patients ( id, full_name, rut, phone )`)
    .single()

  if (error) {
    console.error('[PUT /api/admin/appointments/[id]]', error)
    return internalError()
  }

  return ok(data)
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/appointments/[id]
// Logical cancellation — sets status to 'cancelled', never deletes the row.
// Retains the audit trail and prevents the time slot from being accidentally
// re-booked without the admin's awareness.
// ---------------------------------------------------------------------------
export async function DELETE(_request, { params }) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  if (!isValidUuid(id)) return badRequest('ID de cita inválido.', 'INVALID_ID')

  const { data: existing, error: findError } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', id)
    .single()

  if (findError || !existing) {
    return notFound('Cita no encontrada.')
  }

  if (existing.status === 'cancelled') {
    return badRequest('La cita ya está cancelada.', 'ALREADY_CANCELLED')
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[DELETE /api/admin/appointments/[id]]', error)
    return internalError()
  }

  return ok({ message: 'Cita cancelada correctamente.', appointment: data })
}
