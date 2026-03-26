/**
 * SoundWave.jsx — Animated Equaliser/Sound-Wave Decoration
 * ----------------------------------------------------------
 * A purely decorative component that renders a row of animated bars resembling
 * a sound wave or equaliser visualizer. Used as ambient decoration on the
 * Login and Home pages (top/bottom strips).
 *
 * Props:
 *   color {string}  — CSS color for the bars (default: '#5C2911')
 *   bars  {number}  — number of bars to render (default: 40)
 *
 * Animation:
 *   Each bar has a `scaleY` keyframe animation ('animate-wave' from index.css)
 *   with a staggered delay and slightly varying duration calculated from the
 *   bar index, so adjacent bars animate in a flowing wave-like pattern.
 *   Height and opacity are also varied using sin/cos of the index to create
 *   a natural, non-uniform look.
 */

export default function SoundWave({ color = '#5C2911', bars = 40 }) {
  return (
    <div className="w-full h-full flex items-center justify-center gap-[3px] px-4">
      {Array.from({ length: bars }).map((_, i) => {
        // Stagger the animation delay across bars so they don't all pulse together
        const delay = (i * 0.08) % 1.4

        // Vary the height using sine/cosine of the index for an organic wave shape
        const height = 20 + Math.sin(i * 0.7) * 40 + Math.cos(i * 0.4) * 20

        return (
          <div
            key={i}
            className="rounded-full animate-wave"
            style={{
              width:             '3px',
              height:            `${Math.max(8, height)}%`, // floor at 8% so no bar disappears
              background:        color,
              animationDelay:    `${delay}s`,
              animationDuration: `${1.2 + (i % 5) * 0.2}s`, // slight speed variation per bar
              opacity:           0.5 + Math.sin(i * 0.5) * 0.3, // subtle opacity variation
            }}
          />
        )
      })}
    </div>
  )
}