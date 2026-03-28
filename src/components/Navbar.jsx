'use client'

import { useEffect, useState } from 'react'

export default function Navbar({ profile }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const closeMobileMenu = () => setMenuOpen(false)
  const toggleMobileMenu = () => setMenuOpen(prev => !prev)

  return (
    <header
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-12${scrolled ? ' scrolled' : ''}`}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between" aria-label="Navegación principal">
        <a href="#inicio" className="flex flex-col leading-tight group">
          <span className="font-serif text-vino text-xl font-semibold tracking-wide group-hover:text-rosado transition-colors">
            Constanza Anjarí
          </span>
          <span className="text-xs font-sans text-rosado uppercase tracking-widest">
            Kinesióloga · U. Andrés Bello
          </span>
        </a>

        <ul className="hidden md:flex items-center gap-7 text-sm font-sans text-vino-light font-bold">
          <li><a href="#sobre-mi" className="hover:text-rosado transition-colors">Sobre mí</a></li>
          <li><a href="#servicios" className="hover:text-rosado transition-colors">Servicios</a></li>
          <li><a href="#como-funciona" className="hover:text-rosado transition-colors">¿Cómo funciona?</a></li>
          <li><a href="#resenas" className="hover:text-rosado transition-colors">Reseñas</a></li>
          <li><a href="#faq" className="hover:text-rosado transition-colors">FAQ</a></li>
        </ul>

        <div className="flex items-center gap-3">
          <a href="#reserva"
            className="hidden sm:inline-block bg-vino text-nude text-sm font-sans font-bold px-5 py-2.5 rounded-full hover:bg-vino-light transition-colors shadow-md">
            Agendar Hora
          </a>
          <button
            onClick={toggleMobileMenu}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="md:hidden p-2 rounded-lg hover:bg-nude-dark transition-colors"
          >
            <svg className="w-6 h-6 text-vino" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden mt-4 bg-nude rounded-2xl shadow-xl p-6 space-y-3 text-center font-sans text-vino font-bold"
          aria-label="Menú móvil"
        >
          <a href="#sobre-mi" className="block py-2 hover:text-rosado transition-colors" onClick={closeMobileMenu}>Sobre mí</a>
          <a href="#servicios" className="block py-2 hover:text-rosado transition-colors" onClick={closeMobileMenu}>Servicios</a>
          <a href="#como-funciona" className="block py-2 hover:text-rosado transition-colors" onClick={closeMobileMenu}>¿Cómo funciona?</a>
          <a href="#resenas" className="block py-2 hover:text-rosado transition-colors" onClick={closeMobileMenu}>Reseñas</a>
          <a href="#faq" className="block py-2 hover:text-rosado transition-colors" onClick={closeMobileMenu}>FAQ</a>
          <a href="#reserva" className="block bg-vino text-nude py-3 rounded-full hover:bg-vino-light transition-colors" onClick={closeMobileMenu}>Agendar Hora</a>
        </nav>
      )}
    </header>
  )
}
