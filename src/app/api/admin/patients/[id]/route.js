import { requireAuth }            from '@/lib/api/auth'
import { ok, notFound, badRequest, internalError, parseBody } from '@/lib/api/response'
import { updatePatientSchema }    from '@/lib/validations/patients'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUuid(val) {
  return typeof val === 'string' && UUID_RE.test(val)
}

// ---------------------------------------------------------------------------
// GET /api/admin/patients/[id]
// Returns patient detail plus their full appointment history.
// ---------------------------------------------------------------------------
export async function GET(_request, { params }) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  if (!isValidUuid(id)) return badRequest('ID de paciente inválido.', 'INVALID_ID')

  // Fetch patient
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (patientError || !patient) {
    return notFound('Paciente no encontrado.')
  }

  // Fetch appointment history (all statuses, newest first)
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at, status, service, location, notes, created_at')
    .eq('patient_id', id)
    .order('starts_at', { ascending: false })

  if (apptError) {
    console.error('[GET /api/admin/patients/[id] appointments]', apptError)
    return internalError()
  }

  return ok({ ...patient, appointments: appointments ?? [] })
}

// ---------------------------------------------------------------------------
// PUT /api/admin/patients/[id]
// Partial update — only supplied fields are changed.
// ---------------------------------------------------------------------------
export async function PUT(request, { params }) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  if (!isValidUuid(id)) return badRequest('ID de paciente inválido.', 'INVALID_ID')

  // Ensure patient exists and is not deleted
  const { data: existing, error: findError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (findError || !existing) {
    return notFound('Paciente no encontrado.')
  }

  let body
  try {
    body = await request.json()
  } catch {
    return badRequest('El cuerpo de la solicitud no es JSON válido.')
  }

  const { data: payload, response: validationError } = parseBody(updatePatientSchema, body)
  if (validationError) return validationError

  if (Object.keys(payload).length === 0) {
    return badRequest('No se enviaron campos a actualizar.', 'EMPTY_UPDATE')
  }

  // Normalise RUT if present
  if (payload.rut) {
    payload.rut = payload.rut
      .replace(/\./g, '')
      .toUpperCase()
      .replace(/^(\d+)-?([0-9K])$/, '$1-$2')
  }

  const { data, error } = await supabase
    .from('patients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return badRequest('Ya existe un paciente con este RUT.', 'DUPLICATE_RUT')
    }
    console.error('[PUT /api/admin/patients/[id]]', error)
    return internalError()
  }

  return ok(data)
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/patients/[id]
// Soft delete — sets deleted_at timestamp, record is never physically removed.
// ---------------------------------------------------------------------------
export async function DELETE(_request, { params }) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params

  if (!isValidUuid(id)) return badRequest('ID de paciente inválido.', 'INVALID_ID')

  const { data: existing, error: findError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (findError || !existing) {
    return notFound('Paciente no encontrado.')
  }

  const { error } = await supabase
    .from('patients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[DELETE /api/admin/patients/[id]]', error)
    return internalError()
  }

  return ok({ message: 'Paciente eliminado correctamente.' })
}
