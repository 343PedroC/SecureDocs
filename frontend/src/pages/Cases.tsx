import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FolderLock,
  Plus,
  Search,
  ShieldAlert,
  User,
  GraduationCap,
  Clock,
  FileText,
} from 'lucide-react'
import { casesAPI, admissionsAPI, type Expediente, type Cliente, type AreaJuridica } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'

export function Cases() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)

  const [cases, setCases] = useState<Expediente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')

  // Modal de apertura
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Búsqueda de cliente para modal
  const [clientSearch, setClientSearch] = useState('')
  const [clientsFound, setClientsFound] = useState<Cliente[]>([])
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)

  // Datos del nuevo caso
  const [newCase, setNewCase] = useState({
    areaJuridica: 'CIVIL' as AreaJuridica,
    tipoCaso: '',
    hechos: '',
    pretensiones: '',
    contraparteNombre: '',
    contraparteDocumento: '',
  })

  const loadCases = async () => {
    try {
      setLoading(true)
      const res = await casesAPI.getCases({
        area: areaFilter || undefined,
        estado: estadoFilter || undefined,
        search: search || undefined,
      })
      setCases(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [areaFilter, estadoFilter])

  // Si vino con query param newClient, abrir modal directamente
  useEffect(() => {
    const newClientId = searchParams.get('newClient')
    if (newClientId) {
      admissionsAPI.getClientById(newClientId).then((res) => {
        setSelectedClient(res.data)
        setModalOpen(true)
      }).catch(() => {})
    }
  }, [searchParams])

  const handleSearchClients = async (q: string) => {
    setClientSearch(q)
    if (!q || q.length < 2) {
      setClientsFound([])
      return
    }
    try {
      const res = await admissionsAPI.searchClients(q)
      setClientsFound(res.data)
    } catch {
      // ignore
    }
  }

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient) {
      setCreateError('Debe seleccionar un cliente admitido.')
      return
    }
    setCreateError(null)
    setCreating(true)

    try {
      const res = await casesAPI.createCase({
        clienteId: selectedClient.id,
        areaJuridica: newCase.areaJuridica,
        tipoCaso: newCase.tipoCaso,
        hechos: newCase.hechos,
        pretensiones: newCase.pretensiones,
        contraparteNombre: newCase.contraparteNombre || undefined,
        contraparteDocumento: newCase.contraparteDocumento || undefined,
      })
      setModalOpen(false)
      navigate(`/cases/${res.data.id}`)
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Error al aperturar el expediente')
    } finally {
      setCreating(false)
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'ADMITIDO':
        return <Badge variant="yellow">Admitido</Badge>
      case 'ASIGNADO':
        return <Badge variant="blue">Asignado</Badge>
      case 'EN_TRAMITE':
        return <Badge variant="blue">En Trámite</Badge>
      case 'EN_REVISION_DOCENTE':
        return <Badge variant="yellow">En Revisión</Badge>
      case 'PENDIENTE_CIERRE':
        return <Badge variant="yellow">Pendiente Cierre</Badge>
      case 'ARCHIVADO':
        return <Badge variant="gray">Archivado (Inmutable)</Badge>
      default:
        return <Badge variant="gray">{estado}</Badge>
    }
  }

  const canOpenCase =
    user?.role === 'DIRECTOR' ||
    user?.role === 'DOCENTE_SUPERVISOR' ||
    user?.role === 'ADMINISTRATIVO' ||
    user?.role === 'PASANTE' ||
    user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderLock className="h-6 w-6 text-indigo-600" />
            Expedientes Jurídicos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión integral de causas, radicación institucional única (RF-04) y secreto profesional.
          </p>
        </div>

        {canOpenCase && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Aperturar Expediente
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por radicado, tipo de caso o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCases()}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="">Todas las Áreas</option>
            <option value="CIVIL">Civil</option>
            <option value="LABORAL">Laboral</option>
            <option value="PENAL">Penal</option>
            <option value="FAMILIA">Familia</option>
            <option value="PUBLICO">Público</option>
          </select>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="ADMITIDO">Admitido</option>
            <option value="ASIGNADO">Asignado</option>
            <option value="EN_TRAMITE">En Trámite</option>
            <option value="EN_REVISION_DOCENTE">En Revisión</option>
            <option value="PENDIENTE_CIERRE">Pendiente Cierre</option>
            <option value="ARCHIVADO">Archivado</option>
          </select>

          <Button size="sm" variant="secondary" onClick={loadCases}>
            Filtrar
          </Button>
        </div>
      </div>

      {/* Listado de Expedientes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 py-12 text-center">Cargando expedientes...</p>
        ) : cases.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <FolderLock className="h-10 w-10 mx-auto opacity-40 text-indigo-600" />
            <p className="text-sm font-semibold text-gray-600">No se encontraron expedientes</p>
            <p className="text-xs text-gray-400">Verifique los filtros o radique una nueva causa admitida.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase bg-gray-50/60">
                  <th className="py-3 px-4">Radicado / Área</th>
                  <th className="py-3 px-4">Tipo de Caso & Cliente</th>
                  <th className="py-3 px-4">Asignación</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Contenido</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 text-sm">{c.radicado}</span>
                        {c.sensibilidad === 'MAXIMA_SENSIBILIDAD' && (
                          <span
                            title="Caso de Máxima Sensibilidad (Ley 1581: NNA o violencia)"
                            className="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
                          >
                            <ShieldAlert className="h-3 w-3 mr-0.5" />
                            Sensible
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Área {c.areaJuridica}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-900">{c.tipoCaso}</p>
                      <p className="text-xs text-gray-500">
                        Usuario: <strong className="text-gray-700">{c.cliente.nombreCompleto}</strong> (Doc: {c.cliente.numeroDocumento})
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>Pasante: {c.pasante?.name || <em className="text-amber-600">Sin asignar</em>}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Docente: {c.docenteSupervisor?.name || <em className="text-gray-400">Por definir</em>}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.estado)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <span title="Documentos Cifrados" className="flex items-center gap-0.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-400" />
                          {c._count?.documentos ?? 0}
                        </span>
                        <span title="Escritos Procesales" className="flex items-center gap-0.5">
                          <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
                          {c._count?.escritos ?? 0}
                        </span>
                        <span title="Actuaciones" className="flex items-center gap-0.5">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          {c._count?.actuaciones ?? 0}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/cases/${c.id}`)}
                      >
                        Ver Caso
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE APERTURA DE EXPEDIENTE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FolderLock className="h-5 w-5 text-indigo-600" />
                Apertura y Radicación de Expediente (CUN-02)
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {createError && <Alert variant="error">{createError}</Alert>}

            <form onSubmit={handleCreateCase} className="space-y-4">
              {/* Selección de Cliente */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Cliente Solicitante Admitido *
                </label>
                {selectedClient ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div>
                      <p className="text-sm font-bold text-indigo-900">{selectedClient.nombreCompleto}</p>
                      <p className="text-xs text-indigo-700">
                        {selectedClient.tipoDocumento} {selectedClient.numeroDocumento} • Estrato {selectedClient.estrato}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedClient(null)}
                    >
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      placeholder="Buscar por cédula o nombre..."
                      value={clientSearch}
                      onChange={(e) => handleSearchClients(e.target.value)}
                    />
                    {clientsFound.length > 0 && (
                      <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100 bg-white shadow-lg">
                        {clientsFound.map((cli) => (
                          <div
                            key={cli.id}
                            onClick={() => {
                              setSelectedClient(cli)
                              setClientsFound([])
                            }}
                            className="p-2.5 text-xs hover:bg-indigo-50 cursor-pointer flex justify-between"
                          >
                            <span className="font-semibold text-gray-900">{cli.nombreCompleto}</span>
                            <span className="text-gray-500 font-mono">{cli.numeroDocumento}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Área Jurídica *</label>
                  <select
                    value={newCase.areaJuridica}
                    onChange={(e) => setNewCase({ ...newCase, areaJuridica: e.target.value as AreaJuridica })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="CIVIL">Civil</option>
                    <option value="LABORAL">Laboral</option>
                    <option value="PENAL">Penal</option>
                    <option value="FAMILIA">Familia</option>
                    <option value="PUBLICO">Público</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Causa / Trámite *</label>
                  <Input
                    required
                    placeholder="Ej. Fijación de Cuota de Alimentos"
                    value={newCase.tipoCaso}
                    onChange={(e) => setNewCase({ ...newCase, tipoCaso: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Resumen de Hechos Relevantes</label>
                <textarea
                  rows={3}
                  placeholder="Descripción fáctica de los acontecimientos relatados por el solicitante..."
                  value={newCase.hechos}
                  onChange={(e) => setNewCase({ ...newCase, hechos: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pretensiones del Solicitante</label>
                <textarea
                  rows={2}
                  placeholder="Qué solicita que se adelante judicial o administrativamente..."
                  value={newCase.pretensiones}
                  onChange={(e) => setNewCase({ ...newCase, pretensiones: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <span className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Datos de la Contraparte (Filtro Anti-Conflicto de Interés)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Nombre completo contraparte"
                    value={newCase.contraparteNombre}
                    onChange={(e) => setNewCase({ ...newCase, contraparteNombre: e.target.value })}
                  />
                  <Input
                    placeholder="Cédula contraparte (opcional)"
                    value={newCase.contraparteDocumento}
                    onChange={(e) => setNewCase({ ...newCase, contraparteDocumento: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating || !selectedClient}>
                  {creating ? 'Radicando...' : 'Radicar y Crear Carpeta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
