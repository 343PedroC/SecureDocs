import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// Document version types
export interface EncryptedVersion {
  id: string
  versionNumber: number
  originalName: string
  mimeType: string
  size: number
  sha256: string
  createdAt: string
  encryptionIv: string
  encryptionAuthTag: string
  storageKey: string
}

// Document version APIs
export const documentVersionAPI = {
  getVersions: (documentId: string) =>
    api.get<EncryptedVersion[]>(`/documents/${documentId}/versions`),

  downloadVersion: (documentId: string, versionId: string) =>
    api.get(`/documents/${documentId}/versions/${versionId}/download`, {
      responseType: 'blob',
    }),

  getVersionMetadata: (documentId: string) =>
    api.get<EncryptedVersion[]>(`/documents/${documentId}/versions`),
}
