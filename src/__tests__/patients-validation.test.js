/**
 * Unit tests for src/lib/validations/patients.js
 *
 * Covers the RUT-chileno algorithm and the Zod schemas for createPatient and
 * updatePatient.  No external dependencies are needed — the module only uses Zod.
 */

import { describe, it, expect } from 'vitest'
import {
  createPatientSchema,
  updatePatientSchema,
} from '@/lib/validations/patients.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the parsed data on success, throws on failure (fail-fast in tests). */
function mustParse(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join('; '))
  }
  return result.data
}

/** Returns the first Zod issue on the given path, or undefined. */
function firstIssue(schema, input, path = 'rut') {
  const result = schema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path.includes(path))
}

/** Minimal valid base payload for createPatientSchema. */
const BASE = {
  full_name: 'María González',
}

// ---------------------------------------------------------------------------
// RUT validation
// ---------------------------------------------------------------------------

describe('RUT chileno — normalisation and validation', () => {

  describe('valid RUTs', () => {
    // body=10000013 → DV=K  (verified by the normaliseRut algorithm)
    it('accepts a RUT with K check digit (formatted with dots and hyphen)', () => {
      const result = createPatientSchema.safeParse({ ...BASE, rut: '10.000.013-K' })
      expect(result.success).toBe(true)
    })

    it('accepts a RUT with K check digit (no dots, no hyphen)', () => {
      const result = createPatientSchema.safeParse({ ...BASE, rut: '10000013K' })
      expect(result.success).toBe(true)
    })

    it('accepts a RUT with a numeric check digit (formatted)', () => {
      // 17.798.050-8 has a known-valid check digit of 8
      // Compute: digits reversed = [0,5,0,8,9,7,7,1], factors [2,3,4,5,6,7,2,3]
      //   0*2 + 5*3 + 0*4 + 8*5 + 9*6 + 7*7 + 7*2 + 1*3
      //   = 0 + 15 + 0 + 40 + 54 + 49 + 14 + 3 = 175
      //   11 - (175 % 11) = 11 - 10 = 1   → check digit = 1... let's use a known pair.
      // Using RUT 76.354.771-K (empresa): digits 76354771, reversed [1,7,7,4,5,3,6,7]
      //   1*2+7*3+7*4+4*5+5*6+3*7+6*2+7*3 = 2+21+28+20+30+21+12+21 = 155
      //   11-(155%11)=11-(1)=10 → K.  Already tested above.
      // Let's use 16.016.782-4:
      //   digits 16016782 reversed [2,8,7,6,1,0,6,1]
      //   2*2+8*3+7*4+6*5+1*6+0*7+6*2+1*3 = 4+24+28+30+6+0+12+3 = 107
      //   11-(107%11)=11-(8+...) 107/11=9r8 → 11-8=3.  Not 4.
      // Use 5.126.663-3:
      //   digits 5126663 reversed [3,6,6,2,1,5]  (7-digit)
      //   3*2+6*3+6*4+2*5+1*6+5*7 = 6+18+24+10+6+35=99
      //   11-(99%11)=11-0=11 → 0 (not 3).
      // Use known-valid: 8.685.735-2
      //   digits 8685735 reversed [5,3,7,5,8,6,8]
      //   5*2+3*3+7*4+5*5+8*6+6*7+8*2 = 10+9+28+25+48+42+16=178
      //   11-(178%11)=11-(2)=9.  Not 2.
      // Simplest approach: compute programmatically for a known body.
      // Body=12345678 → reversed [8,7,6,5,4,3,2,1], factors [2,3,4,5,6,7,2,3]
      //   8*2+7*3+6*4+5*5+4*6+3*7+2*2+1*3 = 16+21+24+25+24+21+4+3=138
      //   11-(138%11)=11-(6)=5.  So 12.345.678-5 is valid.
      const result = createPatientSchema.safeParse({ ...BASE, rut: '12.345.678-5' })
      expect(result.success).toBe(true)
    })

    it('accepts a RUT without dots (digits only + hyphen)', () => {
      const result = createPatientSchema.safeParse({ ...BASE, rut: '12345678-5' })
      expect(result.success).toBe(true)
    })

    it('accepts a RUT without dots and without hyphen', () => {
      const result = createPatientSchema.safeParse({ ...BASE, rut: '123456785' })
      expect(result.success).toBe(true)
    })

    it('accepts a lowercase k and normalises to K', () => {
      // body=10000013, DV=K — lowercase input should be accepted
      const result = createPatientSchema.safeParse({ ...BASE, rut: '10.000.013-k' })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid RUTs', () => {
    it('rejects a RUT with an incorrect check digit', () => {
      // 12.345.678-5 is valid; substituting 9 makes it invalid.
      const issue = firstIssue(createPatientSchema, { ...BASE, rut: '12.345.678-9' })
      expect(issue).toBeDefined()
      expect(issue.message).toMatch(/RUT inválido/i)
    })

    it('rejects a RUT with only 6 digits (too short)', () => {
      const issue = firstIssue(createPatientSchema, { ...BASE, rut: '123456-7' })
      expect(issue).toBeDefined()
    })

    it('rejects a RUT that is pure letters', () => {
      const issue = firstIssue(createPatientSchema, { ...BASE, rut: 'ABCDE-X' })
      expect(issue).toBeDefined()
    })

    it('rejects an empty string when passed explicitly (treats as null — no error)', () => {
      // The schema transforms '' → null and null is allowed (field is optional).
      const result = createPatientSchema.safeParse({ ...BASE, rut: '' })
      expect(result.success).toBe(true)
    })
  })

  describe('optional / nullable RUT', () => {
    it('accepts null RUT (field is optional)', () => {
      const result = createPatientSchema.safeParse({ ...BASE, rut: null })
      expect(result.success).toBe(true)
    })

    it('accepts undefined RUT (field is optional)', () => {
      const result = createPatientSchema.safeParse({ ...BASE })
      expect(result.success).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// createPatientSchema — full schema tests
// ---------------------------------------------------------------------------

describe('createPatientSchema', () => {
  it('accepts a fully populated valid payload', () => {
    const data = mustParse(createPatientSchema, {
      full_name:  'Constanza Anjarí',
      rut:        '12.345.678-5',
      birth_date: '1990-06-15',
      gender:     'femenino',
      phone:      '+56982927833',
      email:      'test@example.com',
      address:    'Av. Libertad 1234, Viña del Mar',
      diagnosis:  'Lumbalgia crónica',
      notes:      'Paciente con historial de hernias.',
    })
    expect(data.full_name).toBe('Constanza Anjarí')
    expect(data.email).toBe('test@example.com')
  })

  it('rejects a full_name shorter than 2 characters', () => {
    const issue = firstIssue(createPatientSchema, { full_name: 'A' }, 'full_name')
    expect(issue).toBeDefined()
  })

  it('rejects an invalid email format', () => {
    const issue = firstIssue(createPatientSchema, { ...BASE, email: 'not-an-email' }, 'email')
    expect(issue).toBeDefined()
  })

  it('rejects an invalid gender value', () => {
    const issue = firstIssue(createPatientSchema, { ...BASE, gender: 'unknown' }, 'gender')
    expect(issue).toBeDefined()
  })

  it('accepts all valid gender values', () => {
    for (const gender of ['masculino', 'femenino', 'otro']) {
      const result = createPatientSchema.safeParse({ ...BASE, gender })
      expect(result.success, `gender '${gender}' should be valid`).toBe(true)
    }
  })

  it('rejects a phone shorter than 7 characters', () => {
    const issue = firstIssue(createPatientSchema, { ...BASE, phone: '123' }, 'phone')
    expect(issue).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// updatePatientSchema — partial patch semantics
// ---------------------------------------------------------------------------

describe('updatePatientSchema', () => {
  it('accepts an empty object (all fields are optional in update)', () => {
    const result = updatePatientSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts a partial update with only one field', () => {
    const result = updatePatientSchema.safeParse({ diagnosis: 'New diagnosis' })
    expect(result.success).toBe(true)
  })

  it('still validates RUT when provided in an update', () => {
    const issue = firstIssue(updatePatientSchema, { rut: '12.345.678-9' })
    expect(issue).toBeDefined()
    expect(issue.message).toMatch(/RUT inválido/i)
  })

  it('still validates email format when provided in an update', () => {
    const issue = firstIssue(updatePatientSchema, { email: 'bad-email' }, 'email')
    expect(issue).toBeDefined()
  })
})
