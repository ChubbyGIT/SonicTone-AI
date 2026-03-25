import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import SoundWave from '../components/SoundWave.jsx'
import { useTheme } from '../App.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useChat } from '../hooks/useChat.js'
import { VST_OPTIONS_FULL } from '../constants/vst.js'
import aiIcon from '../assets/ai-icon.png'

const bandModules = import.meta.glob('../assets/bands/*.{jpg,jpeg,png,webp}', { eager: true })
const BAND_IMAGES = Object.values(bandModules).map(m => m.default)

const BAND_SUGGESTIONS = [
  'Metallica', 'Periphery', 'Tool', 'Meshuggah', 'Animals as Leaders',
  'Polyphia', 'Intervals', 'Gojira', 'Lamb of God', 'Architects',
]

export default function Home() {
  const navigate = useNavigate()
  const { isDark, setIsDark } = useTheme()
  const { user, signOut } = useAuth()
  const { createChat } = useChat(user)
  const [vst, setVst] = useState('')
  const [band, setBand] = useState('')
  const [bandFocused, setBandFocused] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 })
  const bgX = useTransform(springX, [-1, 1], [-8, 8])
  const bgY = useTransform(springY, [-1, 1], [-5, 5])

  useEffect(() => {
    const handleMouse = (e) => {
      mouseX.set((e.clientX / window.innerWidth) * 2 - 1)
      mouseY.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  const handleGenerate = async () => {
    if (!band.trim()) return
    setIsGenerating(true)
    const id = await createChat(vst || null, band.trim())
    setIsGenerating(false)
    if (id) navigate(`/chat/${id}`, {
      state: { vst: vst || null, band: band.trim(), fromHome: true }
    })
  }

  const userName = user?.user_metadata?.name || 'Guitarist'

  const bg = isDark ? '#020202' : '#0e0b00'
  const cardBg = isDark ? 'rgba(212,175,55,0.04)' : 'rgba(212,175,55,0.06)'
  const inputBorder = isDark ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.2)'
  const inputBorderFocus = 'rgba(255,215,0,0.5)'
  const inputBg = 'rgba(212,175,55,0.04)'
  const mutedColor = isDark ? 'rgba(212,175,55,0.4)' : 'rgba(212,175,55,0.5)'
  const selectOptBg = isDark ? '#111' : '#1a1500'

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: bg }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0">
          <div className="absolute animate-mesh-drift"
            style={{
              width: '70vw', height: '70vw', top: '-20%', left: '-15%',
              background: 'radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
          <div className="absolute animate-mesh-drift"
            style={{
              animationDelay: '-8s', width: '55vw', height: '55vw',
              bottom: '-10%', right: '-10%',
              background: 'radial-gradient(ellipse, rgba(255,215,0,0.07) 0%, transparent 70%)',
              borderRadius: '50%',
            }} />
        </motion.div>

        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }} />
      </div>

      <div className="absolute top-0 left-0 right-0 h-20 opacity-25">
        <SoundWave color="#D4AF37" />
      </div>

      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #D4AF37)',
              color: '#020202',
              fontFamily: 'Impact, Arial, sans-serif',
            }}>
            {userName[0]?.toUpperCase()}
          </div>
          <span className="text-xs" style={{ color: 'rgba(212,175,55,0.6)' }}>
            {userName}
          </span>
        </div>

        <button onClick={() => setIsDark(d => !d)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}>
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="#FFD700" strokeWidth="2"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        <button onClick={signOut}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
          title="Sign out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
              stroke="rgba(212,175,55,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FFD700, #D4AF37)', boxShadow: '0 0 30px rgba(255,215,0,0.4)' }}>
            <img src={aiIcon} alt="Sonic" className="w-7 h-7 rounded-full object-cover" />
          </div>
          <span style={{ fontFamily: 'Impact, Arial, sans-serif', fontSize: '1rem', letterSpacing: '0.3em', color: 'rgba(212,175,55,0.5)' }}>
            SONIC AI
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-center leading-none mb-4"
          style={{
            fontFamily: 'Impact, Arial, sans-serif',
            fontSize: 'clamp(2.8rem, 7vw, 6rem)',
            background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #FFBF00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          YOUR STUDIO,<br />THEIR SOUL.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: cardBg,
              border: '1px solid rgba(212,175,55,0.15)',
              backdropFilter: 'blur(28px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            }}
          >
            <div className="mb-4">
              <label className="block text-[10px] font-semibold tracking-[0.25em] uppercase mb-2"
                style={{ color: mutedColor, fontFamily: 'Impact, Arial, sans-serif' }}>
                VST PLUGIN
              </label>
              <select
                value={vst} onChange={e => setVst(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: 'rgba(255,215,0,0.7)' }}
              >
                {VST_OPTIONS_FULL.map(v => (
                  <option key={v.value} value={v.value} style={{ background: selectOptBg }}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-semibold tracking-[0.25em] uppercase mb-2"
                style={{ color: mutedColor, fontFamily: 'Impact, Arial, sans-serif' }}>
                BAND NAME
              </label>
              <input
                type="text" placeholder="e.g. Metallica, Periphery..."
                value={band} onChange={e => setBand(e.target.value)}
                onFocus={() => setBandFocused(true)} onBlur={() => setBandFocused(false)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: inputBg, border: `1px solid ${bandFocused ? inputBorderFocus : inputBorder}`, color: '#FFD700' }}
              />
            </div>

            <motion.button
              onClick={handleGenerate}
              disabled={!band.trim() || isGenerating}
              className="w-full py-3.5 rounded-xl font-bold tracking-wide transition-all"
              style={{
                background: band.trim() ? 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)' : 'rgba(212,175,55,0.15)',
                color: '#020202',
                fontFamily: 'Impact, Arial, sans-serif',
              }}
            >
              {isGenerating ? 'CREATING...' : '⚡ GENERATE TONE'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}