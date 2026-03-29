'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmModal from '@/components/ConfirmModal'

export default function FaqPage() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const supabase = createClient()

  const loadFaqs = async () => {
    const { data } = await supabase.from('faqs').select('*').order('sort_order')
    setFaqs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.from('faqs').select('*').order('sort_order').then(({ data }) => {
      setFaqs(data || [])
      setLoading(false)
    })
  }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSave = async (faq) => {
    setSaving(true)
    if (faq.id) {
      const { error } = await supabase.from('faqs').update({
        question: faq.question,
        answer: faq.answer,
        is_active: faq.is_active,
      }).eq('id', faq.id)
      if (error) { showToast('Error al guardar'); setSaving(false); return }
      showToast('Pregunta actualizada ✓')
    } else {
      const maxOrder = Math.max(0, ...faqs.map(f => f.sort_order))
      const { error } = await supabase.from('faqs').insert({
        question: faq.question,
        answer: faq.answer,
        is_active: true,
        sort_order: maxOrder + 1,
      })
      if (error) { showToast('Error al guardar'); setSaving(false); return }
      showToast('Pregunta creada ✓')
    }
    setSaving(false)
    setShowForm(false)
    setEditing(null)
    loadFaqs()
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('faqs').delete().eq('id', deleteId)
    if (error) { showToast('Error al eliminar'); setDeleteId(null); return }
    showToast('Pregunta eliminada ✓')
    setDeleteId(null)
    loadFaqs()
  }

  const toggleActive = async (faq) => {
    const { error } = await supabase.from('faqs').update({ is_active: !faq.is_active }).eq('id', faq.id)
    if (error) { showToast('Error al cambiar estado'); return }
    loadFaqs()
  }

  const moveOrder = async (faq, direction) => {
    const index = faqs.findIndex(f => f.id === faq.id)
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= faqs.length) return

    const swapFaq = faqs[swapIndex]
    const results = await Promise.all([
      supabase.from('faqs').update({ sort_order: swapFaq.sort_order }).eq('id', faq.id),
      supabase.from('faqs').update({ sort_order: faq.sort_order }).eq('id', swapFaq.id),
    ])
    if (results.some(r => r.error)) { showToast('Error al reordenar'); return }
    loadFaqs()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-vino mb-2">Gestión de FAQ</h1>
          <p className="font-sans text-vino/60 text-sm">Administra las preguntas frecuentes que aparecen en tu sitio.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-6 py-2.5 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors shadow-md self-start">
          + Nueva pregunta
        </button>
      </div>

      {(showForm || editing) && (
        <div className="mb-6">
          <FaqForm
            faq={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            saving={saving}
          />
        </div>
      )}

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div key={faq.id} className={`bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-5 ${!faq.is_active ? 'opacity-50' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-sans text-xs text-vino/40 font-bold">#{index + 1}</span>
                  <h3 className="font-sans font-bold text-vino text-sm">{faq.question}</h3>
                </div>
                <p className="font-sans text-sm text-vino/60 line-clamp-2">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <div className="flex gap-1">
                  <button onClick={() => moveOrder(faq, -1)} disabled={index === 0}
                    className="w-8 h-8 rounded-lg bg-vino/5 text-vino flex items-center justify-center hover:bg-vino/10 disabled:opacity-30 text-sm">
                    ↑
                  </button>
                  <button onClick={() => moveOrder(faq, 1)} disabled={index === faqs.length - 1}
                    className="w-8 h-8 rounded-lg bg-vino/5 text-vino flex items-center justify-center hover:bg-vino/10 disabled:opacity-30 text-sm">
                    ↓
                  </button>
                </div>
                <button onClick={() => toggleActive(faq)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition-colors ${faq.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {faq.is_active ? 'Activa' : 'Inactiva'}
                </button>
                <button onClick={() => { setEditing(faq); setShowForm(false) }}
                  className="px-3 py-1.5 rounded-lg bg-vino/5 text-vino text-xs font-sans font-bold hover:bg-vino/10 transition-colors">
                  Editar
                </button>
                <button onClick={() => setDeleteId(faq.id)}
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
        title="¿Eliminar pregunta?"
        message="¿Estás seguro/a de que deseas borrar esta pregunta frecuente?"
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

function FaqForm({ faq, onSave, onCancel, saving }) {
  const [question, setQuestion] = useState(faq?.question || '')
  const [answer, setAnswer] = useState(faq?.answer || '')

  return (
    <div className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-6 space-y-4">
      <h3 className="font-serif text-lg text-vino">{faq ? 'Editar pregunta' : 'Nueva pregunta'}</h3>

      <div>
        <label className="block font-sans text-sm font-bold text-vino mb-2">Pregunta</label>
        <input value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="¿Cuánto dura cada sesión?"
          className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino" />
      </div>

      <div>
        <label className="block font-sans text-sm font-bold text-vino mb-2">Respuesta</label>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows="4"
          placeholder="Escribe la respuesta..."
          className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-sm text-vino resize-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({ ...faq, question, answer })}
          disabled={saving || !question || !answer}
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
