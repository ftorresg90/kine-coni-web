# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MVP landing page (single-page) for kinesiologist Constanza Anjarí. Static site — no build step required. Open `index.html` directly in a browser or deploy the folder root to Netlify / Vercel.

## Stack

- **HTML5** — single file: `index.html`
- **Tailwind CSS** — loaded via CDN (`https://cdn.tailwindcss.com`), configured inline with a `tailwind.config` script block. No PostCSS or build pipeline.
- **Vanilla JavaScript** — all interactivity is in the `<script>` block at the bottom of `index.html`, organized into IIFE sections.
- **Google Fonts** — Playfair Display (headings) + Lato (body), loaded via `<link>` in `<head>`.

## Design tokens (defined in the Tailwind config script)

| Token | Hex | Usage |
|-------|-----|-------|
| `nude` | `#F5E6E8` | Page background |
| `nude-dark` | `#EDD5D9` | Hover backgrounds, placeholders |
| `rosado` | `#C9848F` | Accents, icons, borders |
| `rosado-dark` | `#A96370` | Hover state of rosado |
| `vino` | `#5D2A33` | Primary text, buttons, headings |
| `vino-light` | `#7A3D48` | Hover state of vino |

## Page sections (by anchor ID)

| ID | Section |
|----|---------|
| `#inicio` | Hero with photo, headline, CTAs |
| `#servicios` | 4 service cards (musculoesquelética, neurorehabilitación, adulto mayor, respiratoria) |
| `#resenas` | Testimonials carousel (3 reviews, auto-plays every 6 s) |
| `#reserva` | Booking form — on submit opens WhatsApp with pre-filled message |
| `#contacto` | Footer with contact info and zone coverage |

## Key JS behaviours (all in the `<script>` block)

1. **Navbar** — adds `.scrolled` class (blur + shadow) after 40 px scroll.
2. **Mobile menu** — toggled by `#menu-btn`, closed by `closeMobileMenu()` on link click.
3. **Carousel** — `#review-track` slides via `translateX`. Responsive: 1/2/3 slides visible at sm/md/lg. Auto-play pauses on hover.
4. **Booking form** — client-side validation; on success, opens `wa.me` with URL-encoded pre-filled data and disables the form.
5. **Fade-up animations** — `IntersectionObserver` adds `.visible` class when `.fade-up` elements enter the viewport.
6. **Date input** — min set to today on page load.

## Contact details embedded in the code

- WhatsApp: `+56982927833` — appears in the floating button, footer link, and the form's `wa.me` URL.
- Email: `klga.conianjari@gmail.com` — footer `mailto:` link.
- Zone: Viña del Mar, Valparaíso, Quilpué.

## Hero photo

The `<img id="hero-photo">` has an empty `src`. To add the real photo:
1. Place the image file in the project root (e.g. `foto-coni.webp`).
2. Set `src="foto-coni.webp"` and remove the `hidden` class from the `<img>`.
3. The `#photo-placeholder` div will auto-hide once the image loads (handled by the `onerror` fallback logic — invert the display logic if needed).

## Deployment

Drop the project folder on Netlify or Vercel — no build command, no output directory needed. The single `index.html` is the deployable artifact.
