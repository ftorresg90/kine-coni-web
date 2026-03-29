'use client'

// Status style map — applied via inline style + className combinations
// to stay within the existing Tailwind token vocabulary.
const STATUS_STYLES = {
  confirmed: {
    bg: '#5D2A33',
    text: '#F5E6E8',
    border: '4px solid #A96370',
    borderStyle: 'solid',
    borderLeft: true,
  },
  scheduled: {
    bg: '#F5E6E8',
    text: '#5D2A33',
    border: '2px dashed #C9848F',
    borderStyle: 'dashed',
  },
  cancelled: {
    bg: '#EDD5D9',
    text: '#A96370',
    opacity: 0.55,
    lineThrough: true,
    pointerEvents: 'none',
  },
  completed: {
    bg: '#EDD5D9',
    text: '#7A3D48',
    opacity: 0.75,
    pointerEvents: 'none',
  },
  no_show: {
    bg: '#EDD5D9',
    text: '#7A3D48',
    border: '4px solid #C9848F',
    borderLeft: true,
    opacity: 0.75,
  },
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function AppointmentCard({ appointment, onClick }) {
  const { status, starts_at, ends_at, service, patients } = appointment
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.scheduled

  const containerStyle = {
    backgroundColor: style.bg,
    color: style.text,
    opacity: style.opacity ?? 1,
    pointerEvents: style.pointerEvents ?? 'auto',
    cursor: style.pointerEvents === 'none' ? 'default' : 'pointer',
    borderRadius: '6px',
    padding: '4px 6px',
    overflow: 'hidden',
    height: '100%',
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative',
  }

  // Apply border appropriately
  if (style.borderLeft) {
    containerStyle.borderLeft = style.border
    containerStyle.borderTop = 'none'
    containerStyle.borderRight = 'none'
    containerStyle.borderBottom = 'none'
  } else if (style.border) {
    containerStyle.border = style.border
  }

  const patientName = patients?.full_name ?? 'Paciente'
  const startTime = formatTime(starts_at)
  const endTime = formatTime(ends_at)

  return (
    <div
      style={containerStyle}
      onClick={style.pointerEvents !== 'none' ? onClick : undefined}
      title={`${patientName} — ${service ?? ''} (${startTime}–${endTime})`}
      role={style.pointerEvents !== 'none' ? 'button' : undefined}
      tabIndex={style.pointerEvents !== 'none' ? 0 : undefined}
      onKeyDown={style.pointerEvents !== 'none' ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}
      aria-label={`Cita de ${patientName} a las ${startTime}`}
    >
      <p
        className="font-sans font-bold leading-tight"
        style={{
          fontSize: '10px',
          textDecoration: style.lineThrough ? 'line-through' : 'none',
          color: style.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {startTime}
      </p>
      <p
        className="font-sans leading-tight"
        style={{
          fontSize: '11px',
          textDecoration: style.lineThrough ? 'line-through' : 'none',
          color: style.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: 600,
        }}
      >
        {patientName}
      </p>
      {service && (
        <p
          className="font-sans leading-tight"
          style={{
            fontSize: '10px',
            color: style.text,
            opacity: 0.75,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {service}
        </p>
      )}
    </div>
  )
}
