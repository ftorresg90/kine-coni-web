import { requireAuth }          from '@/lib/api/auth'
import { ok, paginated, parseBody, badRequest, internalError } from '@/lib/api/response'
import { createPatientSchema, listPatientsSchema } from '@/lib/validations/patients'

// ---------------------------------------------------------------------------
// GET /api/admin/patients
// Query params: q, name, rut, page, pageSize
// ---------------------------------------------------------------------------
export async function GET(request) {
  const { supabase, response: authError } = await requireAuth()
  if (authError) return authError

  // Parse + validate query params
  const { searchParams } = new URL(request.url)
  const raw = {
    q:        searchParams.get('q')        ?? undefined,
    name:     searchParams.get('name')     ?? undefined,
    rut:      searchParams.get('rut')      ?? undefined,
    page:     searchParams.get('page')     ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  }

  const { data: params, response: validationError } = parseBody(listPatientsSchema, raw)
  if (validationError) return validationError

  const { q, name, rut, page, pageSize } = params
  const from = (page - 1) * pageSize
  const to   = from + pageSize - 1

  let query = supabase
    .from('patients')
    .select('id, full_name, rut, phone, email, birth_date, gender, diagnosis, created_at', { count: 'exact' })
    .is('deleted_at', null)   // exclude soft-deleted records
    .order('created_at', { ascending: false })
    .range(from, to)

  // Free-text search across full_name + rut.
  // The GIN index in the migration is on a computed expression, not a stored
  // generated column, so PostgREST cannot target it by name. We use ilike
  // with OR — acceptable for the single-practitioner data volume.
  // TODO: add a stored `search_vector tsvector GENERATED ALWAYS AS ...`
  // column to the patients table to enable true full-text search via
  // query.textSearch('search_vector', q, { type: 'websearch', config: 'spanish' }).
  if (q) {
    // Escape PostgREST filter special characters before embedding in or() string.
    // Characters ( ) , . are structural in the PostgREST filter DSL and must be
    // escaped as their percent-encoded equivalents so they are treated as literals.
    const safeQ = q.replace(/[(),]/g, (c) => encodeURIComponent(c))
    query = query.or(`full_name.ilike.%${safeQ}%,rut.ilike.%${safeQ}%`)
  }

  // Exact name prefix filter (when used without free-text)
  if (!q && name) {
    query = query.ilike('full_name', `%${name}%`)
  }

  // Exact RUT filter
  if (!q && rut) {
    query = query.eq('rut', rut)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[GET /api/admin/patients]', error)
    return internalError()
  }

  return paginated(data, { count: count ?? 0, page, pageSize })
}

// ---------------------------------------------------------------------------
// POST /api/admin/patients
// Body: CreatePatientSchema
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

  const { data: payload, response: validationError } = parseBody(createPatientSchema, body)
  if (validationError) return validationError

  // Normalise RUT to "XXXXXXXX-D" format (the schema already validated it;
  // re-normalise here to ensure consistent storage regardless of input format)
  if (payload.rut) {
    payload.rut = payload.rut
      .replace(/\./g, '')
      .toUpperCase()
      .replace(/^(\d+)-?([0-9K])$/, '$1-$2')
  }

  const { data, error } = await supabase
    .from('patients')
    .insert(payload)
    .select()
    .single()

  if (error) {
    // Unique constraint on RUT
    if (error.code === '23505') {
      return badRequest('Ya existe un paciente con este RUT.', 'DUPLICATE_RUT')
    }
    console.error('[POST /api/admin/patients]', error)
    return internalError()
  }

  return ok(data, 201)
}
