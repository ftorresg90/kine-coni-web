import { z } from 'zod'

// ---------------------------------------------------------------------------
// RUT chileno: validates the check digit using the official algorithm.
// Accepts formats: 12345678-9, 12.345.678-9, 12345678K, etc.
// Returns the normalised form "XXXXXXXX-D" (no dots, uppercase K) or throws.
// ---------------------------------------------------------------------------
function normaliseRut(raw) {
  // Strip dots and spaces, uppercase
  const cleaned = raw.replace(/\./g, '').replace(/\s/g, '').toUpperCase()

  // Must match digits optionally followed by hyphen + digit or K
  if (!/^\d{7,8}-?[\dK]$/.test(cleaned)) return null

  const [body, dv] = cleaned.includes('-')
    ? cleaned.split('-')
    : [cleaned.slice(0, -1), cleaned.slice(-1)]

  // Compute expected check digit
  const digits = body.split('').reverse()
  const factors = [2, 3, 4, 5, 6, 7, 2, 3]
  const sum = digits.reduce((acc, d, i) => acc + parseInt(d, 10) * factors[i], 0)
  const remainder = 11 - (sum % 11)
  const expected =
    remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  if (dv !== expected) return null

  return `${body}-${dv}`
}

// ---------------------------------------------------------------------------
// Shared refinement used by both create and update schemas
// ---------------------------------------------------------------------------
const rutField = z
  .string()
  .trim()
  .transform((val) => val || null)  // treat empty string as null
  .nullable()
  .optional()
  .superRefine((val, ctx) => {
    if (!val) return                 // null / undefined is valid (field is optional)
    if (normaliseRut(val) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RUT inválido. Verifica el dígito verificador.',
      })
    }
  })

// ---------------------------------------------------------------------------
// CREATE — all required fields explicit
// ---------------------------------------------------------------------------
export const createPatientSchema = z.object({
  full_name:  z.string().trim().min(2).max(200),
  rut:        rutField,
  birth_date: z.string().date().nullable().optional(),   // "YYYY-MM-DD"
  gender:     z.enum(['masculino', 'femenino', 'otro']).nullable().optional(),
  phone:      z.string().trim().min(7).max(20).nullable().optional(),
  email:      z.email().nullable().optional(),
  address:    z.string().trim().max(500).nullable().optional(),
  diagnosis:  z.string().trim().max(2000).nullable().optional(),
  notes:      z.string().trim().max(5000).nullable().optional(),
})

// ---------------------------------------------------------------------------
// UPDATE — every field optional (partial patch semantics)
// ---------------------------------------------------------------------------
export const updatePatientSchema = createPatientSchema.partial()

// ---------------------------------------------------------------------------
// List query params
// ---------------------------------------------------------------------------
export const listPatientsSchema = z.object({
  // Free-text search across full_name and rut
  q:        z.string().trim().max(200).optional(),
  // Exact name filter (prefix match)
  name:     z.string().trim().max(200).optional(),
  // Exact RUT filter
  rut:      z.string().trim().max(20).optional(),
  // Pagination
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
})
