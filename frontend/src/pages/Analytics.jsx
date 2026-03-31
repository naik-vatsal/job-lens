import { useEffect, useRef, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getMarketAnalytics, getResumeAnalytics, loadResumeId, chatWithAgent } from '../api.js'
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

const COACH_SUGGESTIONS = [
  'What job should I apply to first?',
  'What skills am I missing most?',
  'How do I improve my match score?',
  'Which companies am I best suited for?',
]

function CoachPanel({ resumeId, onClose }) {
  const [messages,  setMessages]  = useState([{
    role: 'assistant',
    text: resumeId
      ? "Hi! I'm your Career Coach. Ask me anything about your matches, skill gaps, or next career moves."
      : "Hi! To get personalised advice, analyze your resume first, then run \"Find Matching Jobs\".",
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const msg = text || input.trim()
    if (!msg || loading || !resumeId) return
    setInput('')
    setError('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, content: m.text }))
      const { data } = await chatWithAgent(msg, resumeId, history)
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } catch (err) {
      setError(err?.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div style={{
      position: 'fixed', bottom: '80px', right: '24px', zIndex: 1000,
      width: '380px', maxHeight: '520px',
      background: '#0f172a', border: '1px solid #334155',
      borderRadius: '16px', boxShadow: '0 24px 64px #00000088',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeUp 0.2s ease',
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes dot { 0%,60%,100% { transform:translateY(0);opacity:.4 } 30% { transform:translateY(-5px);opacity:1 } }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
          }}>✦</div>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f1f5f9' }}>Career Coach</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8',
          fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
            {m.role === 'assistant' && (
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, marginRight: '8px', marginTop: '2px',
                background: 'linear-gradient(135deg, #6366f1, #22c55e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
              }}>✦</div>
            )}
            <div style={{
              maxWidth: '82%', padding: '9px 13px', fontSize: '0.85rem', lineHeight: 1.55,
              color: '#f1f5f9', whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? '#6366f1' : '#1e293b',
              border: m.role === 'user' ? 'none' : '1px solid #334155',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #22c55e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
            }}>✦</div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', display: 'flex', gap: '5px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', animation: 'dot 1.2s infinite', animationDelay: `${i*0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && resumeId && (
        <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {COACH_SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} disabled={loading} style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: '20px',
              color: '#94a3b8', fontSize: '0.73rem', padding: '4px 12px', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.target.style.borderColor='#6366f1'; e.target.style.color='#f1f5f9' }}
            onMouseLeave={e => { e.target.style.borderColor='#334155'; e.target.style.color='#94a3b8' }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ margin: '0 14px 8px', padding: '7px 12px', background: '#7f1d1d33', border: '1px solid #ef444444', borderRadius: '8px', color: '#ef4444', fontSize: '0.78rem' }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{ borderTop: '1px solid #334155', padding: '12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={resumeId ? 'Ask your coach…' : 'Analyze resume first…'}
          disabled={loading || !resumeId}
          rows={1}
          style={{
            flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
            color: '#f1f5f9', padding: '8px 12px', fontSize: '0.85rem',
            resize: 'none', outline: 'none', maxHeight: '80px', overflowY: 'auto',
          }}
          onFocus={e => (e.target.style.borderColor = '#6366f1')}
          onBlur={e => (e.target.style.borderColor = '#334155')}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px' }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim() || !resumeId}
          style={{
            background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', flexShrink: 0,
            opacity: loading || !input.trim() || !resumeId ? 0.4 : 1,
          }}
        >↑</button>
      </div>
    </div>
  )
}

export default function Analytics() {
  const resumeId = loadResumeId()
  const [market,  setMarket]  = useState(null)
  const [resume,  setResume]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [coachOpen, setCoachOpen] = useState(false)

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

  // Derive summary stats from resume data
  const strongCount = market?.score_distribution?.find(b => b.bucket === '71-85' || b.bucket === '86-100')
  const topGap = resume?.skill_gaps?.[0]?.skill

  return (
    <div className="page-enter" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '4px' }}>Analytics Dashboard</h1>
          <p style={{ color: '#94a3b8' }}>
            Market intelligence and {resumeId ? 'personalized resume insights' : 'aggregate trends'}.
          </p>
        </div>
        <button
          onClick={() => setCoachOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: coachOpen ? 'linear-gradient(135deg, #4f46e5, #166534)' : 'linear-gradient(135deg, #312e81, #1e3a5f)',
            border: `1px solid ${coachOpen ? '#6366f1' : '#6366f144'}`,
            borderRadius: '10px',
            color: coachOpen ? '#fff' : '#a5b4fc',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: '0.88rem',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = coachOpen ? '#6366f1' : '#6366f144'; e.currentTarget.style.color = coachOpen ? '#fff' : '#a5b4fc' }}
        >
          ✦ {coachOpen ? 'Close Coach' : 'Career Coach'}
        </button>
      </div>

      {/* Summary card */}
      {resume && (
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #1a2a3a)',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          alignItems: 'center',
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your snapshot</div>
            <div style={{ fontSize: '1.05rem', color: '#f1f5f9', lineHeight: 1.6 }}>
              Matched <span style={{ color: '#22c55e', fontWeight: 700 }}>{resume.jobs_analyzed}</span> jobs
              {topGap && <>, top skill gap is <span style={{ color: '#f59e0b', fontWeight: 700 }}>{topGap}</span></>}
              {resume.avg_match_score > 0 && <>, avg score <span style={{ color: '#6366f1', fontWeight: 700 }}>{resume.avg_match_score}%</span></>}.
            </div>
          </div>
          {[
            { label: 'Avg Score',      value: `${resume.avg_match_score}%`,                       color: '#6366f1' },
            { label: 'Jobs Analyzed',  value: resume.jobs_analyzed,                               color: '#22c55e' },
            { label: 'Percentile',     value: `Top ${Math.round(100 - resume.score_percentile)}%`, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

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

      {/* Floating Coach button (FAB) */}
      <button
        onClick={() => setCoachOpen(o => !o)}
        title="Career Coach"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #22c55e)',
          border: 'none', color: '#fff', fontSize: '1.3rem',
          boxShadow: '0 8px 32px #6366f155',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 12px 40px #6366f188' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.boxShadow = '0 8px 32px #6366f155' }}
      >
        {coachOpen ? '×' : '✦'}
      </button>

      {/* Coach panel */}
      {coachOpen && <CoachPanel resumeId={resumeId} onClose={() => setCoachOpen(false)} />}
    </div>
  )
}
