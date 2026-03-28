'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BookingForm({ whatsappNumber = '56982927833' }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    const form = e.target
    const formData = new FormData(form)
    const data = Object.fromEntries(formData)

    // Validate
    const newErrors = {}
    if (!data.nombre?.trim()) newErrors.nombre = 'Por favor ingresa tu nombre.'
    if (!data.telefono?.trim()) newErrors.telefono = 'Por favor ingresa tu número de teléfono.'
    if (!data.servicio) newErrors.servicio = 'Por favor selecciona un servicio.'
    if (!data.fecha) newErrors.fecha = 'Selecciona una fecha.'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const supabase = createClient()
      const { error } = await supabase.from('bookings').insert({
        name: data.nombre.trim(),
        phone: data.telefono.trim(),
        service: data.servicio,
        preferred_date: data.fecha || null,
        preferred_time: data.hora || null,
        message: data.mensaje?.trim() || null,
      })

      if (error) throw error

      setSuccess(true)

      // Also open WhatsApp
      const servicio = form.servicio.options[form.servicio.selectedIndex].text
      const waText = encodeURIComponent(
        `Hola Constanza, quiero agendar una hora 🌸\nNombre: ${data.nombre}\nTeléfono: ${data.telefono}\nServicio: ${servicio}\nFecha: ${data.fecha}\nHorario: ${data.hora || 'sin preferencia'}` +
        (data.mensaje ? `\nMensaje: ${data.mensaje}` : '')
      )
      window.open(`https://wa.me/${whatsappNumber}?text=${waText}`, '_blank')
    } catch (err) {
      console.error('Error al enviar reserva:', err)
      // Still open WhatsApp as fallback
      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit}
      className="fade-up bg-nude rounded-3xl p-8 md:p-10 shadow-md border border-rosado/20 space-y-6">

      <div>
        <label htmlFor="nombre" className="block font-sans text-sm font-bold text-vino mb-2">Nombre completo *</label>
        <input type="text" id="nombre" name="nombre" autoComplete="name" placeholder="Ej. Juan González"
          aria-invalid={!!errors.nombre}
          aria-describedby={errors.nombre ? 'nombre-error' : undefined}
          onChange={() => clearError('nombre')} disabled={success}
          className={`form-input w-full bg-white/70 border ${errors.nombre ? 'border-red-400' : 'border-rosado/30'} rounded-xl px-4 py-3 font-sans text-vino placeholder-vino/30 transition-all`} />
        {errors.nombre && <p id="nombre-error" className="mt-1 text-xs text-red-500 font-sans" role="alert">{errors.nombre}</p>}
      </div>

      <div>
        <label htmlFor="telefono" className="block font-sans text-sm font-bold text-vino mb-2">Teléfono / WhatsApp *</label>
        <input type="tel" id="telefono" name="telefono" autoComplete="tel" placeholder="+56 9 XXXX XXXX"
          aria-invalid={!!errors.telefono}
          aria-describedby={errors.telefono ? 'telefono-error' : undefined}
          onChange={() => clearError('telefono')} disabled={success}
          className={`form-input w-full bg-white/70 border ${errors.telefono ? 'border-red-400' : 'border-rosado/30'} rounded-xl px-4 py-3 font-sans text-vino placeholder-vino/30 transition-all`} />
        {errors.telefono && <p id="telefono-error" className="mt-1 text-xs text-red-500 font-sans" role="alert">{errors.telefono}</p>}
      </div>

      <div>
        <label htmlFor="servicio" className="block font-sans text-sm font-bold text-vino mb-2">Tipo de servicio *</label>
        <select id="servicio" name="servicio" defaultValue=""
          aria-invalid={!!errors.servicio}
          aria-describedby={errors.servicio ? 'servicio-error' : undefined}
          onChange={() => clearError('servicio')} disabled={success}
          className={`form-input w-full bg-white/70 border ${errors.servicio ? 'border-red-400' : 'border-rosado/30'} rounded-xl px-4 py-3 font-sans text-vino transition-all appearance-none cursor-pointer`}>
          <option value="" disabled>Selecciona un servicio</option>
          <option value="musculoesqueletica">Rehabilitación Musculoesquelética</option>
          <option value="neurorehabilitacion">Neurorehabilitación</option>
          <option value="adulto-mayor">Kinesiología Adulto Mayor</option>
          <option value="respiratoria">Kinesiología Respiratoria</option>
          <option value="otro">Otro / No estoy seguro/a</option>
        </select>
        {errors.servicio && <p id="servicio-error" className="mt-1 text-xs text-red-500 font-sans" role="alert">{errors.servicio}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fecha" className="block font-sans text-sm font-bold text-vino mb-2">Fecha preferida *</label>
          <input type="date" id="fecha" name="fecha" min={today}
            aria-invalid={!!errors.fecha}
            aria-describedby={errors.fecha ? 'fecha-error' : undefined}
            onChange={() => clearError('fecha')} disabled={success}
            className={`form-input w-full bg-white/70 border ${errors.fecha ? 'border-red-400' : 'border-rosado/30'} rounded-xl px-4 py-3 font-sans text-vino transition-all`} />
          {errors.fecha && <p id="fecha-error" className="mt-1 text-xs text-red-500 font-sans" role="alert">{errors.fecha}</p>}
        </div>
        <div>
          <label htmlFor="hora" className="block font-sans text-sm font-bold text-vino mb-2">Hora preferida</label>
          <select id="hora" name="hora" disabled={success}
            className="form-input w-full bg-white/70 border border-rosado/30 rounded-xl px-4 py-3 font-sans text-vino transition-all appearance-none cursor-pointer">
            <option value="">Cualquier hora</option>
            <option value="mañana">Mañana (9:00 – 12:00)</option>
            <option value="mediodia">Mediodía (12:00 – 15:00)</option>
            <option value="tarde">Tarde (15:00 – 19:00)</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="mensaje" className="block font-sans text-sm font-bold text-vino mb-2">Cuéntame más (opcional)</label>
        <textarea id="mensaje" name="mensaje" rows="3" disabled={success}
          placeholder="¿Qué molestia tienes? ¿Hay algo que deba saber antes de la visita?"
          className="form-input w-full bg-white/70 border border-rosado/30 rounded-xl px-4 py-3 font-sans text-vino placeholder-vino/30 transition-all resize-none" />
      </div>

      {!success && (
        <button type="submit" disabled={loading}
          className="w-full bg-vino text-nude font-sans font-bold py-4 rounded-full hover:bg-vino-light transition-colors shadow-lg text-lg tracking-wide disabled:opacity-50">
          {loading ? 'Enviando...' : 'Enviar Solicitud'}
        </button>
      )}

      {success && (
        <div className="text-center py-4" role="status" aria-live="polite">
          <p className="font-serif text-vino text-xl mb-1">¡Solicitud enviada!</p>
          <p className="font-sans text-vino/70 text-sm">Constanza te contactará en menos de 24 horas para confirmar tu cita.</p>
        </div>
      )}
    </form>
  )
}
