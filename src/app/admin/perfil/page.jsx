'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    const { data } = await supabase.from('profile').select('*').eq('id', 1).single()
    setProfile(data)
    setLoading(false)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('profile').update({
      about_text_1: profile.about_text_1,
      about_text_2: profile.about_text_2,
      phone: profile.phone,
      email: profile.email,
      whatsapp_number: profile.whatsapp_number,
      instagram_url: profile.instagram_url,
      hero_image_url: profile.hero_image_url,
      profile_image_url: profile.profile_image_url,
      coverage_zones: profile.coverage_zones,
    }).eq('id', 1)

    if (!error) showToast('Perfil actualizado ✓')
    else showToast('Error al guardar')
    setSaving(false)
  }

  const updateZone = (index, field, value) => {
    const zones = [...(profile.coverage_zones || [])]
    zones[index] = { ...zones[index], [field]: value }
    setProfile({ ...profile, coverage_zones: zones })
  }

  const addZone = () => {
    setProfile({ ...profile, coverage_zones: [...(profile.coverage_zones || []), { name: '', detail: 'Cobertura completa' }] })
  }

  const removeZone = (index) => {
    setProfile({ ...profile, coverage_zones: (profile.coverage_zones || []).filter((_, i) => i !== index) })
  }

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSaving(true)
    showToast('Subiendo imagen...')

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${field}/${fileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      
      setProfile(prev => ({ ...prev, [field]: data.publicUrl }))
      showToast('Imagen subida con éxito ✓')
    } catch (err) {
      console.error(err)
      showToast('Error al subir imagen (Asegúrate de ejecutar el nuevo schema.sql)')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-rosado/30 border-t-rosado rounded-full animate-spin" /></div>
  if (!profile) return <p className="font-sans text-vino/60 text-center py-10">No se encontró el perfil. Ejecuta el schema.sql en Supabase.</p>

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-vino mb-2">Editor de Perfil</h1>
        <p className="font-sans text-vino/60 text-sm">Actualiza tu información personal, contacto y zona de cobertura.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">

        {/* Sobre mí */}
        <div className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-6 space-y-4">
          <h2 className="font-serif text-xl text-vino">Sobre mí</h2>
          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-2">Primer párrafo</label>
            <textarea value={profile.about_text_1 || ''} onChange={(e) => setProfile({ ...profile, about_text_1: e.target.value })}
              rows="4" className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-sm text-vino resize-none" />
          </div>
          <div>
            <label className="block font-sans text-sm font-bold text-vino mb-2">Segundo párrafo</label>
            <textarea value={profile.about_text_2 || ''} onChange={(e) => setProfile({ ...profile, about_text_2: e.target.value })}
              rows="4" className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-sm text-vino resize-none" />
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-6 space-y-4">
          <h2 className="font-serif text-xl text-vino">Contacto</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-sans text-sm font-bold text-vino mb-2">Teléfono (visible)</label>
              <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+56 9 8292 7833"
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino" />
            </div>
            <div>
              <label className="block font-sans text-sm font-bold text-vino mb-2">WhatsApp (sin + ni espacios)</label>
              <input value={profile.whatsapp_number || ''} onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
                placeholder="56982927833"
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino" />
            </div>
            <div>
              <label className="block font-sans text-sm font-bold text-vino mb-2">Email</label>
              <input value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                type="email" placeholder="klga.conianjari@gmail.com"
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino" />
            </div>
            <div>
              <label className="block font-sans text-sm font-bold text-vino mb-2">Instagram URL</label>
              <input value={profile.instagram_url || ''} onChange={(e) => setProfile({ ...profile, instagram_url: e.target.value })}
                placeholder="https://instagram.com/..."
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino" />
            </div>
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-6 space-y-4">
          <h2 className="font-serif text-xl text-vino">Imágenes</h2>
          <p className="font-sans text-xs text-vino/50">Ingresa la URL de las imágenes o sube un archivo directamente desde tu dispositivo.</p>
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <label className="block font-sans text-sm font-bold text-vino mb-2">Imagen Hero (portada)</label>
              <input value={profile.hero_image_url || ''} onChange={(e) => setProfile({ ...profile, hero_image_url: e.target.value })}
                placeholder="/foto-coni.jpg u https://..."
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino mb-3" />
              
              <div className="relative overflow-hidden inline-block w-full">
                <button type="button" className="w-full bg-vino/5 border border-dashed border-rosado/40 text-vino font-sans text-xs font-bold py-2.5 rounded-xl hover:bg-vino/10 transition-colors">
                  📤 Subir imagen desde el equipo
                </button>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'hero_image_url')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={saving} />
              </div>

              {profile.hero_image_url && (
                <div className="mt-4 w-full h-40 rounded-2xl overflow-hidden bg-nude-dark border border-rosado/20 shadow-inner">
                  <img src={profile.hero_image_url} alt="Preview Hero" className="w-full h-full object-cover object-top" />
                </div>
              )}
            </div>
            <div>
              <label className="block font-sans text-sm font-bold text-vino mb-2">Imagen de perfil</label>
              <input value={profile.profile_image_url || ''} onChange={(e) => setProfile({ ...profile, profile_image_url: e.target.value })}
                placeholder="/foto-coni.jpg u https://..."
                className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-2.5 font-sans text-sm text-vino mb-3" />

              <div className="relative overflow-hidden inline-block w-full">
                <button type="button" className="w-full bg-vino/5 border border-dashed border-rosado/40 text-vino font-sans text-xs font-bold py-2.5 rounded-xl hover:bg-vino/10 transition-colors">
                  📤 Subir imagen desde el equipo
                </button>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'profile_image_url')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={saving} />
              </div>

              {profile.profile_image_url && (
                <div className="mt-4 w-32 h-32 rounded-full overflow-hidden bg-nude-dark border-4 border-white shadow-md">
                  <img src={profile.profile_image_url} alt="Preview Perfil" className="w-full h-full object-cover object-top" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zonas de cobertura */}
        <div className="bg-white/70 rounded-2xl border border-rosado/15 shadow-sm p-6 space-y-4">
          <h2 className="font-serif text-xl text-vino">Zonas de cobertura</h2>
          <div className="space-y-3">
            {(profile.coverage_zones || []).map((zone, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input value={zone.name} onChange={(e) => updateZone(i, 'name', e.target.value)}
                  placeholder="Ciudad" className="form-input flex-1 bg-white border border-rosado/30 rounded-xl px-4 py-2 font-sans text-sm text-vino" />
                <input value={zone.detail} onChange={(e) => updateZone(i, 'detail', e.target.value)}
                  placeholder="Detalle" className="form-input flex-1 bg-white border border-rosado/30 rounded-xl px-4 py-2 font-sans text-sm text-vino" />
                <button type="button" onClick={() => removeZone(i)}
                  className="px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-sm">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addZone}
            className="px-4 py-2 rounded-xl border border-dashed border-rosado/30 text-rosado font-sans text-sm hover:bg-rosado/5 transition-colors">
            + Agregar zona
          </button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-8 py-3 rounded-full bg-vino text-nude font-sans font-bold text-sm hover:bg-vino-light transition-colors shadow-md disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {toast && (
        <div className="toast fixed bottom-6 right-6 bg-vino text-nude px-6 py-3 rounded-full shadow-lg font-sans text-sm font-bold z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
