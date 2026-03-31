import { useNavigate } from 'react-router-dom'
import ScoreCard from './ScoreCard.jsx'
import SkillChip from './SkillChip.jsx'
import { loadResumeId } from '../api.js'

function scoreColor(score) {
  if (score == null) return '#6366f1'
  if (score >= 65) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function fitBadge(label) {
  if (!label) return null
  const map = {
    'strong fit':  { color: '#22c55e', bg: '#14532d33', border: '#22c55e33' },
    'partial fit': { color: '#f59e0b', bg: '#78350f33', border: '#f59e0b33' },
    'weak fit':    { color: '#ef4444', bg: '#7f1d1d33', border: '#ef444433' },
  }
  const style = map[label] || { color: '#94a3b8', bg: '#27354933', border: '#33415533' }
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: 600,
      textTransform: 'capitalize',
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
    }}>
      {label}
    </span>
  )
}

export default function JobCard({ job }) {
  const navigate = useNavigate()
  const resumeId = loadResumeId()
  const color    = scoreColor(job.overall_score)

  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s, box-shadow 0.18s',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#6366f1'
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 8px 30px #6366f122'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#334155'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: '1rem', color: '#f1f5f9',
            marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {job.title}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{job.company}</div>
        </div>
        {job.overall_score != null && (
          <ScoreCard score={job.overall_score} size={54} />
        )}
      </div>

      {/* Score progress bar */}
      {job.overall_score != null && (
        <div>
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{ width: `${job.overall_score}%`, background: color }}
            />
          </div>
        </div>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem', color: '#64748b' }}>
        <span>📍 {job.location}</span>
        {job.salary_range && <span>💰 {job.salary_range}</span>}
        {job.posted_at && (
          <span>🗓 {new Date(job.posted_at).toLocaleDateString()}</span>
        )}
      </div>

      {/* Fit label */}
      {job.fit_label && <div>{fitBadge(job.fit_label)}</div>}

      {/* Matched skills (green) */}
      {job.matched_skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {job.matched_skills.map(s => (
            <SkillChip key={s} skill={s} variant="green" />
          ))}
        </div>
      )}

      {/* Missing skills (red) */}
      {job.missing_skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {job.missing_skills.map(s => (
            <SkillChip key={s} skill={s} variant="red" />
          ))}
        </div>
      )}

      {/* Skills when no resume */}
      {!resumeId && job.required_skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {job.required_skills.slice(0, 4).map(s => (
            <SkillChip key={s} skill={s} />
          ))}
          {job.required_skills.length > 4 && (
            <SkillChip skill={`+${job.required_skills.length - 4} more`} />
          )}
        </div>
      )}
    </div>
  )
}
