import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellRing,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import { proceedingsAPI, type AlertaTermino } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export function Alerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<AlertaTermino[]>([])
  const [loading, setLoading] = useState(true)

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const res = await proceedingsAPI.getAlerts()
      setAlerts(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const handleComplete = async (actuacionId: string) => {
    try {
      await proceedingsAPI.completeTerm(actuacionId)
      loadAlerts()
    } catch {
      alert('Error al marcar término como cumplido')
    }
  }

  const getAlertBadge = (nivel: AlertaTermino['nivelAlerta'], dias: number) => {
    switch (nivel) {
      case 'VENCIDO':
        return <Badge variant="red">Vencido ({Math.abs(dias)} días atrás)</Badge>
      case 'ALERTA_1_DIA':
        return <Badge variant="red">Urgente (1 día restante)</Badge>
      case 'ALERTA_3_DIAS':
        return <Badge variant="yellow">Atención ({dias} días restantes)</Badge>
      case 'ALERTA_7_DIAS':
        return <Badge variant="blue">Preventivo ({dias} días)</Badge>
      default:
        return <Badge variant="gray">{dias} días restantes</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BellRing className="h-6 w-6 text-indigo-600" />
            Motor de Alertas Tempranas de Términos Judiciales
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo preventivo y escalamiento ante vencimiento de términos (7, 3 y 1 día antes) según el RF-09.
          </p>
        </div>

        <Button size="sm" variant="secondary" onClick={loadAlerts} disabled={loading}>
          Actualizar
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500 py-10 text-center">Consultando alertas activas...</p>
        ) : alerts.length === 0 ? (
          <div className="py-14 text-center text-gray-400 space-y-2">
            <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 opacity-80" />
            <p className="text-sm font-semibold text-gray-700">Sin términos próximos a vencer</p>
            <p className="text-xs text-gray-400">No existen actuaciones procesales pendientes de término en este momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.map((al) => {
              const esCritica = al.nivelAlerta === 'VENCIDO' || al.nivelAlerta === 'ALERTA_1_DIA'
              return (
                <div key={al.actuacionId} className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${esCritica ? 'bg-rose-50/40 rounded-xl px-3' : ''}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded">
                        {al.radicado}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{al.tipoCaso}</span>
                    </div>

                    <p className="text-xs text-gray-700">{al.descripcion}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1">
                      <span>Vencimiento: <strong className="text-gray-800">{new Date(al.fechaVencimiento).toLocaleDateString()}</strong></span>
                      {al.pasante && <span>• Pasante: {al.pasante.name}</span>}
                      {al.docenteSupervisor && <span>• Docente: {al.docenteSupervisor.name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {getAlertBadge(al.nivelAlerta, al.diasRestantes)}

                    <Button size="sm" variant="secondary" onClick={() => handleComplete(al.actuacionId)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      Marcar Cumplido
                    </Button>

                    <Button size="sm" onClick={() => navigate(`/cases/${al.expedienteId}`)}>
                      Ver Caso
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
