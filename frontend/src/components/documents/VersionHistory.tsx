import { useState, useEffect } from 'react'
import { documentVersionAPI } from '../../lib/api'
import type { EncryptedVersion } from '../../lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface VersionHistoryProps {
  documentId: string
  documentName: string
}

export function VersionHistory({ documentId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<EncryptedVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadVersions()
  }, [documentId])

  const loadVersions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await documentVersionAPI.getVersions(documentId)
      setVersions(response.data)
    } catch (err) {
      setError('Error cargando el historial de versiones')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadVersion = async (versionId: string, versionName: string) => {
    try {
      const response = await documentVersionAPI.downloadVersion(documentId, versionId)
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', versionName)
      document.body.appendChild(link)
      link.click()
      link.parentElement?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading version:', err)
      alert('Error descargando la versión')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: es,
    })
  }

  if (loading) return <div className="p-4 text-center">Cargando historial...</div>

  if (error) return <div className="p-4 text-red-600 text-center">{error}</div>

  if (versions.length === 0)
    return <div className="p-4 text-center text-gray-500">No hay versiones anteriores</div>

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Historial de Versiones ({versions.length})</h3>

      <div className="space-y-2">
        {versions.map((version) => (
          <div key={version.id} className="border rounded-lg overflow-hidden">
            {/* Version header */}
            <button
              onClick={() =>
                setExpandedId(expandedId === version.id ? null : version.id)
              }
              className="w-full px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <div>
                  <p className="font-medium text-sm">
                    v{version.versionNumber} - {version.originalName}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(version.createdAt)}</p>
                </div>
              </div>
              <div className="text-right mr-2">
                <p className="text-sm font-medium">{formatFileSize(version.size)}</p>
              </div>
              <svg
                className={`w-5 h-5 transition-transform ${
                  expandedId === version.id ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {/* Expanded encryption details */}
            {expandedId === version.id && (
              <div className="bg-gray-50 px-4 py-4 border-t space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Encryption Info */}
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs font-semibold text-blue-900 mb-2">🔐 INFORMACIÓN DE ENCRIPTACIÓN</p>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-gray-600">Algoritmo:</p>
                        <p className="font-mono text-gray-900">AES-256-GCM</p>
                      </div>
                      <div>
                        <p className="text-gray-600">IV (Initialization Vector):</p>
                        <p className="font-mono text-gray-900 break-all text-xs">
                          {version.encryptionIv}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Auth Tag:</p>
                        <p className="font-mono text-gray-900 break-all text-xs">
                          {version.encryptionAuthTag}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* File Integrity */}
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs font-semibold text-green-900 mb-2">✓ INTEGRIDAD DEL ARCHIVO</p>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-gray-600">Hash SHA-256:</p>
                        <p className="font-mono text-gray-900 break-all text-xs">
                          {version.sha256}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ubicación:</p>
                        <p className="font-mono text-gray-900 break-all text-xs">
                          {version.storageKey}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tipo MIME:</p>
                        <p className="font-mono text-gray-900">{version.mimeType}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs font-semibold text-purple-900 mb-2">📋 METADATOS</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Tamaño:</p>
                      <p className="font-mono">{formatFileSize(version.size)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Versión:</p>
                      <p className="font-mono">v{version.versionNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Creada:</p>
                      <p className="font-mono">{new Date(version.createdAt).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">ID:</p>
                      <p className="font-mono truncate">{version.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleDownloadVersion(version.id, version.originalName)
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded text-sm"
                  >
                    Descargar Versión
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
