import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  FolderPlus,
  Search,
} from 'lucide-react'
import { admissionsAPI, type Cliente, type TurnoAtencion } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'

export function Admissions() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'registro' | 'turnos' | 'directorio'>('registro')

  // Formulario de Cliente
  const [formData, setFormData] = useState({
    tipoDocumento: 'CC',
    numeroDocumento: '',
    nombreCompleto: '',
    telefono: '',
    email: '',
    direccion: '',
    estrato: 1,
    grupoSisben: 'A2',
    declaracionIndefension: true,
    esVictimaViolencia: false,
    esMenorEdad: false,
    consentimientoHabeasData: false,
  })

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastCreatedClient, setLastCreatedClient] = useState<Cliente | null>(null)

  // Turnos
  const [turnos, setTurnos] = useState<TurnoAtencion[]>([])
  const [turnosLoading, setTurnosLoading] = useState(false)

  // Directorio
  const [searchQuery, setSearchQuery] = useState('')
  const [clientsList, setClientsList] = useState<Cliente[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)

  // Cálculo en vivo del índice de vulnerabilidad (Ley 2113 de 2021)
  const calculateLiveVulnerability = () => {
    let score = 0
    if (formData.estrato === 1) score += 0.35
    else if (formData.estrato === 2) score += 0.25
    else if (formData.estrato === 3) score += 0.15

    if (formData.grupoSisben) {
      const letra = formData.grupoSisben.toUpperCase().charAt(0)
      if (letra === 'A') score += 0.3
      else if (letra === 'B') score += 0.2
      else if (letra === 'C') score += 0.1
    }

    if (formData.declaracionIndefension) score += 0.2
    if (formData.esVictimaViolencia) score += 0.2
    if (formData.esMenorEdad) score += 0.15

    return Math.min(1.0, Math.round(score * 100) / 100)
  }

  const liveScore = calculateLiveVulnerability()
  const esAdmisible = formData.estrato <= 3 || formData.declaracionIndefension || formData.esVictimaViolencia

  const loadTurnos = async () => {
    try {
      setTurnosLoading(true)
      const res = await admissionsAPI.getTodayTurnos()
      setTurnos(res.data)
    } catch {
      // ignore
    } finally {
      setTurnosLoading(false)
    }
  }

  const loadClients = async (query = '') => {
    try {
      setClientsLoading(true)
      const res = await admissionsAPI.searchClients(query)
      setClientsList(res.data)
    } catch {
      // ignore
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'turnos') loadTurnos()
    if (activeTab === 'directorio') loadClients(searchQuery)
  }, [activeTab])

  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!formData.consentimientoHabeasData) {
      setErrorMsg('Debe aceptar explícitamente el consentimiento de Hábeas Data (Ley 1581) para proceder.')
      return
    }

    try {
      setLoading(true)
      const res = await admissionsAPI.createClient({
        ...formData,
        estrato: Number(formData.estrato),
      })
      setSuccessMsg(res.data.mensaje)
      setLastCreatedClient(res.data.cliente)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al registrar el cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTurnoForClient = async (clienteId: string) => {
    try {
      await admissionsAPI.createTurno({ clienteId })
      setActiveTab('turnos')
      loadTurnos()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al generar turno')
    }
  }

  const handleUpdateTurno = async (id: string, nuevoEstado: any) => {
    try {
      await admissionsAPI.updateTurnoStatus(id, nuevoEstado)
      loadTurnos()
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admisión y Recepción</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de turnos, consentimiento informado Hábeas Data (Ley 1581) y evaluación socioeconómica (Ley 2113).
          </p>
        </div>

        {/* Pestañas */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('registro')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'registro' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Nueva Admisión
          </button>
          <button
            onClick={() => setActiveTab('turnos')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'turnos' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Turnos de Hoy ({turnos.length})
          </button>
          <button
            onClick={() => setActiveTab('directorio')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'directorio' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Directorio
          </button>
        </div>
      </div>

      {/* TAB 1: REGISTRO DE ADMISIÓN */}
      {activeTab === 'registro' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Caracterización Socioeconómica y Datos Personales
            </h2>

            {errorMsg && <div className="mb-4"><Alert variant="error">{errorMsg}</Alert></div>}
            {successMsg && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  {successMsg}
                </div>
                {lastCreatedClient && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-emerald-200/60">
                    <Button
                      size="sm"
                      onClick={() => handleCreateTurnoForClient(lastCreatedClient.id)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Asignar Turno de Atención
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/cases?newClient=${lastCreatedClient.id}`)}
                    >
                      <FolderPlus className="h-4 w-4 mr-1 text-indigo-600" />
                      Aperturar Expediente Directo
                    </Button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitClient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Documento</label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="TI">Tarjeta de Identidad (TI)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PPT">Permiso por Protección Temporal (PPT)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Documento *</label>
                  <Input
                    required
                    placeholder="Ej. 1047489632"
                    value={formData.numeroDocumento}
                    onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo del Solicitante *</label>
                <Input
                  required
                  placeholder="Nombre y Apellidos completos"
                  value={formData.nombreCompleto}
                  onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono / Celular</label>
                  <Input
                    placeholder="300 123 4567"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico</label>
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección de Residencia y Barrio</label>
                <Input
                  placeholder="Ej: Barrio La Esperanza, Cra 15 # 45-20"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estrato Socioeconómico (1 - 6) *</label>
                  <select
                    value={formData.estrato}
                    onChange={(e) => setFormData({ ...formData, estrato: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={1}>Estrato 1 (Bajo - Bajo)</option>
                    <option value={2}>Estrato 2 (Bajo)</option>
                    <option value={3}>Estrato 3 (Medio - Bajo)</option>
                    <option value={4}>Estrato 4 (Medio)</option>
                    <option value={5}>Estrato 5 (Medio - Alto)</option>
                    <option value={6}>Estrato 6 (Alto)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Grupo Sisbén IV</label>
                  <select
                    value={formData.grupoSisben}
                    onChange={(e) => setFormData({ ...formData, grupoSisben: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="A1">Grupo A (Pobreza Extrema - A1 a A5)</option>
                    <option value="B1">Grupo B (Pobreza Moderada - B1 a B7)</option>
                    <option value="C1">Grupo C (Vulnerabilidad - C1 a C18)</option>
                    <option value="D1">Grupo D (No Pobre / No Vulnerable)</option>
                    <option value="">No cuenta con Sisbén</option>
                  </select>
                </div>
              </div>

              {/* Condiciones Especiales de Vulnerabilidad */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                <span className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Condiciones Especiales de Vulnerabilidad (Ley 2113)
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.declaracionIndefension}
                    onChange={(e) => setFormData({ ...formData, declaracionIndefension: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Manifiesta no poseer recursos económicos para contratar abogado particular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.esVictimaViolencia}
                    onChange={(e) => setFormData({ ...formData, esVictimaViolencia: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Es víctima de violencia intrafamiliar, sexual o de género</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.esMenorEdad}
                    onChange={(e) => setFormData({ ...formData, esMenorEdad: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>El caso compromete los derechos de Niños, Niñas o Adolescentes (NNA)</span>
                </label>
              </div>

              {/* Consentimiento Informado Hábeas Data (Ley 1581) */}
              <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wide mb-1">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Consentimiento Informado de Hábeas Data (Ley 1581 de 2012)
                </div>
                <p className="text-xs text-indigo-950/80 mb-3 leading-relaxed">
                  Autorizo al Consultorio Jurídico para recolectar, almacenar y tratar mis datos personales y los de mi causa
                  con fines estrictamente académicos y de representación legal, amparados bajo el Secreto Profesional (Art. 202 CPP).
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentimientoHabeasData}
                    onChange={(e) => setFormData({ ...formData, consentimientoHabeasData: e.target.checked })}
                    className="rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-indigo-900">
                    Acepto de manera previa, libre y voluntaria el tratamiento de mis datos personales *
                  </span>
                </label>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Validando y Registrando...' : 'Registrar y Admitir Solicitante'}
              </Button>
            </form>
          </div>

          {/* Panel Lateral: Dictamen de Vulnerabilidad en Vivo */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Evaluación Automática (Ley 2113)</h3>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-600">Índice de Vulnerabilidad:</span>
                    <span className="text-indigo-600 font-bold">{Math.round(liveScore * 100)}%</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        liveScore >= 0.6 ? 'bg-emerald-500' : liveScore >= 0.3 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${liveScore * 100}%` }}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-xs ${
                  esAdmisible
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {esAdmisible ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        Usuario Admisible
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        Remisión Externa
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed">
                    {esAdmisible
                      ? 'Cumple con los requisitos socioeconómicos y de vulnerabilidad para representación jurídica gratuita.'
                      : 'El estrato y capacidad económica superan los parámetros de gratuidad del consultorio. Proceder a remisión institucional.'}
                  </p>
                </div>

                <div className="pt-2 text-xs text-gray-500 space-y-1.5 border-t border-gray-100">
                  <p>• <strong>Estratos 1 a 3:</strong> Cobertura prioritaria</p>
                  <p>• <strong>Sisbén A y B:</strong> Presunción legal de pobreza</p>
                  <p>• <strong>Violencia o Menores:</strong> Clasificación reforzada inmediata</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TURNOS DE HOY */}
      {activeTab === 'turnos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Cola de Atención - Jornada Actual
            </h2>
            <Button size="sm" variant="secondary" onClick={loadTurnos} disabled={turnosLoading}>
              Actualizar
            </Button>
          </div>

          {turnosLoading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Cargando turnos...</p>
          ) : turnos.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay turnos registrados en la jornada de hoy.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {turnos.map((t) => (
                <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700 text-sm border border-indigo-200">
                      #{t.numeroTurno}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.cliente.nombreCompleto}</p>
                      <p className="text-xs text-gray-500">
                        Doc: {t.cliente.tipoDocumento} {t.cliente.numeroDocumento} • Tel: {t.cliente.telefono || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={t.estado === 'FINALIZADO' ? 'green' : t.estado === 'ATENDIENDO' ? 'blue' : 'yellow'}>
                      {t.estado}
                    </Badge>

                    {t.estado === 'EN_ESPERA' && (
                      <Button size="sm" onClick={() => handleUpdateTurno(t.id, 'ATENDIENDO')}>
                        Llamar
                      </Button>
                    )}
                    {t.estado === 'ATENDIENDO' && (
                      <Button size="sm" variant="secondary" onClick={() => handleUpdateTurno(t.id, 'FINALIZADO')}>
                        Finalizar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECTORIO DE CLIENTES */}
      {activeTab === 'directorio' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por cédula o nombre del cliente..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  loadClients(e.target.value)
                }}
                className="pl-9"
              />
            </div>
          </div>

          {clientsLoading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Buscando usuarios...</p>
          ) : clientsList.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No se encontraron clientes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Documento</th>
                    <th className="py-2.5 px-3">Estrato / Sisbén</th>
                    <th className="py-2.5 px-3">Vulnerabilidad</th>
                    <th className="py-2.5 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientsList.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900">{c.nombreCompleto}</p>
                        <p className="text-xs text-gray-400">{c.email || c.telefono || 'Sin contacto directo'}</p>
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600 font-mono">
                        {c.tipoDocumento} {c.numeroDocumento}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600">
                        Estrato {c.estrato} {c.grupoSisben ? `• ${c.grupoSisben}` : ''}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={c.indiceVulnerabilidad && c.indiceVulnerabilidad >= 0.5 ? 'green' : 'blue'}>
                          {c.indiceVulnerabilidad ? `${Math.round(c.indiceVulnerabilidad * 100)}%` : '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCreateTurnoForClient(c.id)}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Turno
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/cases?newClient=${c.id}`)}
                        >
                          <FolderPlus className="h-3.5 w-3.5 mr-1" />
                          Abrir Caso
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
