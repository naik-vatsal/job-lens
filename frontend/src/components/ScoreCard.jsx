function scoreColor(score) {
  if (score == null) return '#94a3b8'
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

export default function ScoreCard({ score, size = 80, label }) {
  const color = scoreColor(score)
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const pct = score != null ? Math.min(100, Math.max(0, score)) / 100 : 0
  const dashOffset = circumference * (1 - pct)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#334155" strokeWidth={6}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text
          x="50%" y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
          fill={color}
          fontSize={size > 60 ? 16 : 12}
          fontWeight="700"
        >
          {score != null ? Math.round(score) : '–'}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
          {label}
        </span>
      )}
    </div>
  )
}
