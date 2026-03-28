import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import Navbar from '@/components/Navbar'
import ReviewCarousel from '@/components/ReviewCarousel'
import FaqAccordion from '@/components/FaqAccordion'
import BookingForm from '@/components/BookingForm'
import WhatsAppButton from '@/components/WhatsAppButton'
import FadeUpObserver from '@/components/FadeUpObserver'
import SafeSvg from '@/components/SafeSvg'

async function getData() {
  const supabase = await createClient()

  const [servicesRes, reviewsRes, faqsRes, profileRes] = await Promise.all([
    supabase.from('services').select('*').order('sort_order'),
    supabase.from('reviews').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('faqs').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('profile').select('*').eq('id', 1).single(),
  ])

  return {
    services: servicesRes.data || [],
    reviews: reviewsRes.data || [],
    faqs: faqsRes.data || [],
    profile: profileRes.data || {},
  }
}

export default async function HomePage() {
  const { services, reviews, faqs, profile } = await getData()

  const zones = profile.coverage_zones || [
    { name: 'Viña del Mar', detail: 'Cobertura completa' },
    { name: 'Valparaíso', detail: 'Cobertura completa' },
    { name: 'Quilpué', detail: 'Cobertura completa' },
    { name: 'Con Con', detail: 'Cobertura completa' },
    { name: 'Villa Alemana', detail: 'Consultar disponibilidad' },
  ]

  return (
    <>
      <Navbar profile={profile} />
      <FadeUpObserver />

      <main>
      {/* ═══ HERO ═══ */}
      <section id="inicio" className="min-h-screen flex items-center pt-24 pb-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
          <div className="fade-up">
            <span className="inline-block text-xs font-sans font-bold uppercase tracking-widest text-rosado mb-4 bg-rosado/10 px-3 py-1 rounded-full">
              Atención a domicilio · Viña del Mar
            </span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-vino leading-tight mb-6">
              Kinesiología<br />
              <em className="text-rosado not-italic">a Domicilio:</em><br />
              Atención Integral
            </h1>
            <p className="font-sans text-lg text-vino/80 leading-relaxed mb-8 max-w-md">
              Para adultos y adultos mayores. Recupera tu bienestar y calidad de vida con atención
              personalizada en la comodidad de tu hogar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#reserva"
                className="bg-vino text-nude font-sans font-bold text-center px-8 py-4 rounded-full hover:bg-vino-light transition-colors shadow-lg">
                Agendar mi Hora
              </a>
              <a href="#servicios"
                className="border-2 border-vino text-vino font-sans font-bold text-center px-8 py-4 rounded-full hover:bg-nude-dark transition-colors">
                Ver Servicios
              </a>
            </div>
            <div className="flex flex-wrap gap-6 mt-10">
              <div className="flex items-center gap-2 text-sm text-vino/70">
                <span className="text-rosado text-xl">✦</span> Titulada U. Andrés Bello
              </div>
              <div className="flex items-center gap-2 text-sm text-vino/70">
                <span className="text-rosado text-xl">✦</span> Cobertura Viña del Mar
              </div>
            </div>
          </div>

          <div className="fade-up flex justify-center md:justify-end" style={{ transitionDelay: '0.15s' }}>
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-full h-full rounded-3xl bg-rosado/20 -z-10" />
              <div className="absolute -bottom-4 -right-4 w-full h-full rounded-3xl bg-vino/10 -z-10" />
              <div className="relative w-72 h-80 md:w-80 md:h-96 rounded-3xl overflow-hidden shadow-2xl bg-nude-dark">
                <Image
                  src={profile.hero_image_url || '/foto-coni.jpg'}
                  alt="Kinesióloga Constanza Anjarí atendiendo a domicilio en Viña del Mar"
                  fill
                  priority
                  sizes="(max-width: 768px) 288px, 320px"
                  className="object-cover"
                  style={{ objectPosition: '50% 15%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SOBRE MÍ ═══ */}
      <section id="sobre-mi" className="py-20 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div className="fade-up">
            <span className="inline-block text-xs font-sans font-bold uppercase tracking-widest text-rosado mb-4 bg-rosado/10 px-3 py-1 rounded-full">
              Conóceme
            </span>
            <h2 className="font-serif text-4xl text-vino mb-6 text-left">Sobre mí</h2>
            <div className="w-14 h-0.5 bg-rosado mb-8 rounded-full" />
            <p className="font-sans text-vino/80 leading-relaxed mb-5">
              {profile.about_text_1 || 'Soy Constanza Anjarí, kinesióloga titulada de la Universidad Andrés Bello...'}
            </p>
            <p className="font-sans text-vino/80 leading-relaxed mb-8">
              {profile.about_text_2 || 'Me enfoco en neurorehabilitación, kinesiología musculoesquelética...'}
            </p>
            <div className="flex flex-col gap-3">
              {['Titulada Universidad Andrés Bello', 'Especialización en adulto mayor y neurorehabilitación', 'Atención 100% personalizada y a domicilio'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 font-sans text-sm text-vino/80">
                  <span className="w-6 h-6 rounded-full bg-rosado/20 flex items-center justify-center text-rosado font-bold text-xs">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="fade-up grid grid-cols-2 gap-4" style={{ transitionDelay: '0.15s' }}>
            {[
              { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', title: 'Calidez', desc: 'Trato cercano y empático con el paciente y su familia.', dark: false },
              { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', title: 'Profesionalismo', desc: 'Evaluación rigurosa y tratamiento basado en evidencia.', dark: false },
              { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Puntualidad', desc: 'Respeto tu tiempo. Llego siempre en el horario acordado.', dark: false },
              { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', title: 'A domicilio', desc: 'Sin traslados. Me adapto a tu hogar y tus necesidades.', dark: true },
            ].map((card, i) => (
              <div key={i} className={`${card.dark ? 'bg-vino' : 'bg-white/60'} rounded-3xl p-6 ${card.dark ? '' : 'border border-rosado/20'} shadow-sm`}>
                <div className={`w-10 h-10 rounded-2xl ${card.dark ? 'bg-nude/15' : 'bg-rosado/15'} flex items-center justify-center mb-4`}>
                  <svg className={`w-5 h-5 ${card.dark ? 'text-nude' : 'text-rosado'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} />
                  </svg>
                </div>
                <h3 className={`font-serif ${card.dark ? 'text-nude' : 'text-vino'} text-base mb-2`}>{card.title}</h3>
                <p className={`font-sans text-xs ${card.dark ? 'text-nude/80' : 'text-vino/70'} leading-relaxed`}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SERVICIOS ═══ */}
      <section id="servicios" className="py-20 px-6 md:px-12 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 fade-up">
            <h2 className="font-serif text-4xl text-vino section-title">Servicios</h2>
            <p className="font-sans text-vino/70 mt-6 max-w-xl mx-auto">
              Tratamientos kinesiológicos especializados, adaptados a las necesidades de cada paciente,
              con atención personalizada en tu hogar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, i) => (
              <div key={service.id}
                className="service-card fade-up bg-nude rounded-3xl p-7 shadow-sm border border-rosado/20"
                style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="w-14 h-14 rounded-2xl bg-rosado/15 flex items-center justify-center mb-5">
                  <SafeSvg html={service.icon_svg} className="text-rosado" />
                </div>
                <h3 className="font-serif text-lg text-vino mb-3">{service.title}</h3>
                <ul className="font-sans text-sm text-vino/70 space-y-1.5">
                  {(service.items || []).map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-rosado mt-0.5">·</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CÓMO FUNCIONA ═══ */}
      <section id="como-funciona" className="py-20 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 fade-up">
            <h2 className="font-serif text-4xl text-vino section-title">¿Cómo funciona?</h2>
            <p className="font-sans text-vino/70 mt-6 max-w-xl mx-auto">
              Tres pasos simples para comenzar tu recuperación sin salir de casa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-0.5 bg-rosado/30" />

            {[
              { num: '1', title: 'Contáctame', desc: 'Escríbeme por WhatsApp o completa el formulario de reserva con tus datos y el tipo de atención que necesitas.' },
              { num: '2', title: 'Evaluación inicial', desc: 'En la primera sesión realizo una evaluación completa del paciente en su hogar para diseñar un plan de tratamiento personalizado.' },
              { num: '3', title: '¡A recuperarse!', desc: 'Comenzamos el tratamiento con sesiones regulares, con seguimiento continuo del avance y ajustes cuando sea necesario.' },
            ].map((step, i) => (
              <div key={i} className="step-card fade-up text-center" style={{ transitionDelay: `${i * 0.12}s` }}>
                <div className={`relative inline-flex w-20 h-20 rounded-full ${i === 2 ? 'bg-vino border-2 border-vino' : 'bg-rosado/15 border-2 border-rosado/30'} items-center justify-center mb-6 mx-auto`}>
                  <span className={`font-serif text-3xl font-bold ${i === 2 ? 'text-nude' : 'text-rosado'}`}>{step.num}</span>
                  {i < 2 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-vino rounded-full" />}
                </div>
                <h3 className="font-serif text-xl text-vino mb-3">{step.title}</h3>
                <p className="font-sans text-sm text-vino/70 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 fade-up">
            <a href="#reserva"
              className="inline-block bg-vino text-nude font-sans font-bold px-10 py-4 rounded-full hover:bg-vino-light transition-colors shadow-lg">
              Comenzar ahora
            </a>
          </div>
        </div>
      </section>

      {/* ═══ RESEÑAS ═══ */}
      <section id="resenas" className="py-20 px-6 md:px-12 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 fade-up">
            <h2 className="font-serif text-4xl text-vino section-title">Lo que dicen mis pacientes</h2>
            <p className="font-sans text-vino/70 mt-6 max-w-xl mx-auto">
              La recuperación de mis pacientes es mi mayor motivación.
            </p>
          </div>
          {reviews.length > 0 && <ReviewCarousel reviews={reviews} />}
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="py-20 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14 fade-up">
            <h2 className="font-serif text-4xl text-vino section-title">Preguntas frecuentes</h2>
            <p className="font-sans text-vino/70 mt-6">Todo lo que necesitas saber antes de tu primera sesión.</p>
          </div>
          {faqs.length > 0 && <FaqAccordion faqs={faqs} />}
        </div>
      </section>

      {/* ═══ ZONA DE COBERTURA ═══ */}
      <section className="py-16 px-6 md:px-12 bg-white/40">
        <div className="max-w-5xl mx-auto fade-up">
          <div className="bg-nude rounded-3xl border border-rosado/20 p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="font-serif text-3xl text-vino mb-4">Zona de cobertura</h2>
                <div className="w-12 h-0.5 bg-rosado mb-6 rounded-full" />
                <p className="font-sans text-vino/70 text-sm leading-relaxed mb-6">
                  Llevo la kinesiología hasta tu hogar en toda la región de Valparaíso. Si no estás seguro/a si llego a tu
                  sector, escríbeme — siempre buscamos una solución.
                </p>
                <a href={`https://wa.me/${profile.whatsapp_number || '56982927833'}?text=${encodeURIComponent('Hola Constanza, quiero saber si llegas a mi sector.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-block bg-vino text-nude font-sans font-bold px-7 py-3 rounded-full hover:bg-vino-light transition-colors shadow-md text-sm">
                  Consultar mi sector
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {zones.slice(0, 4).map((zone, i) => (
                  <div key={i} className="bg-white/70 rounded-2xl p-4 flex items-center gap-3 border border-rosado/15">
                    <span className="text-rosado text-xl">📍</span>
                    <div>
                      <p className="font-sans font-bold text-vino text-sm">{zone.name}</p>
                      <p className="font-sans text-xs text-vino/70">{zone.detail}</p>
                    </div>
                  </div>
                ))}
                {zones.length > 4 && (
                  <div className="col-span-2 bg-rosado/10 rounded-2xl p-4 flex items-center gap-3 border border-rosado/20">
                    <span className="text-rosado text-xl">📍</span>
                    <div>
                      <p className="font-sans font-bold text-vino text-sm">{zones[4].name}</p>
                      <p className="font-sans text-xs text-vino/70">{zones[4].detail}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FORMULARIO DE RESERVA ═══ */}
      <section id="reserva" className="py-20 px-6 md:px-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 fade-up">
            <h2 className="font-serif text-4xl text-vino section-title">Agenda tu Hora</h2>
            <p className="font-sans text-vino/70 mt-6">
              Completa el formulario y me pondré en contacto contigo a la brevedad para confirmar tu cita.
            </p>
          </div>
          <BookingForm whatsappNumber={profile.whatsapp_number || '56982927833'} />
        </div>
      </section>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer id="contacto" className="bg-vino text-nude py-14 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-10">
          <div>
            <p className="font-serif text-2xl font-semibold mb-2">Constanza Anjarí</p>
            <p className="font-sans text-xs text-nude/70 uppercase tracking-widest mb-4">Kinesióloga · U. Andrés Bello</p>
            <p className="font-sans text-sm text-nude/70 leading-relaxed">
              Atención kinesiológica a domicilio con dedicación, calidez y respaldo profesional.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg mb-5">Contacto</h3>
            <ul className="space-y-3 font-sans text-sm text-nude/80">
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <a href={`https://wa.me/${profile.whatsapp_number || '56982927833'}`} target="_blank" rel="noopener noreferrer"
                  className="hover:text-white transition-colors">{profile.phone || '+569 8292 7833'}</a>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-5 h-5 text-rosado flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${profile.email || 'klga.conianjari@gmail.com'}`} className="hover:text-white transition-colors break-all">
                  {profile.email || 'klga.conianjari@gmail.com'}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-rosado flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-nude/80">Viña del Mar, Valparaíso,<br />Quilpué, Con Con y alrededores</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-lg mb-5">Navegación</h3>
            <ul className="space-y-2 font-sans text-sm text-nude/80">
              <li><a href="#inicio" className="hover:text-white transition-colors">Inicio</a></li>
              <li><a href="#sobre-mi" className="hover:text-white transition-colors">Sobre mí</a></li>
              <li><a href="#servicios" className="hover:text-white transition-colors">Servicios</a></li>
              <li><a href="#como-funciona" className="hover:text-white transition-colors">¿Cómo funciona?</a></li>
              <li><a href="#resenas" className="hover:text-white transition-colors">Reseñas</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Preguntas frecuentes</a></li>
              <li><a href="#reserva" className="hover:text-white transition-colors">Agendar Hora</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-nude/15 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-sans text-nude/60">
          <p>&copy; {new Date().getFullYear()} Constanza Anjarí &middot; Kinesióloga. Todos los derechos reservados.</p>
          <p>Hecho con cuidado en Viña del Mar, Chile 🌊</p>
        </div>
      </footer>

      <WhatsAppButton whatsappNumber={profile.whatsapp_number || '56982927833'} />
    </>
  )
}
