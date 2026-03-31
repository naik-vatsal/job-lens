import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  config.headers['X-Correlation-ID'] = crypto.randomUUID()
  return config
})

// Resume
export const uploadResume   = (text)      => api.post('/resume', { text })
export const matchAllJobs   = (resumeId)  => api.post(`/resume/${resumeId}/match-all`)

// Tasks
export const getTaskStatus  = (taskId)    => api.get(`/tasks/${taskId}`)

// Jobs
export const getJobs        = (params)    => api.get('/jobs', { params })
export const getJob         = (jobId, resumeId) =>
  api.get(`/jobs/${jobId}`, { params: resumeId ? { resume_id: resumeId } : {} })

// Matches
export const getMatches     = (params)    => api.get('/matches', { params })

// Analytics
export const getMarketAnalytics  = ()         => api.get('/analytics/market')
export const getResumeAnalytics  = (resumeId) => api.get(`/analytics/resume/${resumeId}`)

// Seed
export const seedJobs = () => api.post('/jobs/seed')

// Resume ID persistence
export const saveResumeId   = (id)  => localStorage.setItem('resumeId', String(id))
export const loadResumeId   = ()    => {
  const v = localStorage.getItem('resumeId')
  return v ? parseInt(v, 10) : null
}
export const clearResumeId  = ()    => localStorage.removeItem('resumeId')

export default api
