import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadResume, matchAllJobs, getTaskStatus, saveResumeId, loadResumeId } from '../api.js'
import SkillChip from '../components/SkillChip.jsx'

const POLL_INTERVAL = 2000

export default function Resume() {
  const navigate  = useNavigate()
  const [text,    setText]    = useState('')
  const [skills,  setSkills]  = useState([])
  const [resumeId, setResumeId] = useState(loadResumeId())
  const [loading, setLoading] = useState(false)
  const [matching, setMatching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error,   setError]   = useState('')
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function handleAnalyze() {
    if (!text.trim()) { setError('Paste your resume text first.'); return }
    setError('')
    setLoading(true)
    try {
      const { data } = await uploadResume(text)
      setResumeId(data.resume_id)
      setSkills(data.parsed_skills)
      saveResumeId(data.resume_id)
    } catch {
      setError('Failed to analyze resume. Make sure the API is running.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMatchAll() {
    setMatching(true)
    setProgress(0)
    setError('')
    try {
      const { data } = await matchAllJobs(resumeId)
      const taskId = data.task_id
      pollRef.current = setInterval(async () => {
        try {
          const { data: t } = await getTaskStatus(taskId)
          setProgress(t.percent || 0)
          if (t.status === 'complete') {
            clearInterval(pollRef.current)
            navigate('/jobs')
          } else if (t.status === 'failed') {
            clearInterval(pollRef.current)
            setError('Matching task failed.')
            setMatching(false)
          }
        } catch { /* keep polling */ }
      }, POLL_INTERVAL)
    } catch {
      setError('Failed to start matching job.')
      setMatching(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>
        Analyze Your Resume
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Paste your resume below to extract skills and find matching jobs using semantic AI.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste your resume text here…"
        rows={14}
        style={{
          width: '100%',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          color: '#f1f5f9',
          padding: '16px',
          fontSize: '0.9rem',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.15s',
          lineHeight: 1.7,
        }}
        onFocus={e  => (e.target.style.borderColor = '#6366f1')}
        onBlur={e   => (e.target.style.borderColor = '#334155')}
        disabled={loading || matching}
      />

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '10px 16px',
          background: '#7f1d1d33',
          border: '1px solid #ef444444',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
        <button
          onClick={handleAnalyze}
          disabled={loading || matching}
          style={{
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontWeight: 600,
            fontSize: '0.9rem',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Analyzing…' : 'Analyze Resume'}
        </button>

        {resumeId && !matching && (
          <button
            onClick={handleMatchAll}
            style={{
              background: '#273549',
              color: '#6366f1',
              border: '1px solid #6366f144',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.target.style.background = '#312e8133')}
            onMouseLeave={e => (e.target.style.background = '#273549')}
          >
            Find Matching Jobs
          </button>
        )}
      </div>

      {/* Progress bar */}
      {matching && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
            <span>Scoring jobs with AI…</span>
            <span>{progress}%</span>
          </div>
          <div style={{ background: '#273549', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #22c55e)',
              borderRadius: '8px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Parsed skills */}
      {skills.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>
            Detected Skills
            <span style={{ marginLeft: '8px', color: '#94a3b8', fontWeight: 400, fontSize: '0.85rem' }}>
              ({skills.length} found)
            </span>
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {skills.map(s => <SkillChip key={s} skill={s} variant="accent" />)}
          </div>
        </div>
      )}
    </div>
  )
}
