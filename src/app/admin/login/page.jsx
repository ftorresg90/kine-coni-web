'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-nude flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-vino rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌸</span>
          </div>
          <h1 className="font-serif text-3xl text-vino mb-2">Panel de Administración</h1>
          <p className="font-sans text-sm text-vino/60">Kinesióloga Constanza Anjarí</p>
        </div>

        <form onSubmit={handleLogin}
          className="bg-white/70 rounded-3xl p-8 shadow-lg border border-rosado/20 space-y-5">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-sans">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block font-sans text-sm font-bold text-vino mb-2">
              Email
            </label>
            <input
              type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email" placeholder="admin@ejemplo.com"
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-vino placeholder-vino/30"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-sans text-sm font-bold text-vino mb-2">
              Contraseña
            </label>
            <input
              type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="current-password" placeholder="••••••••"
              className="form-input w-full bg-white border border-rosado/30 rounded-xl px-4 py-3 font-sans text-vino placeholder-vino/30"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-vino text-nude font-sans font-bold py-3.5 rounded-full hover:bg-vino-light transition-colors shadow-md disabled:opacity-50">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center mt-6 font-sans text-xs text-vino/40">
          <a href="/" className="hover:text-rosado transition-colors">← Volver al sitio</a>
        </p>
      </div>
    </div>
  )
}
