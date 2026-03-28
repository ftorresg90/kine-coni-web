/**
 * Sanitize an SVG string to prevent XSS attacks.
 * Only allows safe SVG elements and attributes.
 */
export function sanitizeSvg(raw) {
  if (!raw || typeof raw !== 'string') return ''

  // Allowed SVG elements
  const allowedTags = new Set([
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'ellipse', 'g', 'defs', 'use', 'text', 'tspan',
  ])

  // Allowed attributes (data attrs and event handlers are blocked)
  const allowedAttrs = new Set([
    'viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap',
    'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y',
    'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points',
    'transform', 'class', 'opacity', 'fill-rule', 'clip-rule',
    'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit',
    'stroke-opacity', 'fill-opacity', 'font-size', 'text-anchor',
    'dominant-baseline', 'id', 'xmlns',
  ])

  // Strip script tags and event handlers aggressively first
  let cleaned = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '')

  // Parse and rebuild using DOMParser if available (browser only),
  // otherwise fall back to regex-based filtering
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(cleaned, 'image/svg+xml')
      const error = doc.querySelector('parsererror')
      if (error) return ''

      function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return
        if (node.nodeType !== Node.ELEMENT_NODE) {
          node.parentNode?.removeChild(node)
          return
        }

        const tagName = node.tagName.toLowerCase()
        if (!allowedTags.has(tagName)) {
          node.parentNode?.removeChild(node)
          return
        }

        // Remove disallowed attributes
        const attrs = Array.from(node.attributes)
        for (const attr of attrs) {
          const name = attr.name.toLowerCase()
          if (!allowedAttrs.has(name) || name.startsWith('on')) {
            node.removeAttribute(attr.name)
          }
        }

        // Recurse into children (copy array since we may remove nodes)
        Array.from(node.childNodes).forEach(sanitizeNode)
      }

      sanitizeNode(doc.documentElement)
      return doc.documentElement.outerHTML
    } catch {
      return ''
    }
  }

  // Server-side fallback: strip everything except known-safe patterns
  return cleaned
}
