import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Shield, Users, Upload } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

interface Document {
  id: string
  originalName: string
  size: number
  createdAt: string
}

interface AuditLog {
  id: string
  action: string
  createdAt: string
  actor?: { name: string; email: string }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const [docs, setDocs] = useState<Document[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    if (user?.role !== 'auditor') {
      api.get('/documents').then((r) => setDocs(r.data)).catch(() => {})
    }
    if (user?.role === 'admin' || user?.role === 'auditor') {
      api.get('/audit?limit=5').then((r) => setLogs(r.data.slice(0, 5))).catch(() => {})
    }
  }, [user])

  const cards = [
    {
      title: 'Mis documentos',
      value: docs.length,
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      show: user?.role !== 'auditor',
      href: '/documents',
    },
    {
      title: 'Auditoría',
      value: logs.length > 0 ? 'Activa' : '—',
      icon: Shield,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      show: user?.role === 'admin' || user?.role === 'auditor',
      href: '/audit',
    },
    {
      title: 'Usuarios',
      value: '—',
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      show: user?.role === 'admin',
      href: '/users',
    },
  ].filter((c) => c.show)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Plataforma de gestión segura de documentos confidenciales
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.href}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`rounded-xl p-3 ${card.bg}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user?.role !== 'auditor' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Documentos recientes</h2>
              <Link to="/documents" className="text-sm text-indigo-600 hover:underline">
                Ver todos
              </Link>
            </div>
            {docs.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No hay documentos aún</p>
                <Link to="/documents" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
                  Subir primer documento
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {docs.slice(0, 5).map((doc) => (
                  <li key={doc.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{doc.originalName}</span>
                    </div>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">{formatBytes(doc.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(user?.role === 'admin' || user?.role === 'auditor') && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Actividad reciente</h2>
              <Link to="/audit" className="text-sm text-indigo-600 hover:underline">
                Ver auditoría
              </Link>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin actividad reciente</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <li key={log.id} className="py-3">
                    <p className="text-sm font-medium text-gray-700">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-400">
                      {log.actor?.name ?? 'Sistema'} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
