import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJob, loadResumeId } from '../api.js'
import ScoreCard from '../components/ScoreCard.jsx'
import SkillChip from '../components/SkillChip.jsx'

function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color }}>{Math.round(value)}%</span>
      </div>
      <div style={{ background: '#273549', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: color,
          borderRadius: '8px',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function fitBadgeFull(label) {
  const map = {
    'strong fit':  { color: '#22c55e', bg: '#14532d33', border: '#22c55e44' },
    'partial fit': { color: '#f59e0b', bg: '#78350f33', border: '#f59e0b44' },
    'weak fit':    { color: '#ef4444', bg: '#7f1d1d33', border: '#ef444444' },
  }
  const { color, bg, border } = map[label] || { color: '#94a3b8', bg: '#27354933', border: '#33415544' }
  return (
    <span style={{
      padding: '4px 14px',
      borderRadius: '14px',
      fontSize: '0.82rem',
      fontWeight: 700,
      textTransform: 'capitalize',
      color, background: bg, border: `1px solid ${border}`,
    }}>
      {label}
    </span>
  )
}

export default function JobDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const resumeId  = loadResumeId()
  const [job,     setJob]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getJob(id, resumeId)
      .then(({ data }) => setJob(data))
      .catch(() => setError('Failed to load job.'))
      .finally(() => setLoading(false))
  }, [id, resumeId])

  if (loading) return (
    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '5rem' }}>Loading…</div>
  )
  if (error || !job) return (
    <div style={{ textAlign: 'center', color: '#ef4444', padding: '5rem' }}>{error || 'Job not found.'}</div>
  )

  const m = job.match

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', color: '#6366f1',
          fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        ← Back to board
      </button>

      {/* Title block */}
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
        padding: '24px', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>{job.title}</h1>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <span>🏢 {job.company}</span>
              <span>📍 {job.location}</span>
              {job.salary_range && <span>💰 {job.salary_range}</span>}
              {job.posted_at && (
                <span>🗓 {new Date(job.posted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              )}
            </div>
          </div>
          {m && <ScoreCard score={m.overall_score} size={90} />}
        </div>
        {m && <div style={{ marginTop: '12px' }}>{fitBadgeFull(m.fit_label)}</div>}
      </div>

      {/* Match breakdown */}
      {m && (
        <div style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
          padding: '24px', marginBottom: '16px',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Match Breakdown</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <ProgressBar label="Semantic Similarity" value={m.semantic_score}   color="#6366f1" />
            <ProgressBar label="Keyword Match"       value={m.keyword_score}    color="#22c55e" />
            <ProgressBar label="AI Classifier"       value={m.classifier_score} color="#f59e0b" />
          </div>

          {/* Experience gap */}
          {m.experience_gap !== 0 && (
            <div style={{
              padding: '10px 16px',
              background: m.experience_gap > 0 ? '#7f1d1d33' : '#14532d33',
              border: `1px solid ${m.experience_gap > 0 ? '#ef444444' : '#22c55e44'}`,
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: m.experience_gap > 0 ? '#ef4444' : '#22c55e',
              marginBottom: '16px',
            }}>
              {m.experience_gap > 0
                ? `Experience gap: ${m.experience_gap} years short of requirements`
                : `Over-qualified by ${Math.abs(m.experience_gap)} years`}
            </div>
          )}

          {/* Summary */}
          <div style={{
            background: '#273549', borderRadius: '8px', padding: '14px 16px',
            fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.7,
          }}>
            {m.summary}
          </div>
        </div>
      )}

      {/* Skills columns */}
      {m && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px',
        }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#22c55e', marginBottom: '12px' }}>
              Matched Skills ({m.matched_skills?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {m.matched_skills?.length > 0
                ? m.matched_skills.map(s => <SkillChip key={s} skill={s} variant="green" />)
                : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None detected</span>
              }
            </div>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ef4444', marginBottom: '12px' }}>
              Missing Skills ({m.missing_skills?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {m.missing_skills?.length > 0
                ? m.missing_skills.map(s => <SkillChip key={s} skill={s} variant="red" />)
                : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None missing</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* Job description */}
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '24px',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Job Description</h2>
        <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
          {job.job_description}
        </p>

        {!m && (
          <div style={{
            marginTop: '16px', padding: '12px 16px',
            background: '#312e8133', border: '1px solid #6366f144',
            borderRadius: '8px', color: '#6366f1', fontSize: '0.85rem',
          }}>
            Analyze your resume on the Resume page to see match scores for this job.
          </div>
        )}
      </div>
    </div>
  )
}
