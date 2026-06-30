import { useEffect, useState } from 'react'
import { Shield, Filter } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

interface AuditLog {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  ipAddress: string | null
  createdAt: string
  actor: { id: string; email: string; name: string } | null
}

const ACTION_COLORS: Record<string, 'blue' | 'green' | 'red' | 'yellow' | 'gray'> = {
  USER_REGISTERED: 'green',
  USER_LOGGED_IN: 'blue',
  DOCUMENT_UPLOADED: 'yellow',
  DOCUMENT_DOWNLOADED: 'blue',
  DOCUMENT_ACCESS_DENIED: 'red',
  DOCUMENT_SHARED: 'green',
  DOCUMENT_UNSHARED: 'gray',
}

const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: 'Registro',
  USER_LOGGED_IN: 'Login',
  DOCUMENT_UPLOADED: 'Subida',
  DOCUMENT_DOWNLOADED: 'Descarga',
  DOCUMENT_ACCESS_DENIED: 'Acceso denegado',
  DOCUMENT_SHARED: 'Compartido',
  DOCUMENT_UNSHARED: 'Acceso revocado',
}

const ACTIONS = Object.keys(ACTION_LABELS)

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (actionFilter) params.set('action', actionFilter)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    api
      .get(`/audit?${params.toString()}`)
      .then((r) => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registro inmutable de todas las acciones del sistema
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-1 text-gray-500 mr-1">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Acción</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Button onClick={load} variant="secondary" size="sm">
          Aplicar
        </Button>
        <Button
          onClick={() => { setActionFilter(''); setFrom(''); setTo(''); setTimeout(load, 0) }}
          variant="ghost"
          size="sm"
        >
          Limpiar
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Shield className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-500">No hay registros con estos filtros</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Entidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Badge variant={ACTION_COLORS[log.action] ?? 'gray'}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {log.actor ? (
                      <div>
                        <p className="text-sm font-medium text-gray-800">{log.actor.name}</p>
                        <p className="text-xs text-gray-400">{log.actor.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {log.entityType ? (
                      <span className="text-sm text-gray-600">
                        {log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden xl:table-cell">
                    <span className="text-sm text-gray-500 font-mono">{log.ipAddress ?? '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{logs.length} registros</p>
      )}
    </div>
  )
}
