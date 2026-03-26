'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmModal from '@/components/ConfirmModal'

export default function ResenasPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const supabase = createClient()

  useEffect(() => { loadReviews() }, [])

  const loadReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').order('sort_order')
    setReviews(data || [])
    setLoading(false)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSave = async (review) => {
    setSaving(true)
    if (review.id) {
      await supabase.from('reviews').update({
        author_name: review.author_name,
        author_subtitle: review.author_subtitle,
        content: review.content,
        rating: review.rating,
        is_active: review.is_active,
      }).eq('id', review.id)
      showToast('Reseña actualizada ✓')
    } else {
      const maxOrder = Math.max(0, ...reviews.map(r => r.sort_order))
      await supabase.from('reviews').insert({
        author_name: review.author_name,
        author_subtitle: review.author_subtitle,
        content: review.content,
        rating: review.rating,
        is_active: true,
        sort_order: maxOrder + 1,
      })
      showToast('Reseña creada ✓')
    }
    setSaving(false)
    setShowForm(false)
    setEditing(null)
    loadReviews()
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    await supabase.from('reviews').delete().eq('id', deleteId)
    showToast('Reseña eliminada ✓')
    setDeleteId(null)
    loadReviews()
  }

  const toggleActive = async (review) => {
    await supabase.from('reviews').update({ is_active: !review.is_active }).eq('id', review.id)
    loadReviews()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-vino mb-2">Gestión de Reseñas</h1>
          <p className="font-sans text-vino/60 text-sm">Agrega, edita o elimina testimonios de pacientes.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-6 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors shadow-md self-start">
          + Nueva reseña
        </button>
      </div>

      {(showForm || editing) && (
        <div className="mb-6">
          <ReviewForm
            review={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            saving={saving}
          />
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className={`bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-5 ${!review.is_active ? 'opacity-50' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-rosado/30 flex items-center justify-center font-serif font-bold text-vino text-sm">
                    {review.author_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-sans font-bold text-vino text-sm">{review.author_name}</p>
                    <p className="font-sans text-xs text-vino/50">{review.author_subtitle}</p>
                  </div>
                  <span className="text-rosado text-sm ml-2">{'★'.repeat(review.rating)}</span>
                </div>
                <p className="font-sans text-sm text-vino/70 italic line-clamp-2">&ldquo;{review.content}&rdquo;</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(review)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-colors ${review.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {review.is_active ? 'Activa' : 'Inactiva'}
                </button>
                <button onClick={() => { setEditing(review); setShowForm(false) }}
                  className="px-3 py-1.5 rounded-lg bg-vino/5 text-vino text-xs font-sans font-bold hover:bg-vino/10 transition-colors">
                  Editar
                </button>
                <button onClick={() => setDeleteId(review.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-sans font-bold hover:bg-red-100 transition-colors">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="¿Eliminar reseña?"
        message="Esta acción borrará el testimonio permanentemente. ¿Estás seguro/a?"
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

function ReviewForm({ review, onSave, onCancel, saving }) {
  const [authorName, setAuthorName] = useState(review?.author_name || '')
  const [authorSubtitle, setAuthorSubtitle] = useState(review?.author_subtitle || '')
  const [content, setContent] = useState(review?.content || '')
  const [rating, setRating] = useState(review?.rating || 5)

  return (
    <div className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-6 space-y-4">
      <h3 className="font-serif text-lg text-vino">{review ? 'Editar reseña' : 'Nueva reseña'}</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-sans text-sm font-bold text-vino mb-2">Nombre del autor</label>
          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Ej. María González"
            className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino" />
        </div>
        <div>
          <label className="block font-sans text-sm font-bold text-vino mb-2">Subtítulo</label>
          <input value={authorSubtitle} onChange={(e) => setAuthorSubtitle(e.target.value)}
            placeholder="Ej. Paciente · Viña del Mar"
            className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino" />
        </div>
      </div>

      <div>
        <label className="block font-sans text-sm font-bold text-vino mb-2">Testimonio</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows="3"
          placeholder="Escribe el testimonio del paciente..."
          className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-sm text-vino resize-none" />
      </div>

      <div>
        <label className="block font-sans text-sm font-bold text-vino mb-2">Valoración</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(n)} type="button"
              className={`text-2xl transition-colors ${n <= rating ? 'text-rosado' : 'text-rosado/20'}`}>
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({ ...review, author_name: authorName, author_subtitle: authorSubtitle, content, rating })}
          disabled={saving || !authorName || !content}
          className="px-6 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onCancel}
          className="px-6 py-2.5 rounded-full bg-white border border-rosado/30 text-vino font-sans font-bold text-sm hover:bg-nude transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}
