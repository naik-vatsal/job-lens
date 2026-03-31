import { NavLink } from 'react-router-dom'

const s = {
  nav: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: '64px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    padding: '0 2rem',
    zIndex: 1000,
    gap: '2rem',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#6366f1',
    letterSpacing: '-0.5px',
    marginRight: 'auto',
  },
  link: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: '6px',
    transition: 'color 0.15s, background 0.15s',
  },
  activeLink: {
    color: '#f1f5f9',
    background: '#273549',
  },
}

export default function Navbar() {
  return (
    <nav style={s.nav}>
      <span style={s.logo}>JobLens</span>
      {[
        { to: '/resume',    label: 'Resume'    },
        { to: '/jobs',      label: 'Jobs'      },
        { to: '/analytics', label: 'Analytics' },
      ].map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
