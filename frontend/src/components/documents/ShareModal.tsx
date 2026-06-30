import { useEffect, useRef, useState } from 'react'
import { X, Share2, UserMinus, Loader2, Search } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'

interface Permission {
  id: string
  permission: 'owner' | 'read'
  user: { id: string; email: string; name: string; role: string }
}

interface UserResult {
  id: string
  email: string
  name: string
}

interface Props {
  documentId: string
  documentName: string
  onClose: () => void
}

export function ShareModal({ documentId, documentName, onClose }: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sharing, setSharingId] = useState<string | null>(null)
  const [revoking, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPermissions = () =>
    api.get(`/documents/${documentId}/permissions`)
      .then((r) => setPermissions(r.data))
      .catch(() => {})

  useEffect(() => { loadPermissions() }, [documentId])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setSearching(true)
    searchTimeout.current = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => setSearchResults(r.data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 350)
  }, [searchQuery])

  const handleShare = async (email: string) => {
    setError('')
    setSuccess('')
    setSharingId(email)
    try {
      const res = await api.post(`/documents/${documentId}/share`, { email })
      setSuccess(res.data.message)
      setSearchQuery('')
      setSearchResults([])
      await loadPermissions()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al compartir'))
    } finally {
      setSharingId(null)
    }
  }

  const handleRevoke = async (userId: string) => {
    setError('')
    setSuccess('')
    setRevokingId(userId)
    try {
      const res = await api.delete(`/documents/${documentId}/share/${userId}`)
      setSuccess(res.data.message)
      await loadPermissions()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Error al revocar'))
    } finally {
      setRevokingId(null)
    }
  }

  const alreadySharedIds = new Set(permissions.map((p) => p.user.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="font-semibold text-gray-900">Compartir documento</h2>
              <p className="text-xs text-gray-400 truncate max-w-64">{documentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {/* Buscador de usuarios */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Agregar usuario
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por email o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {searchResults.length > 0 && (
              <ul className="mt-1 rounded-lg border border-gray-200 bg-white shadow-md overflow-hidden">
                {searchResults.map((u) => {
                  const already = alreadySharedIds.has(u.id)
                  return (
                    <li
                      key={u.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      {already ? (
                        <Badge variant="blue">Ya tiene acceso</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={sharing === u.email}
                          onClick={() => handleShare(u.email)}
                        >
                          Compartir
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {searchQuery.trim() && !searching && searchResults.length === 0 && (
              <p className="mt-2 text-xs text-gray-400 text-center">Sin resultados para "{searchQuery}"</p>
            )}
          </div>

          {/* Lista de permisos actuales */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Usuarios con acceso ({permissions.length})
            </h3>
            {permissions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Solo tú tienes acceso a este documento</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                {permissions.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2.5 bg-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{p.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge variant={p.permission === 'owner' ? 'blue' : 'gray'}>
                        {p.permission === 'owner' ? 'Propietario' : 'Lectura'}
                      </Badge>
                      {p.permission !== 'owner' && (
                        <button
                          onClick={() => handleRevoke(p.user.id)}
                          disabled={revoking === p.user.id}
                          title="Revocar acceso"
                          className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          {revoking === p.user.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <UserMinus className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}
