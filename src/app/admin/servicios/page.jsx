'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SafeSvg from '@/components/SafeSvg'

export default function ServiciosPage() {
  const [services, setServices] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const supabase = createClient()

  const loadServices = async () => {
    const { data } = await supabase.from('services').select('*').order('sort_order')
    setServices(data || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.from('services').select('*').order('sort_order').then(({ data }) => {
      setServices(data || [])
      setLoading(false)
    })
  }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleSave = async (service) => {
    setSaving(true)
    const { error } = await supabase.from('services').update({
      title: service.title,
      description: service.description,
      items: service.items,
      icon_svg: service.icon_svg,
    }).eq('id', service.id)

    if (error) {
      showToast('Error al guardar')
      setSaving(false)
      return
    }
    showToast('Servicio actualizado ✓')
    setEditing(null)
    loadServices()
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-vino mb-2">Gestión de Servicios</h1>
        <p className="font-sans text-vino/60 text-sm">Edita los títulos, descripciones e ítems de tus 4 áreas de atención.</p>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm overflow-hidden">
            {editing === service.id ? (
              <EditServiceForm
                service={service}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
                saving={saving}
              />
            ) : (
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rosado/15 flex items-center justify-center flex-shrink-0">
                      <SafeSvg html={service.icon_svg} className="text-rosado" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-vino">{service.title}</h3>
                      <ul className="mt-2 space-y-1">
                        {(service.items || []).map((item, i) => (
                          <li key={i} className="font-sans text-sm text-vino/60 flex items-start gap-2">
                            <span className="text-rosado mt-0.5">·</span>{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button onClick={() => setEditing(service.id)}
                    className="px-4 py-2 rounded-xl bg-vino/5 text-vino font-sans text-sm font-bold hover:bg-vino/10 transition-colors flex-shrink-0">
                    Editar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className="toast fixed bottom-6 right-6 bg-vino text-nude px-6 py-3 rounded-full shadow-lg font-sans text-sm font-bold z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

function EditServiceForm({ service, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(service.title)
  const [items, setItems] = useState(service.items || [])
  const [iconSvg, setIconSvg] = useState(service.icon_svg || '')

  const updateItem = (index, value) => {
    const newItems = [...items]
    newItems[index] = value
    setItems(newItems)
  }

  const addItem = () => setItems([...items, ''])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  return (
    <div className="p-6 bg-nude/30 space-y-4">
      <div>
        <label className="block font-sans text-sm font-bold text-vino mb-2">Título del servicio</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-vino" />
      </div>

      <div>
        <label className="block font-sans text-sm font-bold text-vino mb-2">Ítems del servicio</label>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input value={item} onChange={(e) => updateItem(i, e.target.value)}
                className="form-input flex-1 bg-white border border-rosado/30 rounded-xl px-4 py-2 font-sans text-sm text-vino" />
              <button onClick={() => removeItem(i)}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-sm">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={addItem}
          className="mt-2 px-4 py-2 rounded-xl border border-dashed border-rosado/30 text-rosado font-sans text-sm hover:bg-rosado/5 transition-colors">
          + Agregar ítem
        </button>
      </div>

      <div>
        <label className="block font-sans text-sm font-bold text-vino mb-2">Ícono SVG</label>
        <textarea value={iconSvg} onChange={(e) => setIconSvg(e.target.value)} rows="3"
          className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-xs text-vino font-mono resize-none" />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave({ ...service, title, items, icon_svg: iconSvg })} disabled={saving}
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
