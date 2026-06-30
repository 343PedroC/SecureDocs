import { useEffect, useRef, useState } from 'react'
import { FileText, Upload, Download, Search, Loader2, Share2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { ShareModal } from '../components/documents/ShareModal'

interface Document {
  id: string
  originalName: string
  mimeType: string
  size: number
  sha256: string
  permission: 'owner' | 'read'
  status: string
  createdAt: string
  owner: { id: string; email: string; name: string }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function Documents() {
  const user = useAuthStore((s) => s.user)
  const [docs, setDocs] = useState<Document[]>([])
  const [filtered, setFiltered] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [sharingDoc, setSharingDoc] = useState<Document | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = () =>
    api.get('/documents').then((r) => {
      setDocs(r.data)
      setFiltered(r.data)
    })

  useEffect(() => { loadDocs() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(docs.filter((d) => d.originalName.toLowerCase().includes(q)))
  }, [search, docs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post('/documents', form)
      setSuccess(`"${file.name}" subido y cifrado correctamente.`)
      await loadDocs()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al subir el documento'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDownload = async (doc: Document) => {
    setDownloadingId(doc.id)
    setError('')
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: doc.mimeType }))
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalName
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No tienes permiso para descargar este documento o no fue encontrado.')
    } finally {
      setDownloadingId(null)
    }
  }

  const canShare = (doc: Document) =>
    doc.permission === 'owner' && user?.role !== 'auditor'

  return (
    <div className="space-y-6">
      {sharingDoc && (
        <ShareModal
          documentId={sharingDoc.id}
          documentName={sharingDoc.originalName}
          onClose={() => setSharingDoc(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Todos tus documentos se almacenan cifrados con AES-256-GCM
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            id="file-upload"
          />
          <Button onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="h-4 w-4" />
            Subir documento
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">
              {docs.length === 0 ? 'No hay documentos todavía' : 'Sin resultados'}
            </p>
            {docs.length === 0 && (
              <p className="text-sm text-gray-400 mt-1">Sube tu primer documento para empezar</p>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Tamaño
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permiso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {doc.originalName}
                        </p>
                        <p className="text-xs text-gray-400 truncate hidden sm:block">
                          {doc.mimeType}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {formatBytes(doc.size)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={doc.permission === 'owner' ? 'blue' : 'gray'}>
                      {doc.permission === 'owner' ? 'Propietario' : 'Compartido'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {canShare(doc) && (
                        <button
                          onClick={() => setSharingDoc(doc)}
                          title="Compartir"
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Compartir</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        title="Descargar"
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Descargar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {filtered.length} documento{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
