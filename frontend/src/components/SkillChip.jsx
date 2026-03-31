export default function SkillChip({ skill, variant = 'default', count }) {
  const colors = {
    default: { bg: '#273549', color: '#94a3b8', border: '#334155' },
    green:   { bg: '#14532d33', color: '#22c55e', border: '#22c55e44' },
    red:     { bg: '#7f1d1d33', color: '#ef4444', border: '#ef444444' },
    amber:   { bg: '#78350f33', color: '#f59e0b', border: '#f59e0b44' },
    accent:  { bg: '#312e8133', color: '#6366f1', border: '#6366f144' },
  }
  const { bg, color, border } = colors[variant] || colors.default

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '0.78rem',
      fontWeight: 500,
      background: bg,
      color,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>
      {skill}
      {count != null && (
        <span style={{
          background: color,
          color: '#0f172a',
          borderRadius: '10px',
          padding: '0 5px',
          fontSize: '0.68rem',
          fontWeight: 700,
          minWidth: '18px',
          textAlign: 'center',
        }}>
          {count}
        </span>
      )}
    </span>
  )
}
