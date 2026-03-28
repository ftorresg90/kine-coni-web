'use client'

import { useMemo } from 'react'
import { sanitizeSvg } from '@/lib/sanitize'

/**
 * Renders an SVG string safely by sanitizing it first.
 * Use this instead of dangerouslySetInnerHTML for user-provided SVG.
 */
export default function SafeSvg({ html, className }) {
  const cleanHtml = useMemo(() => sanitizeSvg(html), [html])

  if (!cleanHtml) return null

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
  )
}
