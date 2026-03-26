'use client'

import { useEffect } from 'react'

export default function FadeUpObserver() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el))

    return () => obs.disconnect()
  }, [])

  return null
}
