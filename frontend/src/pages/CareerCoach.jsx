import { useState, useRef, useEffect } from 'react'
import { loadResumeId, chatWithAgent } from '../api.js'

const SUGGESTIONS = [
  'What job should I apply to first?',
  'What skills am I missing most?',
  'How do I improve my match score?',
  'Which companies am I best suited for?',
]

function Message({ role, text }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '16px',
    }}>
      {!isUser && (
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #22c55e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', marginRight: '10px', flexShrink: 0, marginTop: '2px',
        }}>
          ✦
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        background: isUser ? '#6366f1' : '#1e293b',
        border: isUser ? 'none' : '1px solid #334155',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '12px 16px',
        color: '#f1f5f9',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #22c55e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', flexShrink: 0,
      }}>
        ✦
      </div>
      <div style={{
        background: '#1e293b', border: '1px solid #334155',
        borderRadius: '18px 18px 18px 4px', padding: '14px 18px',
        display: 'flex', gap: '6px', alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#6366f1',
            animation: 'bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function CareerCoach() {
  const resumeId = loadResumeId()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: resumeId
        ? "Hi! I'm your Career Coach. I can analyze your resume matches, identify skill gaps, and recommend your next career moves. What would you like to know?"
        : "Hi! I'm your Career Coach. To get personalized advice, please analyze your resume first on the Resume page, then run \"Find Matching Jobs\". Once that's done, come back and I can give you specific recommendations.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text) {
    const question = text || input.trim()
    if (!question || loading) return
    if (!resumeId) {
      setError('Analyze your resume first to get personalized advice.')
      return
    }

    setInput('')
    setError('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.text }))
      const { data } = await chatWithAgent(question, resumeId, history)
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '4px' }}>
          Career Coach
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          AI-powered advice based on your resume, job matches, and market demand.
          {resumeId && <span style={{ color: '#22c55e', marginLeft: '8px' }}>● Resume loaded</span>}
        </p>
      </div>

      {/* Chat window */}
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        height: '520px',
      }}>
        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#334155 transparent',
        }}>
          {messages.map((m, i) => (
            <Message key={i} role={m.role} text={m.text} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips — only before first user message */}
        {messages.length === 1 && resumeId && (
          <div style={{
            padding: '0 20px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '20px',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = '#6366f1'; e.target.style.color = '#f1f5f9' }}
                onMouseLeave={e => { e.target.style.borderColor = '#334155'; e.target.style.color = '#94a3b8' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            margin: '0 20px 8px',
            padding: '8px 14px',
            background: '#7f1d1d33',
            border: '1px solid #ef444444',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '0.82rem',
          }}>
            {error}
          </div>
        )}

        {/* Input */}
        <div style={{
          borderTop: '1px solid #334155',
          padding: '16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={resumeId ? 'Ask anything about your career…' : 'Analyze your resume first…'}
            disabled={loading || !resumeId}
            rows={1}
            style={{
              flex: 1,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '10px',
              color: '#f1f5f9',
              padding: '10px 14px',
              fontSize: '0.9rem',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              maxHeight: '120px',
              overflowY: 'auto',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = '#6366f1')}
            onBlur={e => (e.target.style.borderColor = '#334155')}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim() || !resumeId}
            style={{
              background: '#6366f1',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              opacity: loading || !input.trim() || !resumeId ? 0.4 : 1,
              transition: 'opacity 0.15s',
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
