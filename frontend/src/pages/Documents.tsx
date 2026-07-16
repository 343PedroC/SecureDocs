import { useEffect, useRef, useState } from 'react'
import {
  FileText, Upload, Download, Search, Loader2, Share2, Trash2,
  FolderPlus, Folder, FolderOpen, X, RotateCcw, History, ChevronRight,
  MoveRight,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { ShareModal } from '../components/documents/ShareModal'
import { VersionHistory } from '../components/documents/VersionHistory'

interface FolderItem {
  id: string
  name: string
  parentId: string | null
  children: { id: string; name: string }[]
}

interface Document {
  id: string
  originalName: string
  mimeType: string
  size: number
  sha256: string
  permission: 'owner' | 'read'
  status: string
  folderId: string | null
  folder: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  versionCount: number
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
  const [trash, setTrash] = useState<Document[]>([])
  const [filtered, setFiltered] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [sharingDoc, setSharingDoc] = useState<Document | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [view, setView] = useState<'active' | 'trash'>('active')
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null | undefined>(undefined)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [versionsDoc, setVersionsDoc] = useState<Document | null>(null)
  const [moveDoc, setMoveDoc] = useState<Document | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFolders = () =>
    api.get('/folders').then((r) => setFolders(r.data)).catch(() => {})

  const loadDocs = () => {
    const params = selectedFolder !== undefined
      ? { folderId: selectedFolder === null ? 'null' : selectedFolder }
      : {}
    return api.get('/documents', { params }).then((r) => {
      setDocs(r.data)
    })
  }

  const loadTrash = () =>
    api.get('/documents/trash').then((r) => setTrash(r.data)).catch(() => {})

  useEffect(() => {
    loadFolders()
    loadDocs()
    loadTrash()
  }, [selectedFolder])

  useEffect(() => {
    const q = search.toLowerCase()
    const source = view === 'active' ? docs : trash
    setFiltered(source.filter((d) => d.originalName.toLowerCase().includes(q)))
  }, [search, docs, trash, view])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setSuccess('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (selectedFolder) form.append('folderId', selectedFolder)
      const res = await api.post('/documents', form)
      const msg = res.data.newVersion
        ? `"${file.name}" actualizado a versión ${res.data.versionNumber}.`
        : `"${file.name}" subido y cifrado correctamente.`
      setSuccess(msg)
      await loadDocs()
      await loadFolders()
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

  const handleDelete = async (doc: Document) => {
    if (!confirm(`¿Eliminar "${doc.originalName}"? Podrás restaurarlo desde la papelera.`)) return
    setDeletingId(doc.id)
    try {
      await api.delete(`/documents/${doc.id}`)
      setSuccess(`"${doc.originalName}" movido a la papelera.`)
      await loadDocs()
      await loadTrash()
    } catch {
      setError('Error al eliminar el documento.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRestore = async (doc: Document) => {
    setRestoringId(doc.id)
    try {
      await api.post(`/documents/${doc.id}/restore`)
      setSuccess(`"${doc.originalName}" restaurado correctamente.`)
      await loadDocs()
      await loadTrash()
      setView('active')
    } catch {
      setError('Error al restaurar el documento.')
    } finally {
      setRestoringId(null)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await api.post('/folders', { name: newFolderName.trim() })
      setNewFolderName('')
      setShowNewFolder(false)
      await loadFolders()
    } catch {
      setError('Error al crear la carpeta.')
    }
  }

  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!confirm(`¿Eliminar carpeta "${folder.name}"? Los documentos quedarán sin carpeta.`)) return
    try {
      await api.delete(`/folders/${folder.id}`)
      if (selectedFolder === folder.id) setSelectedFolder(undefined)
      await loadFolders()
      await loadDocs()
    } catch {
      setError('Error al eliminar la carpeta.')
    }
  }

  const handleLoadVersions = async (doc: Document) => {
    setVersionsDoc(doc)
  }

  const handleMove = async (doc: Document, folderId: string | null) => {
    try {
      await api.patch(`/documents/${doc.id}`, { folderId })
      setMoveDoc(null)
      await loadDocs()
    } catch {
      setError('Error al mover el documento.')
    }
  }

  const canShare = (doc: Document) =>
    doc.permission === 'owner' && user?.role !== 'auditor'

  const canDelete = (doc: Document) => doc.permission === 'owner'

  return (
    <div className="flex gap-6">
      {/* Folder panel */}
      {user?.role !== 'auditor' && (
        <aside className="w-56 shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Carpetas</span>
              <button
                onClick={() => setShowNewFolder(true)}
                title="Nueva carpeta"
                className="rounded p-0.5 hover:bg-gray-200 transition-colors"
              >
                <FolderPlus className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {showNewFolder && (
              <div className="px-3 py-2 border-b border-gray-100 flex gap-2">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') }
                  }}
                  placeholder="Nombre..."
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button onClick={handleCreateFolder} className="text-indigo-600 hover:text-indigo-800">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <ul className="py-1">
              <li>
                <button
                  onClick={() => setSelectedFolder(undefined)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    selectedFolder === undefined ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  Todos los documentos
                </button>
              </li>
              <li>
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    selectedFolder === null ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-gray-400" />
                  Sin carpeta
                </button>
              </li>
              {folders.map((folder) => (
                <li key={folder.id}>
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`group w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      selectedFolder === folder.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-yellow-500" />
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder) }}
                      className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-red-100 transition-all"
                    >
                      <X className="h-3 w-3 text-red-400" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {sharingDoc && (
          <ShareModal
            documentId={sharingDoc.id}
            documentName={sharingDoc.originalName}
            onClose={() => setSharingDoc(null)}
          />
        )}

        {versionsDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Versiones cifradas</h2>
                  <p className="text-xs text-gray-500 truncate">{versionsDoc.originalName}</p>
                </div>
                <button onClick={() => setVersionsDoc(null)} className="rounded p-1 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="px-6 py-4">
                <VersionHistory documentId={versionsDoc.id} documentName={versionsDoc.originalName} />
              </div>
            </div>
          </div>
        )}

        {moveDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Mover documento</h2>
                <button onClick={() => setMoveDoc(null)} className="rounded p-1 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-500 mb-3 truncate">{moveDoc.originalName}</p>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => handleMove(moveDoc, null)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                      Sin carpeta
                    </button>
                  </li>
                  {folders.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => handleMove(moveDoc, f.id)}
                        disabled={moveDoc.folderId === f.id}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        <Folder className="h-4 w-4 text-yellow-500" />
                        {f.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Todos tus documentos se almacenan cifrados con AES-256-GCM
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role !== 'auditor' && (
              <>
                <button
                  onClick={() => { setView('active'); setSearch('') }}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${view === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Activos
                </button>
                <button
                  onClick={() => { setView('trash'); setSearch('') }}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 ${view === 'trash' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Papelera {trash.length > 0 && `(${trash.length})`}
                </button>
              </>
            )}
            {view === 'active' && user?.role !== 'auditor' && (
              <>
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
              </>
            )}
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
              {view === 'trash' ? (
                <>
                  <Trash2 className="h-12 w-12 text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">La papelera está vacía</p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">
                    {docs.length === 0 ? 'No hay documentos todavía' : 'Sin resultados'}
                  </p>
                  {docs.length === 0 && (
                    <p className="text-sm text-gray-400 mt-1">Sube tu primer documento para empezar</p>
                  )}
                </>
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
                    {view === 'active' ? 'Carpeta' : 'Eliminado'}
                  </th>
                  {view === 'active' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permiso
                    </th>
                  )}
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
                            {view === 'active' && (doc as Document).versionCount > 1 && (
                              <span className="ml-2 text-indigo-400">v{(doc as Document).versionCount}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {view === 'active' ? (
                        doc.folder ? (
                          <span className="inline-flex items-center gap-1 text-yellow-600">
                            <Folder className="h-3.5 w-3.5" />
                            {doc.folder.name}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      ) : (
                        new Date(doc.updatedAt).toLocaleDateString()
                      )}
                    </td>
                    {view === 'active' && (
                      <td className="px-6 py-4">
                        <Badge variant={doc.permission === 'owner' ? 'blue' : 'gray'}>
                          {doc.permission === 'owner' ? 'Propietario' : 'Compartido'}
                        </Badge>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {view === 'active' ? (
                          <>
                            {canShare(doc) && (
                              <button
                                onClick={() => setSharingDoc(doc)}
                                title="Compartir"
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-violet-600 hover:bg-violet-50 transition-colors"
                              >
                                <Share2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Compartir</span>
                              </button>
                            )}
                            {canDelete(doc) && folders.length > 0 && (
                              <button
                                onClick={() => setMoveDoc(doc)}
                                title="Mover"
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                <MoveRight className="h-4 w-4" />
                                <span className="hidden sm:inline">Mover</span>
                              </button>
                            )}
                            {doc.versionCount > 1 && (
                              <button
                                onClick={() => handleLoadVersions(doc)}
                                title="Ver versiones"
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                <History className="h-4 w-4" />
                                <span className="hidden sm:inline">Versiones</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              title="Descargar"
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                            >
                              {downloadingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              <span className="hidden sm:inline">Descargar</span>
                            </button>
                            {canDelete(doc) && (
                              <button
                                onClick={() => handleDelete(doc)}
                                disabled={deletingId === doc.id}
                                title="Eliminar"
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                {deletingId === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">Eliminar</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(doc)}
                            disabled={restoringId === doc.id}
                            title="Restaurar"
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
                          >
                            {restoringId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Restaurar
                          </button>
                        )}
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
    </div>
  )
}
