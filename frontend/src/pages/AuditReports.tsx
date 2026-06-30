import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, FileText, User, Loader2, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { Alert } from '../components/ui/Alert'

interface SummaryData {
  total: number
  byAction: Record<string, number>
  byDay: { date: string; count: number }[]
}

const ACTION_LABELS: Record<string, string> = {
  USER_REGISTERED: 'Registros',
  USER_LOGGED_IN: 'Inicios de sesión',
  DOCUMENT_UPLOADED: 'Documentos subidos',
  DOCUMENT_DOWNLOADED: 'Documentos descargados',
  DOCUMENT_ACCESS_DENIED: 'Accesos denegados',
  DOCUMENT_SHARED: 'Compartidos',
  DOCUMENT_UNSHARED: 'Compartición revocada',
  DOCUMENT_DELETED: 'Documentos eliminados',
  DOCUMENT_RESTORED: 'Documentos restaurados',
  DOCUMENT_VERSION_CREATED: 'Nuevas versiones',
  DOCUMENT_MOVED: 'Documentos movidos',
  FOLDER_CREATED: 'Carpetas creadas',
  FOLDER_DELETED: 'Carpetas eliminadas',
  USER_ROLE_CHANGED: 'Cambios de rol',
  USER_DISABLED: 'Usuarios desactivados',
  USER_ENABLED: 'Usuarios activados',
  PROFILE_UPDATED: 'Perfiles actualizados',
  PASSWORD_CHANGED: 'Contraseñas cambiadas',
}

const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_UPLOADED: 'bg-indigo-500',
  DOCUMENT_DOWNLOADED: 'bg-green-500',
  DOCUMENT_ACCESS_DENIED: 'bg-red-500',
  DOCUMENT_SHARED: 'bg-violet-500',
  USER_LOGGED_IN: 'bg-blue-500',
  USER_REGISTERED: 'bg-teal-500',
  DOCUMENT_DELETED: 'bg-orange-500',
  DOCUMENT_VERSION_CREATED: 'bg-amber-500',
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  )
}

export function AuditReports() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (from) params.from = from
      if (to) params.to = to
      const res = await api.get('/audit/summary', { params })
      setSummary(res.data)
    } catch {
      setError('Error al cargar el resumen de auditoría.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const topActions = summary
    ? Object.entries(summary.byAction)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
    : []

  const maxCount = topActions[0]?.[1] ?? 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes de auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas y resúmenes de actividad del sistema</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Aplicar
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : summary ? (
        <>
          {/* Top metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total de eventos" value={summary.total} color="text-gray-900" />
            <MetricCard
              label="Documentos subidos"
              value={summary.byAction['DOCUMENT_UPLOADED'] ?? 0}
              color="text-indigo-600"
            />
            <MetricCard
              label="Descargas"
              value={summary.byAction['DOCUMENT_DOWNLOADED'] ?? 0}
              color="text-green-600"
            />
            <MetricCard
              label="Accesos denegados"
              value={summary.byAction['DOCUMENT_ACCESS_DENIED'] ?? 0}
              color="text-red-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actions breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <h2 className="text-base font-semibold text-gray-900">Acciones por tipo</h2>
              </div>
              <div className="space-y-3">
                {topActions.map(([action, count]) => (
                  <div key={action}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{ACTION_LABELS[action] ?? action}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${ACTION_COLORS[action] ?? 'bg-gray-400'}`}
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity by day */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <h2 className="text-base font-semibold text-gray-900">Actividad por día</h2>
              </div>
              {summary.byDay.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sin datos en el rango seleccionado</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {[...summary.byDay].reverse().slice(0, 14).map(({ date, count }) => {
                    const maxDay = Math.max(...summary.byDay.map((d) => d.count))
                    return (
                      <div key={date} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24 shrink-0">
                          {new Date(date + 'T12:00:00').toLocaleDateString('es', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-400"
                            style={{ width: `${(count / maxDay) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Historial por documento</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Consulta en la pestaña de Auditoría filtrando por entidad
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Actividad por usuario</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Consulta en la pestaña de Auditoría filtrando por actor
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
