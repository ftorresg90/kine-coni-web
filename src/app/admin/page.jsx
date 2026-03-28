import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [bookingsRes, reviewsRes, faqsRes, servicesRes] = await Promise.all([
    supabase.from('bookings').select('id, status', { count: 'exact' }),
    supabase.from('reviews').select('id', { count: 'exact' }),
    supabase.from('faqs').select('id', { count: 'exact' }),
    supabase.from('services').select('id', { count: 'exact' }),
  ])

  const pendingBookings = (bookingsRes.data || []).filter(b => b.status === 'pendiente').length
  const totalBookings = bookingsRes.count || 0
  const totalReviews = reviewsRes.count || 0
  const totalFaqs = faqsRes.count || 0
  const totalServices = servicesRes.count || 0

  const stats = [
    { label: 'Reservas pendientes', value: pendingBookings, color: 'bg-amber-500', icon: '📋' },
    { label: 'Total reservas', value: totalBookings, color: 'bg-vino', icon: '📅' },
    { label: 'Reseñas', value: totalReviews, color: 'bg-rosado', icon: '⭐' },
    { label: 'Preguntas FAQ', value: totalFaqs, color: 'bg-vino-light', icon: '❓' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-vino mb-2">¡Bienvenida, Constanza! 🌸</h1>
        <p className="font-sans text-vino/60 text-sm">Aquí puedes gestionar todo el contenido de tu sitio web.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/70 rounded-2xl p-5 border border-rosado/15 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <div className={`w-2 h-2 rounded-full ${stat.color}`} />
            </div>
            <p className="font-serif text-3xl text-vino font-bold">{stat.value}</p>
            <p className="font-sans text-xs text-vino/50 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/70 rounded-2xl p-6 border border-rosado/15 shadow-sm">
        <h2 className="font-serif text-xl text-vino mb-4">Accesos rápidos</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { href: '/admin/reservas', label: 'Ver reservas', desc: 'Gestiona las solicitudes de citas' },
            { href: '/admin/resenas', label: 'Gestionar reseñas', desc: 'Agrega o edita testimonios' },
            { href: '/admin/faq', label: 'Editar FAQ', desc: 'Actualiza preguntas frecuentes' },
            { href: '/admin/servicios', label: 'Editar servicios', desc: 'Modifica las áreas de atención' },
            { href: '/admin/perfil', label: 'Mi perfil', desc: 'Actualiza tu información personal' },
          ].map((link, i) => (
            <Link key={i} href={link.href}
              className="block p-4 rounded-xl border border-rosado/15 hover:bg-nude/50 transition-colors group">
              <p className="font-sans font-bold text-vino text-sm group-hover:text-rosado transition-colors">{link.label}</p>
              <p className="font-sans text-xs text-vino/50 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
