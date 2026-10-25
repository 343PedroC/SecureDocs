import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderLock,
  GraduationCap,
  BellRing,
  UserPlus,
  ArrowRight,
} from 'lucide-react'
import { casesAPI, draftsAPI, proceedingsAPI, admissionsAPI, type Expediente, type AlertaTermino } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Badge } from '../components/ui/Badge'

export function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const [cases, setCases] = useState<Expediente[]>([])
  const [pendingDraftsCount, setPendingDraftsCount] = useState(0)
  const [alerts, setAlerts] = useState<AlertaTermino[]>([])
  const [turnosCount, setTurnosCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        const [casesRes, alertsRes] = await Promise.all([
          casesAPI.getCases(),
          proceedingsAPI.getAlerts().catch(() => ({ data: [] })),
        ])
        setCases(casesRes.data)
        setAlerts(alertsRes.data)

        if (user?.role === 'DOCENTE_SUPERVISOR' || user?.role === 'DIRECTOR' || user?.role === 'admin') {
          const draftsRes = await draftsAPI.getPendingReview().catch(() => ({ data: [] }))
          setPendingDraftsCount(draftsRes.data.length)
        }

        if (user?.role === 'ADMINISTRATIVO' || user?.role === 'DIRECTOR' || user?.role === 'admin') {
          const turnosRes = await admissionsAPI.getTodayTurnos().catch(() => ({ data: [] }))
          setTurnosCount(turnosRes.data.length)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [user])

  const criticalAlertsCount = alerts.filter(
    (a) => a.nivelAlerta === 'VENCIDO' || a.nivelAlerta === 'ALERTA_1_DIA',
  ).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido(a), {user?.name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Plataforma de Gestión Integral de Expedientes Jurídicos • Consultorio Jurídico Universitario
        </p>
      </div>

      {/* Tarjetas Principales según Rol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/cases"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="rounded-xl p-3 bg-indigo-50 text-indigo-600">
            <FolderLock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              {user?.role === 'PASANTE' ? 'Mis Expedientes' : 'Expedientes Activos'}
            </p>
            <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
          </div>
        </Link>

        {(user?.role === 'DOCENTE_SUPERVISOR' || user?.role === 'DIRECTOR' || user?.role === 'admin') && (
          <Link
            to="/supervision"
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="rounded-xl p-3 bg-emerald-50 text-emerald-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                Por Revisar
              </p>
              <p className="text-2xl font-bold text-gray-900">{pendingDraftsCount}</p>
            </div>
          </Link>
        )}

        <Link
          to="/alerts"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className={`rounded-xl p-3 ${criticalAlertsCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              Términos / Alertas
            </p>
            <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
          </div>
        </Link>

        {(user?.role === 'ADMINISTRATIVO' || user?.role === 'DIRECTOR' || user?.role === 'admin') && (
          <Link
            to="/admissions"
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="rounded-xl p-3 bg-violet-50 text-violet-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                Turnos de Hoy
              </p>
              <p className="text-2xl font-bold text-gray-900">{turnosCount}</p>
            </div>
          </Link>
        )}

        {user?.role === 'PASANTE' && (
          <Link
            to="/admissions"
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="rounded-xl p-3 bg-violet-50 text-violet-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                Admisión y Turnos
              </p>
              <p className="text-sm font-bold text-gray-900">Atención Ciudadana</p>
            </div>
          </Link>
        )}
      </div>

      {/* Grid de 2 Columnas: Expedientes Recientes y Alertas Próximas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expedientes Recientes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FolderLock className="h-4 w-4 text-indigo-600" />
              Expedientes Recientes
            </h2>
            <Link to="/cases" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <p className="text-xs text-gray-400 py-6 text-center">Cargando expedientes...</p>
          ) : cases.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No hay expedientes activos asignados.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {cases.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer rounded-lg px-2 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700">{c.radicado}</span>
                      <span className="text-xs text-gray-700 font-semibold">{c.tipoCaso}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {c.cliente.nombreCompleto} • Área {c.areaJuridica}
                    </p>
                  </div>
                  <Badge variant="blue">{c.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas Urgentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-amber-600" />
              Términos Procesales Próximos
            </h2>
            <Link to="/alerts" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Ver alertas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <p className="text-xs text-gray-400 py-6 text-center">Cargando términos...</p>
          ) : alerts.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">Sin vencimientos procesales próximos.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {alerts.slice(0, 5).map((al) => (
                <div
                  key={al.actuacionId}
                  onClick={() => navigate(`/cases/${al.expedienteId}`)}
                  className="py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer rounded-lg px-2 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-indigo-700">{al.radicado}</span>
                    <p className="text-xs text-gray-800 font-medium truncate max-w-xs">{al.descripcion}</p>
                    <p className="text-[11px] text-gray-400">
                      Vence: {new Date(al.fechaVencimiento).toLocaleDateString()}
                    </p>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    al.nivelAlerta === 'VENCIDO' || al.nivelAlerta === 'ALERTA_1_DIA'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {al.diasRestantes <= 0 ? '¡Vencido!' : `${al.diasRestantes}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
