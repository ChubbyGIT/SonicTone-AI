export default function SoundWave({ color = '#5C2911', bars = 40 }) {
  return (
    <div className="w-full h-full flex items-center justify-center gap-[3px] px-4">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = (i * 0.08) % 1.4
        const height = 20 + Math.sin(i * 0.7) * 40 + Math.cos(i * 0.4) * 20
        return (
          <div
            key={i}
            className="rounded-full animate-wave"
            style={{
              width: '3px',
              height: `${Math.max(8, height)}%`,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${1.2 + (i % 5) * 0.2}s`,
              opacity: 0.5 + Math.sin(i * 0.5) * 0.3,
            }}
          />
        )
      })}
    </div>
  )
}