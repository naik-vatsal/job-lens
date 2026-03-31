import { useNavigate } from 'react-router-dom'
import ScoreCard from './ScoreCard.jsx'
import SkillChip from './SkillChip.jsx'
import { loadResumeId } from '../api.js'

function fitBadge(label) {
  if (!label) return null
  const map = {
    'strong fit':  { color: '#22c55e', bg: '#14532d33' },
    'partial fit': { color: '#f59e0b', bg: '#78350f33' },
    'weak fit':    { color: '#ef4444', bg: '#7f1d1d33' },
  }
  const style = map[label] || { color: '#94a3b8', bg: '#27354933' }
  return (
    <span style={{
      ...style,
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {label}
    </span>
  )
}

export default function JobCard({ job }) {
  const navigate  = useNavigate()
  const resumeId  = loadResumeId()

  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9', marginBottom: '3px' }}>
            {job.title}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{job.company}</div>
        </div>
        {job.overall_score != null && (
          <ScoreCard score={job.overall_score} size={58} />
        )}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
        <span>📍 {job.location}</span>
        {job.salary_range && <span>💰 {job.salary_range}</span>}
        {job.posted_at && (
          <span>🗓 {new Date(job.posted_at).toLocaleDateString()}</span>
        )}
      </div>

      {/* Fit label */}
      {job.fit_label && (
        <div>{fitBadge(job.fit_label)}</div>
      )}

      {/* Top matched skills */}
      {job.matched_skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {job.matched_skills.map(s => (
            <SkillChip key={s} skill={s} variant="green" />
          ))}
        </div>
      )}

      {/* Skills (no resume yet) */}
      {!resumeId && job.required_skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
