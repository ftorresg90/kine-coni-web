'use client'

import { useState, useEffect, useCallback } from 'react'
import AppointmentModal from './AppointmentModal'

const STATUS_LABELS = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistio',
}

const STATUS_COLORS = {
  scheduled: { bg: '#F5E6E8', text: '#5D2A33', border: '#C9848F' },
  confirmed: { bg: '#5D2A33', text: '#F5E6E8', border: '#5D2A33' },
  completed: { bg: '#EDD5D9', text: '#7A3D48', border: '#EDD5D9' },
  cancelled: { bg: '#EDD5D9', text: '#A96370', border: '#A96370' },
  no_show:   { bg: '#EDD5D9', text: '#7A3D48', border: '#C9848F' },
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS.scheduled
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'inherit',
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default function PatientDrawer({ patient, onClose, onRefresh, onEdit, onDeactivated }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deactivating, setDeactivating] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  const loadPatient = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/patients/${patient.id}`)
      if (!res.ok) throw new Error('Error al cargar los datos del paciente.')
      const json = await res.json()
      // GET /api/admin/patients/[id] returns the patient object directly via ok(),
      // not wrapped in { data }. The { data } envelope is only used by paginated().
      setDetail(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [patient.id])

  useEffect(() => {
    loadPatient()
  }, [loadPatient])

  const now = new Date()
  const upcoming = (detail?.appointments ?? []).filter(
    (a) => new Date(a.starts_at) >= now && a.status !== 'cancelled'
  )
  const past = (detail?.appointments ?? []).filter(
    (a) => new Date(a.starts_at) < now || a.status === 'cancelled'
  )

  const handleAppointmentSaved = () => {
    setShowAppointmentModal(false)
    loadPatient()
    onRefresh?.()
  }

  const handleDeactivate = async () => {
    if (!window.confirm(`¿Estás seguro de que quieres desactivar a ${patient.full_name}? Podrás ver su historial en la base de datos, pero dejará de aparecer en la lista activa.`)) {
      return
    }
    setDeactivating(true)
    try {
      const res = await fetch(`/api/admin/patients/${patient.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al desactivar el paciente.')
      onDeactivated?.()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setDeactivating(false)
    }
  }

  // Initials from full_name
  const initials = patient.full_name
    ? patient.full_name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : '?'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl flex flex-col"
        style={{ width: '100%', maxWidth: '480px' }}
        role="complementary"
        aria-label={`Historial de ${patient.full_name}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nude-dark flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#C9848F' }}
              aria-hidden="true"
            >
              <span className="font-sans font-bold text-sm text-white">{initials}</span>
            </div>
            <div>
              <h2 className="font-serif text-lg text-vino leading-tight">{patient.full_name}</h2>
              {patient.diagnosis && (
                <p className="font-sans text-xs text-vino/50 mt-0.5 leading-tight">{patient.diagnosis}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit?.()}
              aria-label="Editar paciente"
              className="p-2 rounded-lg text-vino/60 hover:text-vino hover:bg-nude transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDeactivate}
              disabled={deactivating}
              aria-label="Desactivar paciente"
              className="p-2 rounded-lg text-rosado-dark/60 hover:text-rosado-dark hover:bg-rosado/10 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar historial"
              className="p-2 rounded-lg text-vino/40 hover:text-vino hover:bg-nude transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient info */}
          <div className="bg-nude/50 rounded-2xl p-4 space-y-2">
            {[
              { label: 'RUT', value: patient.rut },
              { label: 'Telefono', value: patient.phone },
              { label: 'Email', value: patient.email },
              { label: 'Genero', value: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : patient.gender },
              {
                label: 'Fecha de nacimiento',
                value: patient.birth_date
                  ? new Date(patient.birth_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
                  : null,
              },
            ]
              .filter((r) => r.value)
              .map((row) => (
                <div key={row.label} className="flex items-start gap-2">
                  <span className="font-sans text-xs font-bold text-vino/50 w-36 flex-shrink-0 pt-0.5">{row.label}</span>
                  <span className="font-sans text-sm text-vino">{row.value}</span>
                </div>
              ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" aria-label="Cargando historial" />
            </div>
          )}

          {error && !loading && (
            <div className="bg-rosado/10 border border-rosado/30 rounded-xl px-4 py-3">
              <p className="font-sans text-sm text-rosado-dark">{error}</p>
              <button
                onClick={loadPatient}
                className="mt-2 font-sans text-xs font-bold text-vino underline hover:no-underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Upcoming appointments */}
              <section aria-label="Proximas citas">
                <h3 className="font-sans text-xs font-bold text-vino/50 uppercase tracking-widest mb-3">
                  Proximas — {upcoming.length}
                </h3>
                {upcoming.length === 0 ? (
                  <p className="font-sans text-sm text-vino/40">Sin citas proximas.</p>
                ) : (
                  <ol className="space-y-2">
                    {upcoming.map((appt) => (
                      <AppointmentTimelineItem key={appt.id} appt={appt} />
                    ))}
                  </ol>
                )}
              </section>

              {/* Past appointments */}
              {past.length > 0 && (
                <section aria-label="Citas pasadas">
                  <h3 className="font-sans text-xs font-bold text-vino/50 uppercase tracking-widest mb-3">
                    Pasadas — {past.length}
                  </h3>
                  <ol className="space-y-2">
                    {past.map((appt) => (
                      <AppointmentTimelineItem key={appt.id} appt={appt} />
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-nude-dark">
          <button
            onClick={() => setShowAppointmentModal(true)}
            className="w-full px-6 py-3 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors"
          >
            Nueva cita para {patient.full_name.split(' ')[0]}
          </button>
        </div>
      </aside>

      {showAppointmentModal && (
        <AppointmentModal
          mode="create"
          initialPatient={{ id: patient.id, full_name: patient.full_name }}
          onClose={() => setShowAppointmentModal(false)}
          onSaved={handleAppointmentSaved}
        />
      )}
    </>
  )
}

function AppointmentTimelineItem({ appt }) {
  return (
    <li className="flex items-start gap-3">
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0 mt-1"
        style={{ minHeight: '40px', backgroundColor: appt.status === 'confirmed' ? '#5D2A33' : '#C9848F' }}
        aria-hidden="true"
      />
      <div className="flex-1 bg-nude/50 rounded-xl p-3 space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-sans text-sm font-semibold text-vino">{formatDate(appt.starts_at)}</span>
          <StatusBadge status={appt.status} />
        </div>
        <p className="font-sans text-xs text-vino/60">
          {formatTime(appt.starts_at)}–{formatTime(appt.ends_at)}
          {appt.service ? ` · ${appt.service}` : ''}
          {appt.location ? ` · ${appt.location}` : ''}
        </p>
        {appt.notes && (
          <p className="font-sans text-xs text-vino/50 italic">{appt.notes}</p>
        )}
      </div>
    </li>
  )
}
