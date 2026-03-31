import { useState, useEffect, useCallback } from 'react'
import { getJobs, loadResumeId } from '../api.js'
import JobCard from '../components/JobCard.jsx'

const ROLES     = ['', 'Backend', 'Full-Stack', 'Data Engineer', 'ML Engineer', 'DevOps', 'Data Scientist']
const LOCATIONS = ['', 'Remote', 'Austin, TX', 'New York, NY', 'San Francisco, CA', 'Seattle, WA']

const FIT_FILTERS = [
  { key: '',            label: 'All' },
  { key: 'strong fit',  label: 'Strong Fit' },
  { key: 'partial fit', label: 'Partial Fit' },
  { key: 'weak fit',    label: 'Weak Fit' },
]

const selectStyle = {
  background: '#1e293b',
  color: '#f1f5f9',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '0.85rem',
  outline: 'none',
}

function FitFilterButton({ active, label, onClick }) {
  const colors = {
    'All':         { active: '#6366f1', border: '#6366f1' },
    'Strong Fit':  { active: '#22c55e', border: '#22c55e' },
    'Partial Fit': { active: '#f59e0b', border: '#f59e0b' },
    'Weak Fit':    { active: '#ef4444', border: '#ef4444' },
  }
  const c = colors[label] || colors['All']

  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '0.82rem',
        fontWeight: 600,
        border: `1px solid ${active ? c.border : '#334155'}`,
        background: active ? `${c.active}22` : 'transparent',
        color: active ? c.active : '#94a3b8',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
      <div className="skeleton" style={{ width: '60%', height: '18px', marginBottom: '8px' }} />
      <div className="skeleton" style={{ width: '40%', height: '14px', marginBottom: '16px' }} />
      <div className="skeleton" style={{ width: '100%', height: '5px', borderRadius: '99px', marginBottom: '12px' }} />
      <div style={{ display: 'flex', gap: '6px' }}>
        <div className="skeleton" style={{ width: '60px', height: '22px', borderRadius: '20px' }} />
        <div className="skeleton" style={{ width: '80px', height: '22px', borderRadius: '20px' }} />
        <div className="skeleton" style={{ width: '50px', height: '22px', borderRadius: '20px' }} />
      </div>
    </div>
  )
}

export default function JobBoard() {
  const resumeId = loadResumeId()
  const [jobs,      setJobs]      = useState([])
  const [total,     setTotal]     = useState(0)
  const [pages,     setPages]     = useState(1)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(false)
  const [fitFilter, setFitFilter] = useState('')
  const [minScore,  setMinScore]  = useState(0)
  const [role,      setRole]      = useState('')
  const [location,  setLocation]  = useState('')
  const [sortBy,    setSortBy]    = useState(resumeId ? 'score' : 'date')

  const fetchJobs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 20, sort_by: sortBy }
      if (resumeId)  params.resume_id  = resumeId
      if (role)      params.role       = role
      if (location)  params.location   = location
      if (resumeId && minScore > 0)   params.min_score  = minScore
      if (resumeId && fitFilter)      params.fit_label  = fitFilter
      const { data } = await getJobs(params)
      setJobs(data.jobs)
      setTotal(data.total)
      setPages(data.pages)
      setPage(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [resumeId, role, location, sortBy, minScore, fitFilter])

  useEffect(() => { fetchJobs(1) }, [fetchJobs])

  return (
    <div className="page-enter" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Job Board</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
            {total} jobs {resumeId ? 'matched to your resume' : 'available'}
          </p>
        </div>
      </div>

      {/* Fit filter pills — only when resume is loaded */}
      {resumeId && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {FIT_FILTERS.map(f => (
            <FitFilterButton
              key={f.key}
              label={f.label}
              active={fitFilter === f.key}
              onClick={() => setFitFilter(f.key)}
            />
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
        background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
        padding: '14px 16px', marginBottom: '1.5rem',
      }}>
        <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle}>
          {ROLES.map(r => <option key={r} value={r}>{r || 'All Roles'}</option>)}
        </select>

        <select value={location} onChange={e => setLocation(e.target.value)} style={selectStyle}>
          {LOCATIONS.map(l => <option key={l} value={l}>{l || 'All Locations'}</option>)}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          {resumeId && <option value="score">Sort: Best Match</option>}
          <option value="date">Sort: Newest</option>
          <option value="salary">Sort: Salary</option>
        </select>

        {resumeId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Min score:</span>
            <input
              type="range" min={0} max={90} step={5} value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              style={{ accentColor: '#6366f1', width: '90px' }}
            />
            <span style={{ color: '#f1f5f9', fontSize: '0.85rem', minWidth: '28px' }}>{minScore}</span>
          </div>
        )}

        <button
          onClick={() => fetchJobs(1)}
          style={{
            marginLeft: 'auto', background: '#6366f1', color: '#fff',
            border: 'none', borderRadius: '8px', padding: '8px 20px',
            fontWeight: 600, fontSize: '0.85rem',
          }}
        >
          Apply
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          textAlign: 'center', color: '#94a3b8', padding: '5rem',
          background: '#1e293b', borderRadius: '12px', border: '1px solid #334155',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: '6px', color: '#f1f5f9' }}>No jobs found</div>
          <div style={{ fontSize: '0.88rem' }}>
            {!resumeId
              ? 'Analyze your resume first to see match scores.'
              : 'Try adjusting your filters.'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}>
          {jobs.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2rem' }}>
          <button
            onClick={() => fetchJobs(page - 1)}
            disabled={page === 1}
            style={{
              background: '#1e293b', color: page === 1 ? '#334155' : '#f1f5f9',
              border: '1px solid #334155', borderRadius: '8px',
              padding: '8px 16px', cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            Page {page} of {pages}
          </span>
          <button
            onClick={() => fetchJobs(page + 1)}
            disabled={page === pages}
            style={{
              background: '#1e293b', color: page === pages ? '#334155' : '#f1f5f9',
              border: '1px solid #334155', borderRadius: '8px',
              padding: '8px 16px', cursor: page === pages ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
