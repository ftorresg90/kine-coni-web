'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora 30 min' },
  { value: 120, label: '2 horas' },
]

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Agendada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'no_show', label: 'No asistio' },
]

const SERVICE_OPTIONS = [
  'Kinesiterapia',
  'Rehabilitacion',
  'Masoterapia',
  'Pilates',
  'Electroterapia',
  'Otro',
]

function toLocalDatetimeValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString()
}

export default function AppointmentModal({ mode, appointment, initialDate, initialPatient, onClose, onSaved }) {
  const isEdit = mode === 'edit'

  // Derive initial datetime strings from props
  const initStartsAt = appointment?.starts_at ?? initialDate ?? new Date().toISOString()
  const initDuration = appointment
    ? Math.round((new Date(appointment.ends_at) - new Date(appointment.starts_at)) / 60000)
    : 60

  const [patientQuery, setPatientQuery] = useState(
    appointment?.patients?.full_name ?? initialPatient?.full_name ?? ''
  )
  const [patientId, setPatientId] = useState(
    appointment?.patient_id ?? initialPatient?.id ?? ''
  )
  const [patientSuggestions, setPatientSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [startsAt, setStartsAt] = useState(toLocalDatetimeValue(initStartsAt))
  const [duration, setDuration] = useState(initDuration)
  const [service, setService] = useState(appointment?.service ?? '')
  const [location, setLocation] = useState(appointment?.location ?? '')
  const [notes, setNotes] = useState(appointment?.notes ?? '')
  const [status, setStatus] = useState(appointment?.status ?? 'scheduled')
  const [saving, setSaving] = useState(false)
  const [overlapWarning, setOverlapWarning] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const overlapTimer = useRef(null)
  const patientTimer = useRef(null)

  // Patient autocomplete search — never call setState synchronously in effect body
  useEffect(() => {
    if (patientQuery.length < 2) return
    clearTimeout(patientTimer.current)
    patientTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/patients?q=${encodeURIComponent(patientQuery)}&pageSize=8`)
        if (!res.ok) return
        const json = await res.json()
        setPatientSuggestions(json.data ?? [])
        setShowSuggestions(true)
      } catch {
        // silent fail
      }
    }, 250)
    return () => clearTimeout(patientTimer.current)
  }, [patientQuery])

  // Overlap check when time changes
  const checkOverlap = useCallback(async (start, dur) => {
    if (!start) return
    clearTimeout(overlapTimer.current)
    overlapTimer.current = setTimeout(async () => {
      try {
        const from = new Date(start).toISOString()
        const to = addMinutes(from, dur)
        const url = `/api/admin/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=scheduled,confirmed`
        const res = await fetch(url)
        if (!res.ok) return
        const json = await res.json()
        const others = (json.data ?? []).filter((a) => a.id !== appointment?.id)
        setOverlapWarning(others.length > 0)
      } catch {
        // silent fail
      }
    }, 400)
  }, [appointment?.id])

  useEffect(() => {
    if (startsAt) checkOverlap(startsAt, duration)
    return () => clearTimeout(overlapTimer.current)
  }, [startsAt, duration, checkOverlap])

  const handleSelectPatient = (p) => {
    setPatientId(p.id)
    setPatientQuery(p.full_name)
    setShowSuggestions(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patientId) {
      window.alert('Debes seleccionar un paciente de la lista.')
      return
    }
    if (!startsAt) {
      window.alert('Debes indicar la fecha y hora de inicio.')
      return
    }
    if (!service) {
      window.alert('Debes seleccionar un servicio.')
      return
    }
    setSaving(true)
    try {
      const from = new Date(startsAt).toISOString()
      const to = addMinutes(from, Number(duration))
      const body = {
        patient_id: patientId,
        starts_at: from,
        ends_at: to,
        service: service,             // required — guarded above
        location: location || null,
        notes: notes || null,
        ...(isEdit ? { status } : {}),
      }
      const url = isEdit ? `/api/admin/appointments/${appointment.id}` : '/api/admin/appointments'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        window.alert(err.error ?? 'Error al guardar la cita.')
        setSaving(false)
        return
      }
      const json = await res.json()
      onSaved?.(json.data)
    } catch {
      window.alert('Error de red al guardar la cita.')
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/appointments/${appointment.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        window.alert(err.error ?? 'Error al cancelar la cita.')
        setCancelling(false)
        setCancelConfirm(false)
        return
      }
      onSaved?.()
    } catch {
      window.alert('Error de red al cancelar la cita.')
      setCancelling(false)
      setCancelConfirm(false)
    }
  }

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Editar cita' : 'Nueva cita'}
    >
      <div className="modal-content bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-nude-dark">
          <h2 className="font-serif text-xl text-vino">
            {isEdit ? 'Editar cita' : 'Nueva cita'}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Patient autocomplete */}
          <div className="relative">
            <label className="block font-sans text-sm font-bold text-vino mb-1.5">
              Paciente <span className="text-rosado">*</span>
            </label>
            <input
              type="text"
              value={patientQuery}
              onChange={(e) => {
                setPatientQuery(e.target.value)
                if (patientId) setPatientId('')
              }}
              placeholder="Buscar por nombre o RUT..."
              autoComplete="off"
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
            />
            {showSuggestions && patientQuery.length >= 2 && patientSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-rosado/20 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {patientSuggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className="w-full text-left px-4 py-2.5 font-sans text-sm text-vino hover:bg-nude transition-colors"
                    >
                      <span className="font-semibold">{p.full_name}</span>
                      {p.rut && <span className="text-vino/50 ml-2">{p.rut}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {patientQuery.length >= 2 && !patientId && patientSuggestions.length === 0 && (
              <p className="mt-1 font-sans text-xs text-rosado-dark">
                No se encontraron pacientes. Agrega uno desde la seccion Pacientes.
              </p>
            )}
          </div>

          {/* Date and time */}
          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-1.5">
              Fecha y hora de inicio <span className="text-rosado">*</span>
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-1.5">Duracion</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Overlap warning */}
          {overlapWarning && (
            <div className="flex items-start gap-2 bg-rosado/10 border border-rosado/30 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-rosado-dark flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-sans text-xs text-rosado-dark font-semibold">
                Advertencia: existe una cita activa en este horario. Podria haber solapamiento.
              </p>
            </div>
          )}

          {/* Service */}
          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-1.5">Servicio</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
            >
              <option value="">Seleccionar servicio...</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-1.5">Direccion</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Vina del Mar, 5 Norte 123"
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-1.5">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Indicaciones, observaciones..."
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino resize-none"
            />
          </div>

          {/* Status (edit only) */}
          {isEdit && (
            <div>
              <label className="block font-sans text-sm font-bold text-vino mb-1.5">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cita'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-white border border-rosado/30 text-vino font-sans font-bold text-sm hover:bg-nude transition-colors"
              >
                Cancelar
              </button>
            </div>

            {/* Cancel appointment (edit only) */}
            {isEdit && appointment?.status !== 'cancelled' && (
              <div>
                {!cancelConfirm ? (
                  <button
                    type="button"
                    onClick={() => setCancelConfirm(true)}
                    className="w-full px-6 py-2.5 rounded-full border border-rosado-dark/40 text-rosado-dark font-sans font-bold text-sm hover:bg-rosado/5 transition-colors"
                  >
                    Cancelar cita
                  </button>
                ) : (
                  <div className="bg-nude rounded-xl p-4 space-y-3">
                    <p className="font-sans text-sm text-vino font-semibold text-center">
                      Confirmar cancelacion de la cita
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="flex-1 px-4 py-2 rounded-full bg-rosado-dark text-nude font-sans font-bold text-sm hover:bg-vino transition-colors disabled:opacity-50"
                      >
                        {cancelling ? 'Cancelando...' : 'Si, cancelar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelConfirm(false)}
                        className="flex-1 px-4 py-2 rounded-full bg-white border border-rosado/30 text-vino font-sans font-bold text-sm hover:bg-nude transition-colors"
                      >
                        No volver
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
