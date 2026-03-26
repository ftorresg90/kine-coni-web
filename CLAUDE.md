# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Full-stack CMS for kinesiologist Constanza Anjarí. Public landing page + admin dashboard with Supabase backend.

## Stack

- **Next.js 16** — App Router, `src/` directory structure
- **Tailwind CSS v4** — configured via `@theme inline` in `globals.css`
- **Supabase** — Auth (email/password), PostgreSQL database, Row Level Security
- **Google Fonts** — Playfair Display (headings) + Lato (body)

## Design tokens (defined in `src/app/globals.css`)

| Token | Hex | Usage |
|-------|-----|-------|
| `nude` | `#F5E6E8` | Page background |
| `nude-dark` | `#EDD5D9` | Hover backgrounds |
| `rosado` | `#C9848F` | Accents, icons, borders |
| `rosado-dark` | `#A96370` | Hover state of rosado |
| `vino` | `#5D2A33` | Primary text, buttons |
| `vino-light` | `#7A3D48` | Hover state of vino |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |

## File Structure

```
src/
├── app/
│   ├── globals.css          <- Tailwind v4 theme + custom CSS
│   ├── layout.jsx           <- Root layout (SEO, fonts)
│   ├── page.jsx             <- Public landing (server component)
│   └── admin/
│       ├── layout.jsx       <- Admin sidebar (client)
│       ├── page.jsx         <- Dashboard home (server)
│       ├── login/page.jsx   <- Login form (client)
│       ├── servicios/page.jsx
│       ├── resenas/page.jsx
│       ├── faq/page.jsx
│       ├── perfil/page.jsx
│       └── reservas/page.jsx
├── components/
│   ├── Navbar.jsx           <- Scroll + mobile menu
│   ├── ReviewCarousel.jsx   <- Testimonials slider
│   ├── FaqAccordion.jsx     <- FAQ expand/collapse
│   ├── BookingForm.jsx      <- Form → Supabase + WhatsApp
│   ├── WhatsAppButton.jsx   <- Floating button
│   └── FadeUpObserver.jsx   <- Intersection observer animations
├── lib/supabase/
│   ├── client.js            <- Browser Supabase client
│   └── server.js            <- Server Supabase client
└── middleware.js             <- Auth guard for /admin/*
```

## Database

Schema in `supabase/schema.sql`. Tables: `services`, `reviews`, `faqs`, `profile`, `bookings`.

## Setup

1. Create Supabase project at https://supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Create admin user in Supabase Auth dashboard
4. Set `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `npm install && npm run dev`

## Contact details

- WhatsApp: `56982927833`
- Email: `klga.conianjari@gmail.com`
- Zone: Viña del Mar, Valparaíso, Quilpué, Con Con, Villa Alemana
