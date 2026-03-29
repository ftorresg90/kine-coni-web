'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import WeekCalendar from '@/components/admin/WeekCalendar'
import AppointmentModal from '@/components/admin/AppointmentModal'

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  // 0=Sunday → go back 6 days, otherwise go back (day-1) days
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatWeekLabel(monday) {
  const sunday = addDays(monday, 6)
  const fromDay = monday.getDate()
  const toDay = sunday.getDate()
  const fromMonth = MONTH_NAMES[monday.getMonth()]
  const toMonth = MONTH_NAMES[sunday.getMonth()]
  const year = sunday.getFullYear()
  if (monday.getMonth() === sunday.getMonth()) {
    return `${fromDay}–${toDay} de ${fromMonth} ${year}`
  }
  return `${fromDay} de ${fromMonth} – ${toDay} de ${toMonth} ${year}`
}

function AgendaPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Determine current week start from URL param or today
  let parsedDate
  if (weekStartParam) {
    const [y, m, d] = weekStartParam.split('-').map(Number)
    parsedDate = new Date(y, m - 1, d)
  } else {
    parsedDate = new Date()
  }
  const weekStart = getMonday(parsedDate)

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // { mode: 'create' | 'edit', appointment?, initialDate? }
  const [toast, setToast] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const weekStartISO = weekStart.toISOString()

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = weekStartISO
      const to = addDays(new Date(weekStartISO), 7).toISOString()
      const url = `/api/admin/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=200`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar las citas.')
      const json = await res.json()
      setAppointments(json.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [weekStartISO])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  // Navigation helpers
  const navigate = (direction) => {
    const newMonday = addDays(weekStart, direction * 7)
    const y = newMonday.getFullYear()
    const m = String(newMonday.getMonth() + 1).padStart(2, '0')
    const d = String(newMonday.getDate()).padStart(2, '0')
    router.push(`/admin/agenda?semana=${y}-${m}-${d}`)
  }

  const goToToday = () => {
    router.push('/admin/agenda')
  }

  const handleCellClick = (isoDate) => {
    setModal({ mode: 'create', initialDate: isoDate })
  }

  const handleAppointmentClick = (appt) => {
    setModal({ mode: 'edit', appointment: appt })
  }

  const handleSaved = useCallback((savedMode) => {
    setModal(null)
    showToast(savedMode === 'create' ? 'Cita creada con exito.' : 'Cita actualizada con exito.')
    loadAppointments()
  }, [loadAppointments])

  const isCurrentWeek = getMonday(new Date()).toISOString() === weekStart.toISOString()

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-vino mb-1">Agenda</h1>
          <p className="font-sans text-vino/60 text-sm">Visualiza y gestiona las citas de la semana.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nueva cita
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between gap-3 mb-4 bg-white/70 rounded-2xl border border-rosado/15 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Semana anterior"
          className="p-2 rounded-xl text-vino hover:bg-nude transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <span className="font-sans font-semibold text-vino text-sm sm:text-base text-center">
            {formatWeekLabel(weekStart)}
          </span>
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="px-3 py-1 rounded-full border border-rosado/30 text-rosado-dark font-sans text-xs font-bold hover:bg-rosado/5 transition-colors"
            >
              Hoy
            </button>
          )}
        </div>

        <button
          onClick={() => navigate(1)}
          aria-label="Semana siguiente"
          className="p-2 rounded-xl text-vino hover:bg-nude transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 mb-4 px-1" aria-label="Leyenda de estados">
        {[
          { label: 'Confirmada', bg: '#5D2A33', text: '#F5E6E8' },
          { label: 'Agendada', bg: '#F5E6E8', text: '#5D2A33', border: '1.5px dashed #C9848F' },
          { label: 'Completada', bg: '#EDD5D9', text: '#7A3D48' },
          { label: 'Cancelada', bg: '#EDD5D9', text: '#A96370' },
          { label: 'No asistio', bg: '#EDD5D9', text: '#7A3D48', borderLeft: '3px solid #C9848F' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-1.5"
            aria-label={s.label}
          >
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: s.bg,
                border: s.border ?? 'none',
                borderLeft: s.borderLeft ?? (s.border ? undefined : 'none'),
              }}
              aria-hidden="true"
            />
            <span className="font-sans text-xs text-vino/60">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar container */}
      <div className="flex-1 bg-white/70 rounded-2xl border border-rosado/15 shadow-sm overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20" aria-live="polite" aria-label="Cargando citas">
            <div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="font-sans text-sm text-rosado-dark">{error}</p>
            <button
              onClick={loadAppointments}
              className="px-5 py-2 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {!error && (
          <WeekCalendar
            weekStart={weekStart}
            appointments={appointments}
            onCellClick={handleCellClick}
            onAppointmentClick={handleAppointmentClick}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Appointment modal */}
      {modal && (
        <AppointmentModal
          mode={modal.mode}
          appointment={modal.appointment}
          initialDate={modal.initialDate}
          onClose={() => setModal(null)}
          onSaved={() => handleSaved(modal.mode)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className="toast fixed bottom-6 right-6 bg-vino text-nude px-6 py-3 rounded-full shadow-lg font-sans text-sm font-bold z-50"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" />
      </div>
    }>
      <AgendaPageInner />
    </Suspense>
  )
}
