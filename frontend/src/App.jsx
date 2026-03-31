import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar       from './components/Navbar.jsx'
import Resume       from './pages/Resume.jsx'
import JobBoard     from './pages/JobBoard.jsx'
import JobDetail    from './pages/JobDetail.jsx'
import Analytics    from './pages/Analytics.jsx'
import CareerCoach  from './pages/CareerCoach.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ paddingTop: '64px', minHeight: '100vh' }}>
        <Routes>
          <Route path="/"             element={<Navigate to="/resume" replace />} />
          <Route path="/resume"       element={<Resume />} />
          <Route path="/jobs"         element={<JobBoard />} />
          <Route path="/jobs/:id"     element={<JobDetail />} />
          <Route path="/analytics"    element={<Analytics />} />
          <Route path="/coach"        element={<CareerCoach />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
