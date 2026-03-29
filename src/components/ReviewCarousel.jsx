'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export default function ReviewCarousel({ reviews }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef(null)

  const slidesVisible = useCallback(() => {
    if (typeof window === 'undefined') return 1
    if (window.innerWidth >= 1024) return 3
    if (window.innerWidth >= 640) return 2
    return 1
  }, [])

  const maxIndex = useCallback(() => {
    return Math.max(0, reviews.length - slidesVisible())
  }, [reviews.length, slidesVisible])

  const goTo = useCallback((index) => {
    setCurrent(Math.max(0, Math.min(index, maxIndex())))
  }, [maxIndex])

  useEffect(() => {
    if (!mounted) return
    const handleResize = () => goTo(0)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mounted, goTo])

  useEffect(() => {
    if (!mounted || paused) return

    // Respect prefers-reduced-motion: stop auto-play
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const timer = setInterval(() => {
      setCurrent(prev => {
        const max = maxIndex()
        return prev + 1 > max ? 0 : prev + 1
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [mounted, maxIndex, paused])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(current - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(current + 1)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden fade-up"
      role="region"
      aria-label="Carrusel de reseñas de pacientes"
      aria-roledescription="carrusel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget)) {
          setPaused(false)
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="review-track flex gap-6"
        aria-live={paused ? 'polite' : 'off'}
        style={{ transform: `translateX(-${mounted ? current * (100 / slidesVisible()) : 0}%)`, transition: 'transform 0.5s ease-out' }}
      >
        {reviews.map((review, index) => (
          <div key={review.id}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`Reseña ${index + 1} de ${reviews.length}: ${review.author_name}`}
            className="review-slide w-full max-w-full sm:w-[calc(50%_-_12px)] lg:w-[calc(33.333%_-_16px)] bg-nude rounded-3xl p-8 border border-rosado/20 shadow-sm flex-shrink-0 relative overflow-hidden">
            <div className="flex gap-1 mb-4" aria-label={`${review.rating} de 5 estrellas`}>
              <span className="text-rosado text-lg" aria-hidden="true">{'★'.repeat(review.rating)}</span>
            </div>
            <p className="font-sans text-vino/80 leading-relaxed mb-6 italic">
              &ldquo;{review.content}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rosado/30 flex items-center justify-center font-serif font-bold text-vino" aria-hidden="true">
                {review.author_name.charAt(0)}
              </div>
              <div>
                <p className="font-sans font-bold text-vino text-sm">{review.author_name}</p>
                <p className="font-sans text-xs text-vino/70">{review.author_subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 mt-8">
        <button onClick={() => goTo(current - 1)} aria-label="Reseña anterior"
          disabled={current === 0}
          className="w-10 h-10 rounded-full border-2 border-rosado text-rosado flex items-center justify-center hover:bg-rosado hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <span aria-hidden="true">&#8249;</span>
        </button>
        <div className="flex gap-2 items-center" role="tablist" aria-label="Indicadores de reseña">
          {Array.from({ length: maxIndex() + 1 }).map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              role="tab"
              aria-selected={i === current}
              aria-label={`Ir a grupo de reseñas ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-vino' : 'bg-rosado/40 hover:bg-rosado/60'}`} />
          ))}
        </div>
        <button onClick={() => goTo(current + 1)} aria-label="Siguiente reseña"
          disabled={current >= maxIndex()}
          className="w-10 h-10 rounded-full border-2 border-rosado text-rosado flex items-center justify-center hover:bg-rosado hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <span aria-hidden="true">&#8250;</span>
        </button>
      </div>
    </div>
  )
}
