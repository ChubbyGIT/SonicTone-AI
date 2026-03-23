import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import SoundWave from '../components/SoundWave.jsx'
import { useTheme } from '../App.jsx'
import aiIcon from '../assets/ai-icon.png'

// Add your band images to src/assets/bands/ named band1.jpg ... band7.jpg
// If you don't have them yet, BAND_IMAGES stays empty and the strip is hidden
const bandModules = import.meta.glob('../assets/bands/*.{jpg,jpeg,png,webp}', { eager: true })
const BAND_IMAGES = Object.values(bandModules).map(m => m.default)

const VST_OPTIONS = [
  'STL Tonality Howard Benson',
  'STL Tonality Andy James',
  'STL Tonality Echotone',
  'STL Tonality Naraic Mac',
  'Neural DSP Archetype Nolly',
  'Neural DSP Archetype Petrucci',
  'Neural DSP Archetype Tim Henson',
  'Neural DSP Archetype Rabea',
  'Neural DSP Archetype Gojira',
  'Neural DSP Archetype Cory Wong',
  'Neural DSP Soldano SLO-100',
  'Neural DSP Tone King Imperial',
  'Neural DSP Nameless Suite',
  'Neural DSP Fortin Nameless',
  'Neural DSP Fortin Cali Suite',
  'Neural DSP Plini',
  'Neural DSP Parallax',
  'Neural DSP Abasi Pathos',
]

const BAND_SUGGESTIONS = [
  'Metallica', 'Periphery', 'Tool', 'Meshuggah', 'Animals as Leaders',
  'Polyphia', 'Intervals', 'Gojira', 'Lamb of God', 'Architects',
]

