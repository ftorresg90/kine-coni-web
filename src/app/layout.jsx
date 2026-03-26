import './globals.css'

export const metadata = {
  title: 'Klga. Constanza Anjarí | Kinesiología a Domicilio · Viña del Mar',
  description: 'Kinesióloga Constanza Anjarí — Atención a domicilio en Viña del Mar y alrededores. Rehabilitación musculoesquelética, neurológica, adulto mayor y respiratoria.',
  keywords: 'kinesióloga domicilio, viña del mar, rehabilitación, adulto mayor, neurorehabilitación, kinesiología respiratoria',
  openGraph: {
    type: 'website',
    title: 'Klga. Constanza Anjarí | Kinesiología a Domicilio',
    description: 'Atención kinesiológica personalizada a domicilio en Viña del Mar. Rehabilitación musculoesquelética, neurológica, adulto mayor y respiratoria.',
    images: ['/foto-coni.jpg'],
    locale: 'es_CL',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌸</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
