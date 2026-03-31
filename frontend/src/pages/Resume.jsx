import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadResume, matchAllJobs, getTaskStatus, saveResumeId, loadResumeId, clearResumeId } from '../api.js'
import SkillChip from '../components/SkillChip.jsx'

const POLL_INTERVAL = 2000

const STEPS = ['Upload', 'Analyze', 'Match', 'Results']

function StepBar({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
      {STEPS.map((label, i) => {
        const done    = i < active
        const current = i === active
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 700,
                background: done ? '#6366f1' : current ? '#312e81' : '#1e293b',
                border: `2px solid ${done || current ? '#6366f1' : '#334155'}`,
                color: done || current ? '#fff' : '#94a3b8',
                transition: 'all 0.3s ease',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 500,
                color: done || current ? '#f1f5f9' : '#94a3b8',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 8px', marginBottom: '20px',
                background: done ? '#6366f1' : '#334155',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SkeletonChips() {
  return (
    <div style={{ marginTop: '2rem' }}>
      <div className="skeleton" style={{ width: '140px', height: '18px', marginBottom: '12px' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {[80, 60, 100, 70, 90, 55, 75].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: `${w}px`, height: '26px', borderRadius: '20px' }} />
        ))}
      </div>
    </div>
  )
}

export default function Resume() {
  const navigate   = useNavigate()
  const [text,     setText]     = useState('')
  const [skills,   setSkills]   = useState([])
  const [resumeId, setResumeId] = useState(loadResumeId())
  const [showForm, setShowForm] = useState(!loadResumeId())
  const [loading,  setLoading]  = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [matching, setMatching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState('')
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  const activeStep = matching ? 2 : (resumeId && !showForm) ? 2 : loading ? 1 : 0

  async function handleAnalyze() {
    if (!text.trim()) { setError('Paste your resume text first.'); return }
    setError('')
    setRetrying(false)
    setLoading(true)
    try {
      const { data } = await uploadResume(text)
      saveResumeId(data.resume_id)
      setResumeId(data.resume_id)
      setSkills(data.parsed_skills)
      setShowForm(false)
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')
      if (isTimeout) {
        setRetrying(true)
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
          const { data } = await uploadResume(text)
          saveResumeId(data.resume_id)
          setResumeId(data.resume_id)
          setSkills(data.parsed_skills)
          setShowForm(false)
          return
        } catch {
          setError('Request timed out. The API may still be loading — please try again in a moment.')
        }
      } else {
        setError('Failed to analyze resume. Make sure the API is running.')
      }
    } finally {
      setLoading(false)
      setRetrying(false)
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

  function handleReanalyze() {
    clearInterval(pollRef.current)
    clearResumeId()
    setResumeId(null)
    setSkills([])
    setText('')
    setProgress(0)
    setMatching(false)
    setError('')
    setShowForm(true)
  }

  return (
    <div className="page-enter" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '4px' }}>
        Analyze Your Resume
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Paste your resume below to extract skills and find matching jobs using semantic AI.
      </p>

      <StepBar active={activeStep} />

      {/* ── Already-analyzed banner ── */}
      {resumeId && !showForm && (
        <div style={{
          background: 'linear-gradient(135deg, #14532d18, #0f172a)',
          border: '1px solid #22c55e33',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: '#22c55e', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '12px', color: '#0f172a', fontWeight: 700,
            }}>✓</div>
            <span style={{ fontWeight: 600, color: '#22c55e' }}>Resume analyzed</span>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Resume #{resumeId}</span>
          </div>

          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {skills.map(s => <SkillChip key={s} skill={s} variant="accent" />)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!matching && (
              <button
                onClick={handleMatchAll}
                style={{
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                Find Matching Jobs
              </button>
            )}
            <button
              onClick={handleReanalyze}
              disabled={matching}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 24px',
                fontWeight: 600,
                fontSize: '0.9rem',
                opacity: matching ? 0.5 : 1,
              }}
            >
              Re-analyze
            </button>
          </div>

          {matching && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', color: '#94a3b8' }}>
                <span>Scoring {progress < 100 ? 'jobs with AI…' : 'complete!'}</span>
                <span style={{ fontWeight: 600, color: '#6366f1' }}>{progress}%</span>
              </div>
              <div className="score-bar-track">
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #6366f1, #22c55e)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Submission form ── */}
      {showForm && (
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 24px #00000033',
        }}>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '10px', fontWeight: 500 }}>
            Resume text
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your resume text here…"
            rows={13}
            style={{
              width: '100%',
              background: '#0f172a',
              border: '1px solid #273549',
              borderRadius: '8px',
              color: '#f1f5f9',
              padding: '14px',
              fontSize: '0.88rem',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.15s',
              lineHeight: 1.7,
            }}
            onFocus={e  => (e.target.style.borderColor = '#6366f1')}
            onBlur={e   => (e.target.style.borderColor = '#273549')}
            disabled={loading}
          />

          <div style={{ marginTop: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleAnalyze}
              disabled={loading}
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
              {retrying ? 'Retrying…' : loading ? 'Analyzing…' : 'Analyze Resume'}
            </button>
            {loading && (
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                {retrying
                  ? 'Retrying automatically…'
                  : 'This may take up to 60 s on first run while the AI model warms up…'}
              </span>
            )}
          </div>
        </div>
      )}

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

      {/* Skeleton while analyzing */}
      {loading && <SkeletonChips />}

      {/* Parsed skills after fresh analysis (form still visible) */}
      {showForm && !loading && skills.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: '#f1f5f9' }}>
            Detected Skills
            <span style={{ marginLeft: '8px', color: '#94a3b8', fontWeight: 400, fontSize: '0.82rem' }}>
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
