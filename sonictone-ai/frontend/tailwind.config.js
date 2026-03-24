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
        gold: '#FFD700',
        'gold-metallic': '#D4AF37',
        'gold-24k': '#FFBF00',
        'gold-dim': 'rgba(212,175,55,0.4)',
        accent: '#D4AF37',
        muted: '#8a7a3a',
      },
      fontFamily: {
        sans: ['"Trebuchet MS"', 'Arial', 'Helvetica', 'sans-serif'],
        display: ['Impact', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['"Courier New"', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 30px rgba(212,175,55,0.4)',
        'glow-gold-sm': '0 0 16px rgba(212,175,55,0.3)',
        'glow-gold-intense': '0 0 50px rgba(255,215,0,0.6)',
      },
      animation: {
        'mesh-drift': 'meshDrift 22s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'wave': 'wave 3s ease-in-out infinite',
        'thinking': 'thinking 1.4s ease-in-out infinite',
        'scroll-left': 'scroll-left 30s linear infinite',
      },
    },
  },
  plugins: [],
}