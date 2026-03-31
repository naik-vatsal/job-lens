import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getMarketAnalytics, getResumeAnalytics, loadResumeId } from '../api.js'
import SkillChip from '../components/SkillChip.jsx'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#38bdf8', '#a78bfa', '#34d399']

const tooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' },
  labelStyle: { color: '#94a3b8' },
  cursor: { fill: '#ffffff08' },
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#f1f5f9' }}>
      {children}
    </h2>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
      padding: '24px', ...style,
    }}>
      {children}
    </div>
  )
}

export default function Analytics() {
  const resumeId = loadResumeId()
  const [market,  setMarket]  = useState(null)
  const [resume,  setResume]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    const fetches = [getMarketAnalytics()]
    if (resumeId) fetches.push(getResumeAnalytics(resumeId))

    Promise.all(fetches)
      .then(([mRes, rRes]) => {
        setMarket(mRes.data)
        if (rRes) setResume(rRes.data)
      })
      .catch(() => setError('Failed to load analytics. Run match-all first to generate data.'))
      .finally(() => setLoading(false))
  }, [resumeId])

  if (loading) return (
    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '5rem' }}>Loading analytics…</div>
  )
  if (error) return (
    <div style={{
      maxWidth: '600px', margin: '4rem auto', padding: '20px',
      background: '#7f1d1d33', border: '1px solid #ef444444',
      borderRadius: '10px', color: '#ef4444', textAlign: 'center',
    }}>
      {error}
    </div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>Analytics Dashboard</h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Market intelligence and {resumeId ? 'personalized resume insights' : 'aggregate trends'}.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Top in-demand skills */}
        {market?.top_skills?.length > 0 && (
          <Card style={{ gridColumn: '1 / -1' }}>
            <SectionTitle>Top 20 In-Demand Skills</SectionTitle>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={market.top_skills}
                layout="vertical"
                margin={{ left: 100, right: 20, top: 0, bottom: 0 }}
              >
                <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="skill" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {market.top_skills.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Score distribution */}
        {market?.score_distribution?.length > 0 && (
          <Card>
            <SectionTitle>Score Distribution</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={market.score_distribution} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <XAxis dataKey="bucket" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Top roles market */}
        {market?.top_roles?.length > 0 && (
          <Card>
            <SectionTitle>Best Matching Role Types (Market)</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={market.top_roles.slice(0, 8)}
                layout="vertical"
                margin={{ left: 120, right: 20, top: 0, bottom: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="role" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="avg_score" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Company insights */}
        {market?.company_insights?.length > 0 && (
          <Card>
            <SectionTitle>Top Companies by Fit</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={market.company_insights}
                layout="vertical"
                margin={{ left: 90, right: 20, top: 0, bottom: 0 }}
              >
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="company" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="avg_score" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ── Personal resume analytics ── */}
        {resume && (
          <>
            {/* Stat cards */}
            <Card style={{ display: 'flex', gap: '20px' }}>
              {[
                { label: 'Avg Match Score', value: `${resume.avg_match_score}%`, color: '#6366f1' },
                { label: 'Jobs Analyzed',   value: resume.jobs_analyzed,        color: '#22c55e' },
                { label: 'Score Percentile', value: `Top ${Math.round(100 - resume.score_percentile)}%`, color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>{label}</div>
                </div>
              ))}
            </Card>

            {/* Skill gaps */}
            {resume.skill_gaps?.length > 0 && (
              <Card>
                <SectionTitle>Your Top Skill Gaps</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {resume.skill_gaps.map(({ skill, count }) => (
                    <SkillChip key={skill} skill={skill} variant="red" count={count} />
                  ))}
                </div>
              </Card>
            )}

            {/* Best roles for resume */}
            {resume.best_roles?.length > 0 && (
              <Card style={{ gridColumn: '1 / -1' }}>
                <SectionTitle>Your Best Matching Roles</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={resume.best_roles}
                    layout="vertical"
                    margin={{ left: 140, right: 20, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="role" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} width={140} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="avg_score" fill="#6366f1" radius={[0, 4, 4, 0]}>
                      {resume.best_roles.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}

        {!resumeId && (
          <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              No resume analyzed yet.
            </div>
            <div style={{ color: '#6366f1', fontSize: '0.9rem' }}>
              Go to the Resume page, paste your resume, and run "Find Matching Jobs" to unlock personal analytics.
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
