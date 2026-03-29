import { requireAuth }     from '@/lib/api/auth'
import { ok, paginated, badRequest, internalError, parseBody } from '@/lib/api/response'
import { createAppointmentSchema, listAppointmentsSchema } from '@/lib/validations/appointments'
import { checkOverlap }   from '@/lib/api/overlap'

// ---------------------------------------------------------------------------
// Compute the start/end of the current week in America/Santiago for the
// "view=week" shorthand.  We calculate via Intl.DateTimeFormat to properly
// account for DST transitions.
// ---------------------------------------------------------------------------
function getWeekBounds() {
  const now = new Date()

  // Get the current date parts in America/Santiago
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const [year, month, day] = dateFormatter.format(now).split('-').map(Number)

  // Resolve the current UTC offset for America/Santiago by asking Intl for the
  // time parts — this correctly accounts for DST transitions (UTC-4 in summer,
  // UTC-3 in winter) without hard-coding an offset.
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Santiago',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
  })
  const parts = timeFormatter.formatToParts(now)
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-4'
  // offsetPart looks like "GMT-4" or "GMT-3"; convert to ±HH:MM for ISO 8601
  const offsetMatch = offsetPart.match(/GMT([+-]\d+)/)
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -4
  const offsetStr = `${offsetHours >= 0 ? '+' : '-'}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`

  // Build a Date that represents midnight today in Santiago using the live offset
  const todaySantiago = new Date(
    `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T00:00:00${offsetStr}`
  )

  // dayOfWeek 0=Sunday … 6=Saturday; adjust so week starts on Monday
  const dow = todaySantiago.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const monday = new Date(todaySantiago)
  monday.setDate(monday.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 7)         // exclusive upper bound

  return { from: monday.toISOString(), to: sunday.toISOString() }
}

// ---------------------------------------------------------------------------
// GET /api/admin/appointments
// Query params: from, to, status, patient_id, view, page, pageSize
// ---------------------------------------------------------------------------
export async function GET(request) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const raw = {
    from:       searchParams.get('from')       ?? undefined,
    to:         searchParams.get('to')         ?? undefined,
    status:     searchParams.get('status')     ?? undefined,
    patient_id: searchParams.get('patient_id') ?? undefined,
    view:       searchParams.get('view')       ?? undefined,
    page:       searchParams.get('page')       ?? undefined,
    pageSize:   searchParams.get('pageSize')   ?? undefined,
  }

  const { data: params, response: validationError } = parseBody(listAppointmentsSchema, raw)
  if (validationError) return validationError

  let { from, to, status, patient_id, view, page, pageSize } = params

  // Fill date bounds for weekly view
  if (view === 'week' && !from && !to) {
    const bounds = getWeekBounds()
    from = bounds.from
    to   = bounds.to
  }

  const offset = (page - 1) * pageSize

  let query = supabase
    .from('appointments')
    .select(
      `id, patient_id, starts_at, ends_at, status, service, location, notes, created_at,
       patients ( id, full_name, rut, phone )`,
      { count: 'exact' }
    )
    .order('starts_at', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (from) query = query.gte('starts_at', from)
  if (to)   query = query.lt('starts_at', to)   // half-open: appointments that START before `to`

  if (patient_id) query = query.eq('patient_id', patient_id)

  // Status: accepts comma-separated list e.g. "scheduled,confirmed"
  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean)
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0])
    } else if (statuses.length > 1) {
      query = query.in('status', statuses)
    }
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[GET /api/admin/appointments]', error)
    return internalError()
  }

  return paginated(data, { count: count ?? 0, page, pageSize })
}

// ---------------------------------------------------------------------------
// POST /api/admin/appointments
// Body: CreateAppointmentSchema
// ---------------------------------------------------------------------------
export async function POST(request) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  let body
  try {
    body = await request.json()
  } catch {
    return badRequest('El cuerpo de la solicitud no es JSON válido.')
  }

  const { data: payload, response: validationError } = parseBody(createAppointmentSchema, body)
  if (validationError) return validationError

  // Verify patient exists and is not soft-deleted
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', payload.patient_id)
    .is('deleted_at', null)
    .single()

  if (patientError || !patient) {
    return badRequest('El paciente indicado no existe o ha sido eliminado.', 'PATIENT_NOT_FOUND')
  }

  // Anti-overbooking check
  const overlapResult = await checkOverlap({
    supabase,
    startsAt: payload.starts_at,
    endsAt:   payload.ends_at,
  })
  if (overlapResult) return overlapResult.response

  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select(`*, patients ( id, full_name, rut, phone )`)
    .single()

  if (error) {
    console.error('[POST /api/admin/appointments]', error)
    return internalError()
  }

  return ok(data, 201)
}
