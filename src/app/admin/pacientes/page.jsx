'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import PatientDrawer from '@/components/admin/PatientDrawer'

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function formatRelativeDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `Hace ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
  }
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Manana'
  if (diffDays < 7) return `En ${diffDays} dias`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

const GENDER_LABELS = { masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro' }

const PATIENT_FIELDS = [
  { name: 'full_name', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej: Maria Gonzalez' },
  { name: 'rut', label: 'RUT', type: 'text', required: false, placeholder: 'Ej: 12345678-9' },
  { name: 'phone', label: 'Telefono', type: 'tel', required: false, placeholder: 'Ej: +56912345678' },
  { name: 'email', label: 'Email', type: 'email', required: false, placeholder: 'Ej: paciente@email.com' },
  { name: 'birth_date', label: 'Fecha de nacimiento', type: 'date', required: false },
  { name: 'diagnosis', label: 'Diagnostico', type: 'text', required: false, placeholder: 'Ej: Lumbalgia cronica' },
]

function normaliseRut(raw) {
  const cleaned = raw.replace(/\./g, '').replace(/\s/g, '').toUpperCase()
  if (!/^\d{7,8}-?[\dK]$/.test(cleaned)) return null
  const [body, dv] = cleaned.includes('-') ? cleaned.split('-') : [cleaned.slice(0, -1), cleaned.slice(-1)]
  const sum = body.split('').reverse().reduce((acc, d, i) => acc + parseInt(d, 10) * [2, 3, 4, 5, 6, 7, 2, 3][i], 0)
  const remainder = 11 - (sum % 11)
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)
  if (dv !== expected) return null
  return `${body}-${dv}`
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone) {
  return /^\+?[0-9\s-]{7,20}$/.test(phone)
}

function PatientFormModal({ mode = 'create', initialData, onClose, onSaved, onError }) {
  const [form, setForm] = useState(initialData ?? { full_name: '', rut: '', phone: '', email: '', birth_date: '', gender: '', diagnosis: '' })
  const [saving, setSaving] = useState(false)

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.rut && !normaliseRut(form.rut)) {
      onError?.('El RUT ingresado no es válido.')
      return
    }
    if (form.email && !validateEmail(form.email)) {
      onError?.('El email ingresado no es válido.')
      return
    }
    if (form.phone && !validatePhone(form.phone)) {
      onError?.('El teléfono ingresado no es válido.')
      return
    }

    setSaving(true)
    try {
      const body = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== null)
      )
      
      const isEdit = mode === 'edit'
      const res = await fetch(isEdit ? `/api/admin/patients/${initialData.id}` : '/api/admin/patients', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        onError?.(err.error ?? `Error al ${isEdit ? 'actualizar' : 'crear'} el paciente.`)
        setSaving(false)
        return
      }
      const json = await res.json()
      onSaved?.(json.data)
    } catch {
      onError?.(`Error de red al ${mode === 'edit' ? 'actualizar' : 'crear'} el paciente.`)
      setSaving(false)
    }
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Nuevo paciente' : 'Editar paciente'}
    >
      <div className="modal-content bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-nude-dark">
          <h2 className="font-serif text-xl text-vino">
            {mode === 'create' ? 'Nuevo paciente' : 'Editar paciente'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 rounded-lg text-vino/40 hover:text-vino hover:bg-nude transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {PATIENT_FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block font-sans text-sm font-bold text-vino mb-1.5">
                {f.label}
                {f.required && <span className="text-rosado ml-1">*</span>}
              </label>
              <input
                type={f.type}
                value={form[f.name] || ''}
                onChange={(e) => handleChange(f.name, e.target.value)}
                required={f.required}
                placeholder={f.placeholder ?? ''}
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
              />
            </div>
          ))}

          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-1.5">Genero</label>
            <select
              value={form.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
            >
              <option value="">Seleccionar...</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : (mode === 'create' ? 'Crear paciente' : 'Guardar cambios')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-white border border-rosado/30 text-vino font-sans font-bold text-sm hover:bg-nude transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PacientesPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [formModal, setFormModal] = useState(null) // { mode, initialData? }
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadPatients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/patients?pageSize=500')
      if (!res.ok) throw new Error('Error al cargar los pacientes.')
      const json = await res.json()
      setPatients(json.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPatients()
  }, [loadPatients])

  // Client-side filter
  const filtered = useMemo(() => {
    if (!query.trim()) return patients
    const q = query.toLowerCase()
    return patients.filter((p) =>
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.rut ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.diagnosis ?? '').toLowerCase().includes(q)
    )
  }, [patients, query])

  const handlePatientSaved = (patient) => {
    const isEdit = formModal?.mode === 'edit'
    setFormModal(null)
    showToast(isEdit ? 'Paciente actualizado con éxito.' : 'Paciente creado con éxito.')
    loadPatients()
    if (patient && !isEdit) setSelectedPatient(patient)
    if (patient && isEdit && selectedPatient?.id === patient.id) {
      setSelectedPatient(patient)
    }
  }

  const handleEditPatient = (patient) => {
    setFormModal({ mode: 'edit', initialData: patient })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" aria-label="Cargando pacientes" />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-vino mb-1">Pacientes</h1>
          <p className="font-sans text-vino/60 text-sm">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} registrado{patients.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          onClick={() => setFormModal({ mode: 'create' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo paciente
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-vino/40 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, RUT, telefono, diagnostico..."
          aria-label="Buscar pacientes"
          className="form-input w-full bg-white/70 border border-rosado/20 rounded-2xl pl-10 pr-4 py-3 font-sans text-sm text-vino"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Limpiar busqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-vino/40 hover:text-vino transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rosado/10 border border-rosado/30 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <p className="font-sans text-sm text-rosado-dark">{error}</p>
          <button
            onClick={loadPatients}
            className="font-sans text-xs font-bold text-vino underline hover:no-underline ml-4"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Results count */}
      {query && (
        <p className="font-sans text-xs text-vino/50 mb-3" aria-live="polite">
          {`${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} para "${query}"`}
        </p>
      )}

      {/* Patient list */}
      {filtered.length === 0 && !loading && (
        <div className="text-center py-20">
          <svg className="w-12 h-12 text-rosado/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="font-sans text-vino/50 text-sm">
            {query ? 'No se encontraron pacientes con ese criterio.' : 'Aun no hay pacientes registrados.'}
          </p>
          {!query && (
            <button
              onClick={() => setFormModal({ mode: 'create' })}
              className="mt-4 px-5 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors"
            >
              Agregar primer paciente
            </button>
          )}
        </div>
      )}

      <div className="space-y-2" role="list" aria-label="Lista de pacientes">
        {filtered.map((patient) => {
          const initials = getInitials(patient.full_name)
          const nextAppt = patient.next_appointment_at
            ? formatRelativeDate(patient.next_appointment_at)
            : null

          return (
            <div
              key={patient.id}
              className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm px-5 py-4 flex items-center gap-4"
              role="listitem"
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#C9848F' }}
                aria-hidden="true"
              >
                <span className="font-sans font-bold text-sm text-white">{initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-sans font-bold text-sm text-vino truncate">{patient.full_name}</p>
                  {patient.gender && (
                    <span className="font-sans text-xs text-vino/40 flex-shrink-0">
                      {GENDER_LABELS[patient.gender] ?? patient.gender}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-0.5">
                  {patient.diagnosis && (
                    <span className="font-sans text-xs text-vino/60 truncate max-w-xs">{patient.diagnosis}</span>
                  )}
                  {patient.phone && (
                    <span className="font-sans text-xs text-vino/40 flex-shrink-0">{patient.phone}</span>
                  )}
                  {nextAppt && (
                    <span
                      className="font-sans text-xs flex-shrink-0"
                      style={{ color: '#7A3D48', fontWeight: 600 }}
                    >
                      Proxima: {nextAppt}
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => setSelectedPatient(patient)}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-nude text-vino font-sans text-xs font-bold hover:bg-nude-dark transition-colors"
                aria-label={`Ver historial de ${patient.full_name}`}
              >
                Historial
              </button>
            </div>
          )
        })}
      </div>

      {/* Patient drawer */}
      {selectedPatient && (
        <PatientDrawer
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onRefresh={loadPatients}
          onEdit={() => handleEditPatient(selectedPatient)}
          onDeactivated={() => {
            showToast('Paciente desactivado con éxito.')
            setSelectedPatient(null)
            loadPatients()
          }}
        />
      )}

      {/* Patient form modal */}
      {formModal && (
        <PatientFormModal
          mode={formModal.mode}
          initialData={formModal.initialData}
          onClose={() => setFormModal(null)}
          onSaved={handlePatientSaved}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`toast fixed bottom-6 right-6 px-6 py-3 rounded-full shadow-lg font-sans text-sm font-bold z-50 ${
            toast.type === 'error' ? 'bg-rosado text-vino' : 'bg-vino text-nude'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
