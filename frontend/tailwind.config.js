/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#020202',
        'glass-white': 'rgba(255,255,255,0.06)',
        'glass-border': 'rgba(255,255,255,0.10)',
        accent: '#0328B8',
        cta: '#B13A29',
        umber: '#5C2911',
        charcoal: '#060403',
        muted: '#8E655B',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        'glow-red': '0 0 40px rgba(177,58,41,0.5)',
        'glow-blue': '0 0 30px rgba(3,40,184,0.4)',
        'glow-red-sm': '0 0 16px rgba(177,58,41,0.3)',
      },
      animation: {
        'mesh-drift': 'meshDrift 22s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'wave': 'wave 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'thinking': 'thinking 1.4s ease-in-out infinite',
      },
      keyframes: {
        meshDrift: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(40px,-25px) scale(1.06)' },
          '66%': { transform: 'translate(-25px,20px) scale(0.94)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.75' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.8)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        thinking: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
}