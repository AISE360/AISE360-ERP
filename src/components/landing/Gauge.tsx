interface GaugeProps {
  value: number
  color?: string
  showLabels?: boolean
  min?: string
  max?: string
}

const TICKS = 40
const CX = 100
const CY = 100
const R = 80
const INNER = R - 10

export default function Gauge({ value, color = '#ef4d23', showLabels, min, max }: GaugeProps) {
  const activeCount = Math.round((value / 100) * TICKS)

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const angle = Math.PI + (i / (TICKS - 1)) * Math.PI
    return {
      x1: CX + INNER * Math.cos(angle),
      y1: CY + INNER * Math.sin(angle),
      x2: CX + R * Math.cos(angle),
      y2: CY + R * Math.sin(angle),
      active: i < activeCount,
    }
  })

  return (
    <div className="w-full">
      <svg viewBox="0 0 200 120" className="w-full" style={{ maxWidth: 260, margin: '0 auto', display: 'block' }}>
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.active ? color : '#d4d4d8'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
        <text x={100} y={105} textAnchor="middle" fontSize={22} fontWeight={600} fill="#111827">
          {value}%
        </text>
      </svg>
      {showLabels && (
        <div className="flex justify-between text-[11px] text-neutral-500" style={{ maxWidth: 260, margin: '0 auto' }}>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
