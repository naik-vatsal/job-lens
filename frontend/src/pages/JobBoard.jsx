import { useState, useEffect, useCallback } from 'react'
import { getJobs, loadResumeId } from '../api.js'
import JobCard from '../components/JobCard.jsx'

const ROLES = ['', 'Backend', 'Full-Stack', 'Data Engineer', 'ML Engineer', 'DevOps', 'Data Scientist']
const LOCATIONS = ['', 'Remote', 'Austin, TX', 'New York, NY', 'San Francisco, CA', 'Seattle, WA']

const selectStyle = {
  background: '#1e293b',
  color: '#f1f5f9',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '0.85rem',
  outline: 'none',
}

export default function JobBoard() {
  const resumeId = loadResumeId()
  const [jobs,     setJobs]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(false)

  const [minScore,  setMinScore]  = useState(0)
  const [role,      setRole]      = useState('')
  const [location,  setLocation]  = useState('')
  const [sortBy,    setSortBy]    = useState(resumeId ? 'score' : 'date')

  const fetchJobs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 20, sort_by: sortBy }
      if (resumeId)  params.resume_id = resumeId
      if (role)      params.role      = role
      if (location)  params.location  = location
      if (resumeId && minScore > 0) params.min_score = minScore
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
  }, [resumeId, role, location, sortBy, minScore])

  useEffect(() => { fetchJobs(1) }, [fetchJobs])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Job Board</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
            {total} jobs {resumeId ? 'matched to your resume' : 'available'}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
        background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
        padding: '16px', marginBottom: '1.5rem',
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
        </select>

        {resumeId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Min score:</span>
            <input
              type="range" min={0} max={90} step={5} value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              style={{ accentColor: '#6366f1', width: '100px' }}
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
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem' }}>Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem' }}>
          No jobs found. {!resumeId && 'Analyze your resume first to see match scores.'}
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