export default function Home() {
  const navigate = useNavigate()
  const { isDark, setIsDark } = useTheme()
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
    await new Promise(r => setTimeout(r, 500))
    navigate('/chat', { state: { vst: vst || null, band: band.trim() } })
  }

  const bg = isDark ? '#020202' : '#f0ece8'
  const textPrimary = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-white/40' : 'text-gray-500'
  const inputBg = isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
  const inputBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'
  const selectStyle = isDark ? { background: '#111' } : { background: '#f8f5f2' }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: bg }}>

      {/* Mesh Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0">
          <div className="absolute animate-mesh-drift"
            style={{ width: '70vw', height: '70vw', top: '-20%', left: '-15%',
              background: isDark
                ? 'radial-gradient(ellipse, rgba(92,41,17,0.55) 0%, transparent 70%)'
                : 'radial-gradient(ellipse, rgba(177,100,60,0.2) 0%, transparent 70%)',
              borderRadius: '50%' }} />
          <div className="absolute animate-mesh-drift"
            style={{ animationDelay: '-8s', width: '50vw', height: '50vw', bottom: '-10%', right: '-10%',
              background: isDark
                ? 'radial-gradient(ellipse, rgba(3,40,184,0.2) 0%, transparent 70%)'
                : 'radial-gradient(ellipse, rgba(3,40,184,0.08) 0%, transparent 70%)',
              borderRadius: '50%' }} />
        </motion.div>
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px' }} />
      </div>

      {/* Sound wave top */}
      <div className="absolute top-0 left-0 right-0 h-24 opacity-20">
        <SoundWave color={isDark ? '#5C2911' : '#B13A29'} />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={() => setIsDark(d => !d)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
          style={{
            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          }}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke="#FFD700" strokeWidth="2"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* Scrolling Band Strip — only renders if images exist */}
      {BAND_IMAGES.length > 0 && (
        <div className="absolute top-28 left-0 right-0 z-10 overflow-hidden" style={{ height: '120px' }}>
          <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${bg}, transparent)` }} />
          <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to left, ${bg}, transparent)` }} />
          <div className="flex animate-scroll-left" style={{ width: 'max-content' }}>
            {[...BAND_IMAGES, ...BAND_IMAGES].map((img, i) => (
              <div key={i} className="mx-2 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ width: '180px', height: '110px',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
                <img src={img} alt={`band-${i}`}
                  className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
        style={{ paddingTop: BAND_IMAGES.length > 0 ? '10rem' : '0' }}>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-3 flex items-center gap-2"
        >
          <img src={aiIcon} alt="Tony"
            className="w-8 h-8 rounded-full object-cover shadow-[0_0_20px_rgba(177,58,41,0.6)]" />
          <span className={`text-sm font-semibold tracking-[0.2em] uppercase font-display ${textMuted}`}>
            SonicTone AI
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display font-bold text-center leading-none mb-4"
          style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)', letterSpacing: '-0.03em' }}
        >
          <span className={textPrimary}>Your Studio,</span>
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #B13A29 0%, #e05a3a 50%, #B13A29 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Their Soul.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className={`text-center max-w-md mb-12 text-base leading-relaxed ${textMuted}`}
        >
          Dial in the exact tone of your favorite band using Neural DSP and STL Tonality — powered by AI.
        </motion.p>

        {/* Engine Room */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="glass-strong rounded-2xl p-6 relative overflow-hidden"
            style={{ boxShadow: isDark
              ? '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 32px 80px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)' }}>

            {/* Rack screws */}
            <div className="absolute top-3 left-4 w-2 h-2 rounded-full"
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
            <div className="absolute top-3 right-4 w-2 h-2 rounded-full"
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />

            {/* VST Dropdown */}
            <div className="mb-4">
              <label className={`block text-[10px] font-semibold tracking-[0.2em] uppercase mb-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                VST Plugin
              </label>
              <div className="relative">
                <select value={vst} onChange={e => setVst(e.target.value)}
                  className={`w-full appearance-none border rounded-xl px-4 py-3 text-sm outline-none cursor-pointer transition-all duration-200 ${inputBg} ${isDark ? 'text-white/70' : 'text-gray-700'}`}
                  style={{ borderColor: inputBorder, backdropFilter: 'blur(8px)' }}>
                  <option value="" style={selectStyle}>All VSTs (Unrestricted Mode)</option>
                  {VST_OPTIONS.map(v => (
                    <option key={v} value={v} style={selectStyle}>{v}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Band Input */}
            <div className="mb-6">
              <label className={`block text-[10px] font-semibold tracking-[0.2em] uppercase mb-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                Band Name
              </label>
              <input
                type="text"
                placeholder="e.g. Metallica, Periphery, Tool..."
                value={band}
                onChange={e => setBand(e.target.value)}
                onFocus={() => setBandFocused(true)}
                onBlur={() => setBandFocused(false)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all duration-300 ${inputBg} ${isDark ? 'text-white placeholder-white/20' : 'text-gray-800 placeholder-gray-400'}`}
                style={{
                  borderColor: bandFocused ? 'rgba(177,58,41,0.7)' : inputBorder,
                  boxShadow: bandFocused ? '0 0 20px rgba(177,58,41,0.25)' : 'none',
                }}
              />
              {bandFocused && !band && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex flex-wrap gap-1.5">
                  {BAND_SUGGESTIONS.map(b => (
                    <button key={b} onMouseDown={() => setBand(b)}
                      className={`text-[10px] px-2.5 py-1 rounded-full glass transition-all ${isDark ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-800'}`}>
                      {b}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Generate Button */}
            <motion.button
              onClick={handleGenerate}
              disabled={!band.trim() || isGenerating}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-display font-semibold text-sm tracking-wide text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #B13A29 0%, #8a2a1c 100%)',
                boxShadow: band.trim() ? '0 0 30px rgba(177,58,41,0.45), 0 4px 20px rgba(0,0,0,0.4)' : 'none',
              }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Dialing In...
                </span>
              ) : '⚡ Generate Tone'}
            </motion.button>

            <div className="absolute bottom-3 left-4 w-2 h-2 rounded-full"
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
            <div className="absolute bottom-3 right-4 w-2 h-2 rounded-full"
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
          </div>

          <p className={`text-center text-[11px] mt-4 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
            Powered by Tony · RAG + Ollama · STL & NDSP
          </p>
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-20 opacity-20 rotate-180">
        <SoundWave color="#B13A29" />
      </div>
    </div>
  )
}