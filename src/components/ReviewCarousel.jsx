'use client'

import { useState, useEffect, useCallback } from 'react'

export default function ReviewCarousel({ reviews }) {
  const [current, setCurrent] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const slidesVisible = useCallback(() => {
    if (!mounted || typeof window === 'undefined') return 1
    if (window.innerWidth >= 1024) return 3
    if (window.innerWidth >= 640) return 2
    return 1
  }, [mounted])

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
    if (!mounted) return
    const timer = setInterval(() => {
      setCurrent(prev => {
        const max = maxIndex()
        return prev + 1 > max ? 0 : prev + 1
      })
    }, 6000)
    return () => clearInterval(timer)
  }, [mounted, maxIndex])

  return (
    <div className="relative overflow-hidden fade-up">
      <div
        className="review-track flex gap-6"
        style={{ transform: `translateX(-${mounted ? current * (100 / slidesVisible()) : 0}%)`, transition: 'transform 0.5s ease-out' }}
      >
        {reviews.map((review) => (
          <div key={review.id}
            className="review-slide w-full max-w-full sm:w-[calc(50%_-_12px)] lg:w-[calc(33.333%_-_16px)] bg-nude rounded-3xl p-8 border border-rosado/20 shadow-sm flex-shrink-0 relative overflow-hidden">
            <div className="flex gap-1 mb-4">
              <span className="text-rosado text-lg">{'★'.repeat(review.rating)}</span>
            </div>
            <p className="font-sans text-vino/80 leading-relaxed mb-6 italic">
              &ldquo;{review.content}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rosado/30 flex items-center justify-center font-serif font-bold text-vino">
                {review.author_name.charAt(0)}
              </div>
              <div>
                <p className="font-sans font-bold text-vino text-sm">{review.author_name}</p>
                <p className="font-sans text-xs text-vino/50">{review.author_subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 mt-8">
        <button onClick={() => goTo(current - 1)} aria-label="Anterior reseña"
          className="w-10 h-10 rounded-full border-2 border-rosado text-rosado flex items-center justify-center hover:bg-rosado hover:text-white transition-colors">
          ‹
        </button>
        <div className="flex gap-2 items-center">
          {Array.from({ length: maxIndex() + 1 }).map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Ir a reseña ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-vino' : 'bg-rosado/40'}`} />
          ))}
        </div>
        <button onClick={() => goTo(current + 1)} aria-label="Siguiente reseña"
          className="w-10 h-10 rounded-full border-2 border-rosado text-rosado flex items-center justify-center hover:bg-rosado hover:text-white transition-colors">
          ›
        </button>
      </div>
    </div>
  )
}
