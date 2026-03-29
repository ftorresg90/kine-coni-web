'use client'

import { useMemo } from 'react'
import AppointmentCard from './AppointmentCard'

// Calendar range: 08:00 – 20:00 in 30-minute slots
const HOUR_START = 8
const HOUR_END = 20
const SLOT_MINUTES = 30
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES // 24
const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// Build array of hour labels for the left column
function buildHourLabels() {
  const labels = []
  for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
    const totalMinutes = HOUR_START * 60 + slot * SLOT_MINUTES
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    labels.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return labels
}

const HOUR_LABELS = buildHourLabels()

// Convert a Date to grid row index (1-based, CSS grid-row-start)
function timeToRowIndex(date) {
  const h = date.getHours()
  const m = date.getMinutes()
  const totalMinutes = h * 60 + m - HOUR_START * 60
  return Math.max(1, Math.floor(totalMinutes / SLOT_MINUTES) + 1)
}

// Build the 7 days of the week starting from weekStart
function buildWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

// Is the given date the same calendar day as today?
function isToday(date) {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

// Group appointments by day index (0=Mon..6=Sun) within the week
function groupByDay(appointments, weekDays) {
  const map = {}
  weekDays.forEach((_, i) => { map[i] = [] })
  appointments.forEach((appt) => {
    const start = new Date(appt.starts_at)
    weekDays.forEach((day, i) => {
      if (
        start.getFullYear() === day.getFullYear() &&
        start.getMonth() === day.getMonth() &&
        start.getDate() === day.getDate()
      ) {
        map[i].push(appt)
      }
    })
  })
  return map
}

export default function WeekCalendar({ weekStart, appointments, onCellClick, onAppointmentClick, isMobile }) {
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart])
  const byDay = useMemo(() => groupByDay(appointments, weekDays), [appointments, weekDays])

  // On mobile we only show today (or Monday if today is outside the week)
  const visibleDays = useMemo(() => {
    if (!isMobile) return weekDays.map((d, i) => ({ day: d, index: i }))
    const todayIdx = weekDays.findIndex(isToday)
    const idx = todayIdx >= 0 ? todayIdx : 0
    return [{ day: weekDays[idx], index: idx }]
  }, [weekDays, isMobile])

  const colCount = visibleDays.length

  // Build grid template: 1 time column + N day columns
  const gridTemplateColumns = `56px repeat(${colCount}, minmax(0, 1fr))`

  return (
    <div className="overflow-x-auto" role="grid" aria-label="Calendario semanal">
      {/* Day header row */}
      <div
        style={{ display: 'grid', gridTemplateColumns, position: 'sticky', top: 0, zIndex: 10 }}
        className="bg-white/90 border-b border-nude-dark"
      >
        {/* Empty corner above time labels */}
        <div className="h-12" />
        {visibleDays.map(({ day, index }) => {
          const today = isToday(day)
          return (
            <div
              key={index}
              className={`h-12 flex flex-col items-center justify-center border-l border-nude-dark ${today ? 'bg-rosado/10' : ''}`}
              aria-label={`${DAY_LABELS[index]} ${day.getDate()} de ${MONTH_NAMES[day.getMonth()]}`}
            >
              <span className={`font-sans text-xs font-semibold uppercase tracking-wide ${today ? 'text-rosado-dark' : 'text-vino/50'}`}>
                {DAY_LABELS[index]}
              </span>
              <span className={`font-serif font-bold text-base leading-none ${today ? 'text-vino' : 'text-vino/70'}`}>
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Grid body */}
      <div style={{ display: 'grid', gridTemplateColumns, position: 'relative' }}>
        {/* Time labels column */}
        <div style={{ display: 'grid', gridTemplateRows: `repeat(${TOTAL_SLOTS}, 40px)` }}>
          {HOUR_LABELS.map((label, slotIdx) => (
            <div
              key={slotIdx}
              className="flex items-start justify-end pr-2 pt-1"
              style={{ height: '40px' }}
              aria-hidden="true"
            >
              {label.endsWith(':00') ? (
                <span className="font-sans text-xs text-vino/40 font-semibold">{label}</span>
              ) : (
                <span className="font-sans text-xs text-vino/20">—</span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {visibleDays.map(({ day, index }) => {
          const todayCol = isToday(day)
          const dayAppointments = byDay[index] ?? []
          return (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${TOTAL_SLOTS}, 40px)`,
                position: 'relative',
                borderLeft: '1px solid #EDD5D9',
              }}
              className={todayCol ? 'bg-rosado/5' : ''}
              aria-label={`Columna ${DAY_LABELS[index]} ${day.getDate()}`}
            >
              {/* Slot cells (clickable empty cells) */}
              {Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => {
                const totalMinutes = HOUR_START * 60 + slotIdx * SLOT_MINUTES
                const h = Math.floor(totalMinutes / 60)
                const m = totalMinutes % 60
                const cellDate = new Date(day)
                cellDate.setHours(h, m, 0, 0)
                return (
                  <div
                    key={slotIdx}
                    style={{
                      gridRow: `${slotIdx + 1} / ${slotIdx + 2}`,
                      borderBottom: slotIdx % 2 === 1 ? '1px solid #EDD5D9' : '1px dashed #EDD5D950',
                      cursor: 'pointer',
                    }}
                    onClick={() => onCellClick?.(cellDate.toISOString())}
                    role="button"
                    tabIndex={0}
                    aria-label={`Crear cita el ${day.getDate()} a las ${HOUR_LABELS[slotIdx]}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick?.(cellDate.toISOString()) }}
                  />
                )
              })}

              {/* Appointment overlays — positioned absolutely within the column */}
              {dayAppointments.map((appt) => {
                const start = new Date(appt.starts_at)
                const end = new Date(appt.ends_at)
                const rowStart = timeToRowIndex(start)
                const rowEnd = Math.min(timeToRowIndex(end), TOTAL_SLOTS + 1)
                const clampedEnd = rowEnd <= rowStart ? rowStart + 1 : rowEnd
                return (
                  <div
                    key={appt.id}
                    style={{
                      position: 'absolute',
                      top: `${(rowStart - 1) * 40 + 2}px`,
                      height: `${(clampedEnd - rowStart) * 40 - 4}px`,
                      left: '2px',
                      right: '2px',
                      zIndex: 5,
                    }}
                  >
                    <AppointmentCard
                      appointment={appt}
                      onClick={() => onAppointmentClick?.(appt)}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
