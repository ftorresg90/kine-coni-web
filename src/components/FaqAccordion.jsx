'use client'

import { useState } from 'react'

export default function FaqAccordion({ faqs }) {
  const [openId, setOpenId] = useState(null)

  const toggle = (id) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="space-y-3 fade-up">
      {faqs.map((faq) => (
        <div key={faq.id} className={`faq-item bg-white/60 rounded-2xl border border-rosado/20 overflow-hidden ${openId === faq.id ? 'open' : ''}`}>
          <button
            onClick={() => toggle(faq.id)}
            className="faq-trigger w-full text-left px-6 py-5 flex justify-between items-center gap-4"
          >
            <span className="font-sans font-bold text-vino text-sm md:text-base">{faq.question}</span>
            <span className="faq-icon text-rosado text-2xl font-light flex-shrink-0">+</span>
          </button>
          <div className={`faq-answer px-6 font-sans text-sm text-vino/70 leading-relaxed ${openId === faq.id ? 'open' : ''}`}>
            <p className="pb-5">{faq.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
