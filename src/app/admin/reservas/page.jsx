'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmModal from '@/components/ConfirmModal'

const statusColors = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  contactado: 'bg-blue-50 text-blue-700 border-blue-200',
  completado: 'bg-green-50 text-green-700 border-green-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
}

const statusLabels = {
  pendiente: '⏳ Pendiente',
  contactado: '📞 Contactado',
  completado: '✅ Completado',
  cancelado: '❌ Cancelado',
}

export default function ReservasPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const supabase = createClient()

  const loadBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  useEffect(() => { loadBookings() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) { showToast('Error al actualizar estado'); return }
    showToast(`Estado actualizado a: ${statusLabels[status]}`)
    loadBookings()
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('bookings').delete().eq('id', deleteId)
    if (error) { showToast('Error al eliminar'); setDeleteId(null); return }
    showToast('Reserva eliminada ✓')
    setDeleteId(null)
    loadBookings()
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-vino mb-2">Solicitudes de Reserva</h1>
        <p className="font-sans text-vino/60 text-sm">
          {bookings.filter(b => b.status === 'pendiente').length} solicitudes pendientes de {bookings.length} totales.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pendiente', 'contactado', 'completado', 'cancelado'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full font-sans text-xs font-bold transition-colors ${filter === f ? 'bg-vino text-nude' : 'bg-white/70 text-vino/60 border border-rosado/20 hover:bg-nude'}`}>
            {f === 'all' ? `Todas (${bookings.length})` : `${statusLabels[f]} (${bookings.filter(b => b.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3">
        {filtered.map((booking) => (
          <div key={booking.id} className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-sans font-bold text-vino">{booking.name}</p>
                <p className="font-sans text-xs text-vino/50">
                  {new Date(booking.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-sans font-bold border ${statusColors[booking.status]}`}>
                {statusLabels[booking.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm font-sans mb-3">
              <div>
                <p className="text-vino/50 text-xs">Teléfono</p>
                <a href={`tel:${booking.phone}`} className="text-vino font-bold hover:text-rosado">{booking.phone}</a>
              </div>
              <div>
                <p className="text-vino/50 text-xs">Servicio</p>
                <p className="text-vino">{booking.service}</p>
              </div>
              <div>
                <p className="text-vino/50 text-xs">Fecha preferida</p>
                <p className="text-vino">{booking.preferred_date ? new Date(booking.preferred_date + 'T12:00:00').toLocaleDateString('es-CL') : '—'}</p>
              </div>
              <div>
                <p className="text-vino/50 text-xs">Horario</p>
                <p className="text-vino">{booking.preferred_time || 'Sin preferencia'}</p>
              </div>
            </div>

            {booking.message && (
              <p className="font-sans text-sm text-vino/60 italic mb-3 bg-nude/50 rounded-xl p-3">
                &ldquo;{booking.message}&rdquo;
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {['pendiente', 'contactado', 'completado', 'cancelado'].filter(s => s !== booking.status).map(status => (
                <button key={status} onClick={() => updateStatus(booking.id, status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold border transition-colors ${statusColors[status]} hover:opacity-80`}>
                  {statusLabels[status]}
                </button>
              ))}
              <a href={`https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${booking.name}, te contacto por tu solicitud de kinesiología. 🌸`)}`}
                target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-sans font-bold hover:bg-green-100 transition-colors">
                💬 WhatsApp
              </a>
              <button onClick={() => setDeleteId(booking.id)}
                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-sans font-bold hover:bg-red-100 transition-colors ml-auto">
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <p className="font-sans text-vino/40 text-sm">No hay reservas con este filtro.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="¿Eliminar reserva?"
        message="¿Estás seguro/a de que deseas borrar este registro de reserva?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {toast && (
        <div className="toast fixed bottom-6 right-6 bg-vino text-nude px-6 py-3 rounded-full shadow-lg font-sans text-sm font-bold z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
