import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  config.headers['X-Correlation-ID'] = crypto.randomUUID()
  return config
})

// Resume — 60s timeout: sentence-transformer is cold on first request
export const uploadResume   = (text)      => api.post('/resume', { text }, { timeout: 60000 })
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

// Career Coach
export const chatWithAgent = (message, resumeId, history = []) =>
  api.post('/agent/chat', { message, resume_id: resumeId, history }, { timeout: 60000 })

// Resume ID persistence
const RESUME_ID_KEY = 'joblens_resume_id'
export const saveResumeId   = (id)  => sessionStorage.setItem(RESUME_ID_KEY, String(id))
export const loadResumeId   = ()    => {
  const v = sessionStorage.getItem(RESUME_ID_KEY)
  return v ? parseInt(v, 10) : null
}
export const clearResumeId  = ()    => sessionStorage.removeItem(RESUME_ID_KEY)

export default api
