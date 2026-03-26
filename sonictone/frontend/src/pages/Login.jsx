/**
 * Login.jsx — Authentication Page
 * ---------------------------------
 * Handles both Sign In and Sign Up in a single card with an animated tab toggle.
 *
 * Modes:
 *   'login'  — email + password → supabase.auth.signInWithPassword()
 *   'signup' — name + age + email + password → supabase.auth.signUp()
 *              Supabase sends a verification email; user must confirm before signing in.
 *
 * On successful login → navigates to /home.
 * PublicOnly wrapper in App.jsx redirects already-logged-in users away from this page.
 *
 * Sub-component:
 *   Field — reusable labeled input with gold focus border animation.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import SoundWave from '../components/SoundWave.jsx'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', age: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleLogin = async () => {
    setError('')
    if (!form.email.trim() || !form.password) { setError('Email and password required'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    navigate('/home')
  }

  const handleSignup = async () => {
    setError(''); setMessage('')
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.age || isNaN(form.age) || Number(form.age) < 1) { setError('Enter a valid age'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { name: form.name, age: parseInt(form.age) } }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage('✅ Verification email sent! Check your inbox then sign in.')
    setMode('login')
    setForm(f => ({ ...f, password: '' }))
  }

  const handleSubmit = () => mode === 'login' ? handleLogin() : handleSignup()

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center"
      style={{ background: '#020202' }}>

      {/* Gold mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute animate-mesh-drift"
          style={{ width: '70vw', height: '70vw', top: '-20%', left: '-15%',
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)',
            borderRadius: '50%' }} />
        <div className="absolute animate-mesh-drift"
          style={{ animationDelay: '-8s', width: '50vw', height: '50vw', bottom: '-10%', right: '-10%',
            background: 'radial-gradient(ellipse, rgba(255,215,0,0.08) 0%, transparent 70%)',
            borderRadius: '50%' }} />
      </div>

      <div className="absolute top-0 left-0 right-0 h-20 opacity-20">
        <SoundWave color="#D4AF37" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm px-6 z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #D4AF37)',
              boxShadow: '0 0 40px rgba(255,215,0,0.5)',
            }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M9 18V5l12-2v13" stroke="#020202" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="6" cy="18" r="3" stroke="#020202" strokeWidth="2.5"/>
              <circle cx="18" cy="16" r="3" stroke="#020202" strokeWidth="2.5"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Impact, Arial, sans-serif', fontSize: '2rem', letterSpacing: '0.05em' }}
            className="text-gradient">
            SONIC AI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(212,175,55,0.5)' }}>
            Your Studio, Their Soul.
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-6"
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.15)' }}>

          {/* Tab toggle */}
          <div className="flex rounded-xl p-1 mb-6"
            style={{ background: 'rgba(212,175,55,0.06)' }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                style={{
                  background: mode === m ? 'linear-gradient(135deg, #FFD700, #D4AF37)' : 'transparent',
                  color: mode === m ? '#020202' : 'rgba(212,175,55,0.5)',
                  boxShadow: mode === m ? '0 0 16px rgba(255,215,0,0.3)' : 'none',
                  fontFamily: 'Impact, Arial, sans-serif',
                  letterSpacing: '0.05em',
                }}>
                {m === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} className="space-y-3">

              {mode === 'signup' && (
                <>
                  <Field label="Full Name" type="text" placeholder="e.g. James Hetfield"
                    value={form.name} onChange={v => update('name', v)} />
                  <Field label="Age" type="number" placeholder="e.g. 25"
                    value={form.age} onChange={v => update('age', v)} />
                </>
              )}
              <Field label="Email" type="email" placeholder="you@example.com"
                value={form.email} onChange={v => update('email', v)} />
              <Field label="Password" type="password" placeholder="••••••••"
                value={form.password} onChange={v => update('password', v)} onEnter={handleSubmit} />

              {error && <div className="text-xs px-1" style={{ color: '#ff6b6b' }}>{error}</div>}
              {message && <div className="text-xs px-1" style={{ color: '#4ade80' }}>{message}</div>}

              <motion.button onClick={handleSubmit} disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-bold mt-2 transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #D4AF37)',
                  color: '#020202',
                  boxShadow: '0 0 24px rgba(255,215,0,0.35)',
                  fontFamily: 'Impact, Arial, sans-serif',
                  letterSpacing: '0.08em',
                  fontSize: '0.9rem',
                }}>
                {loading ? 'Please wait...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: 'rgba(212,175,55,0.25)' }}>
          Powered by Sonic · RAG + Ollama · STL & NDSP
        </p>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-20 opacity-20 rotate-180">
        <SoundWave color="#D4AF37" />
      </div>
    </div>
  )
}

function Field({ label, type, placeholder, value, onChange, onEnter }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-1.5"
        style={{ color: 'rgba(212,175,55,0.4)' }}>
        {label}
      </label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: 'rgba(212,175,55,0.04)',
          border: '1px solid rgba(212,175,55,0.15)',
          color: 'white',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(255,215,0,0.5)'}
        onBlur={e => e.target.style.borderColor = 'rgba(212,175,55,0.15)'}
      />
    </div>
  )
}