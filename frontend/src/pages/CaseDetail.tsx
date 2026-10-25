import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FolderLock,
  ArrowLeft,
  User,
  GraduationCap,
  ShieldAlert,
  FileText,
  Upload,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Lock,
  Award,
  Users,
} from 'lucide-react'
import {
  casesAPI,
  draftsAPI,
  proceedingsAPI,
  api,
  type Expediente,
  type EscritoProcesal,
  type TipoEscrito,
  type TipoActuacion,
  type TipoDocumental,
} from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'

export function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [expediente, setExpediente] = useState<Expediente | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'documentos' | 'escritos' | 'actuaciones'>('info')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Subida de documento cifrado
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [tipoDocumental, setTipoDocumental] = useState<TipoDocumental>('PRUEBA')
  const [uploading, setUploading] = useState(false)

  // Redacción de escrito
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [newDraft, setNewDraft] = useState({
    titulo: '',
    tipo: 'TUTELA' as TipoEscrito,
    contenido: '',
  })
  const [savingDraft, setSavingDraft] = useState(false)

  // Revisión de escrito (Docente)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedDraftForReview, setSelectedDraftForReview] = useState<EscritoProcesal | null>(null)
  const [reviewAction, setReviewAction] = useState<'APROBAR' | 'RECHAZAR'>('APROBAR')
  const [reviewNotes, setReviewNotes] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Registro de actuación
  const [actModalOpen, setActModalOpen] = useState(false)
  const [newAct, setNewAct] = useState({
    tipo: 'NOTIFICACION_JUZGADO' as TipoActuacion,
    descripcion: '',
    fechaVencimientoTermino: '',
  })
  const [savingAct, setSavingAct] = useState(false)

  // Asignación de expediente
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [selectedDocenteId, setSelectedDocenteId] = useState('')
  const [selectedPasanteId, setSelectedPasanteId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Cierre de caso
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closeData, setCloseData] = useState({
    informeFinal: '',
    motivo: 'Sentencia favorable',
  })
  const [closing, setClosing] = useState(false)

  const loadCase = async () => {
    if (!id) return
    try {
      setLoading(true)
      const res = await casesAPI.getCase(id)
      setExpediente(res.data)
      setSelectedDocenteId(res.data.docenteSupervisorId || '')
      setSelectedPasanteId(res.data.pasanteId || '')
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al cargar expediente')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCase()
  }, [id])

  const loadAssignableUsers = async () => {
    try {
      const res = await api.get('/users')
      setAvailableUsers(res.data)
    } catch {
      // ignore
    }
  }

  // --- ACCIONES DE DOCUMENTOS CIFRADOS ---
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !id) return
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('expedienteId', id)
      formData.append('tipoDocumental', tipoDocumental)

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadFile(null)
      setSuccessMsg('Documento cifrado con AES-256 y almacenado con éxito.')
      loadCase()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al subir documento')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadDocument = async (docId: string, filename: string) => {
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      alert('Error o sin permisos para descargar el documento descifrado.')
    }
  }

  // --- ACCIONES DE ESCRITOS PROCESALES ---
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setSavingDraft(true)
      await draftsAPI.createDraft({
        expedienteId: id,
        titulo: newDraft.titulo,
        tipo: newDraft.tipo,
        contenido: newDraft.contenido,
      })
      setDraftModalOpen(false)
      setNewDraft({ titulo: '', tipo: 'TUTELA', contenido: '' })
      setSuccessMsg('Escrito procesal creado en estado BORRADOR.')
      loadCase()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al crear escrito')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSubmitForReview = async (draftId: string) => {
    try {
      await draftsAPI.submitForReview(draftId)
      setSuccessMsg('Escrito enviado a revisión del Docente Supervisor.')
      loadCase()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al enviar a revisión')
    }
  }

  const handleReviewDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDraftForReview) return
    try {
      setSubmittingReview(true)
      await draftsAPI.reviewDraft(selectedDraftForReview.id, {
        accion: reviewAction,
        observacionesDocente: reviewNotes,
      })
      setReviewModalOpen(false)
      setSelectedDraftForReview(null)
      setReviewNotes('')
      setSuccessMsg(reviewAction === 'APROBAR' ? 'Escrito APROBADO con aval docente.' : 'Escrito RECHAZADO con observaciones.')
      loadCase()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error en revisión')
    } finally {
      setSubmittingReview(false)
    }
  }

  // --- ACCIONES DE ACTUACIONES PROCESALES ---
  const handleCreateActuacion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setSavingAct(true)
      await proceedingsAPI.create({
        expedienteId: id,
        tipo: newAct.tipo,
        descripcion: newAct.descripcion,
        fechaVencimientoTermino: newAct.fechaVencimientoTermino || undefined,
      })
      setActModalOpen(false)
      setNewAct({ tipo: 'NOTIFICACION_JUZGADO', descripcion: '', fechaVencimientoTermino: '' })
      setSuccessMsg('Actuación procesal registrada.')
      loadCase()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al registrar actuación')
    } finally {
      setSavingAct(false)
    }
  }

  const handleCompleteTerm = async (actId: string) => {
    try {
      await proceedingsAPI.completeTerm(actId)
      loadCase()
    } catch {
      // ignore
    }
  }

  // --- ASIGNACIÓN DE EXPEDIENTE ---
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setAssigning(true)
      await casesAPI.assignCase(id, {
        docenteSupervisorId: selectedDocenteId || undefined,
        pasanteId: selectedPasanteId || undefined,
      })
      setAssignModalOpen(false)
      setSuccessMsg('Asignación del expediente formalizada con éxito.')
      loadCase()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al asignar expediente')
    } finally {
      setAssigning(false)
    }
  }

  // --- CIERRE DE EXPEDIENTE ---
  const handleRequestClose = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setClosing(true)
      await casesAPI.requestClose(id, {
        informeFinalPasante: closeData.informeFinal,
        motivoCierre: closeData.motivo,
      })
      setCloseModalOpen(false)
      setSuccessMsg('Solicitud de cierre radicada. En espera de aval del Docente Supervisor.')
      loadCase()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al solicitar cierre')
    } finally {
      setClosing(false)
    }
  }

  const handleEndorseClose = async () => {
    if (!id) return
    try {
      await casesAPI.endorseClose(id, { observacionesDocente: 'Avalado por Docente Supervisor' })
      setSuccessMsg('Informe de cierre avalado. En espera de aprobación final del Director.')
      loadCase()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al avalar')
    }
  }

  const handleApproveClose = async () => {
    if (!id) return
    try {
      await casesAPI.approveClose(id, {
        observacionesDirector: 'Cierre aprobado por Dirección. Expediente archivado e inmutable.',
        devolucionOriginalesUsuario: true,
      })
      setSuccessMsg('Expediente ARCHIVADO de forma definitiva e inmutable (Ley 594 de 2000).')
      loadCase()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al aprobar cierre')
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-500">Cargando expediente...</div>
  }

  if (!expediente) {
    return (
      <div className="py-20 text-center space-y-3">
        <FolderLock className="h-10 w-10 mx-auto text-gray-400" />
        <p className="text-gray-600 font-semibold">Expediente no encontrado</p>
        <Button variant="secondary" onClick={() => navigate('/cases')}>
          Volver a Expedientes
        </Button>
      </div>
    )
  }

  const isArchived = expediente.estado === 'ARCHIVADO'
  const isDocenteOrDirector = user?.role === 'DOCENTE_SUPERVISOR' || user?.role === 'DIRECTOR' || user?.role === 'admin'
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Cabecera del Caso */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            onClick={() => navigate('/cases')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Expedientes
          </button>

          <div className="flex items-center gap-2">
            {expediente.sensibilidad === 'MAXIMA_SENSIBILIDAD' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                <ShieldAlert className="h-4 w-4" />
                Máxima Sensibilidad (Ley 1581)
              </span>
            )}
            <Badge variant={isArchived ? 'gray' : 'blue'}>
              {expediente.estado}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-black text-indigo-700 tracking-tight">
                {expediente.radicado}
              </span>
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 uppercase">
                Área {expediente.areaJuridica}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{expediente.tipoCaso}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Cliente: <strong className="text-gray-800">{expediente.cliente.nombreCompleto}</strong> (Doc: {expediente.cliente.numeroDocumento})
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isDocenteOrDirector && !isArchived && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  loadAssignableUsers()
                  setAssignModalOpen(true)
                }}
              >
                <Users className="h-4 w-4 mr-1.5 text-indigo-600" />
                Asignación
              </Button>
            )}

            {!isArchived && expediente.estado !== 'PENDIENTE_CIERRE' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCloseModalOpen(true)}
              >
                <Lock className="h-4 w-4 mr-1.5 text-amber-600" />
                Cierre de Caso
              </Button>
            )}

            {isArchived && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                <Lock className="h-3.5 w-3.5 text-gray-400" />
                Expediente Archivado (Inmutable)
              </span>
            )}
          </div>
        </div>

        {/* Resumen de Asignación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50">
            <User className="h-4 w-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-gray-500 block">Pasante Titular:</span>
              <span className="font-semibold text-gray-900">
                {expediente.pasante?.name || <em className="text-amber-600">Sin asignar</em>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50">
            <GraduationCap className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-gray-500 block">Docente Supervisor:</span>
              <span className="font-semibold text-gray-900">
                {expediente.docenteSupervisor?.name || <em className="text-gray-400">Por definir</em>}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span className="text-gray-500 block">Apertura:</span>
              <span className="font-semibold text-gray-900">
                {new Date(expediente.fechaApertura).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {successMsg && <Alert variant="success">{successMsg}</Alert>}
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      {/* Pestañas de Navegación del Expediente */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          {[
            { id: 'info', label: 'Información & Hechos', icon: FolderLock },
            { id: 'documentos', label: `Documentos Cifrados (${expediente.documentos?.length ?? 0})`, icon: FileText },
            { id: 'escritos', label: `Escritos Procesales (${expediente.escritos?.length ?? 0})`, icon: GraduationCap },
            { id: 'actuaciones', label: `Timeline & Términos (${expediente.actuaciones?.length ?? 0})`, icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3 border-b-2 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: INFORMACIÓN Y HECHOS */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Resumen Fáctico de los Hechos
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                {expediente.hechos || 'No se registraron hechos fácticos detallados.'}
              </p>

              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide pt-2">
                Pretensiones de la Causa
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                {expediente.pretensiones || 'No se especificaron pretensiones particulares.'}
              </p>
            </div>

            {/* Banner de Cierre si está en trámite de cierre */}
            {expediente.solicitudCierre && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-700" />
                    Trámite de Cierre y Archivo (Ley 594 de 2000)
                  </h3>
                  <Badge variant={expediente.solicitudCierre.aprobacionDirector ? 'green' : 'yellow'}>
                    {expediente.solicitudCierre.aprobacionDirector ? 'Cierre Aprobado' : 'Pendiente de Aval'}
                  </Badge>
                </div>
                <div className="text-xs text-amber-950/80 bg-white/80 p-3 rounded-lg border border-amber-200/60">
                  <p className="font-semibold mb-1">Informe Final de Gestión:</p>
                  <p>{expediente.solicitudCierre.informeFinalPasante}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {!expediente.solicitudCierre.avalDocente && isDocenteOrDirector && (
                    <Button size="sm" onClick={handleEndorseClose} className="bg-amber-600 hover:bg-amber-700 text-white">
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Avalar Informe Docente
                    </Button>
                  )}
                  {expediente.solicitudCierre.avalDocente && !expediente.solicitudCierre.aprobacionDirector && isDirector && (
                    <Button size="sm" onClick={handleApproveClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Award className="h-4 w-4 mr-1.5" />
                      Aprobar Cierre y Archivar Inmutable
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Partes Procesales
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block font-medium">Demandante / Usuario:</span>
                  <span className="font-bold text-gray-900 text-sm">{expediente.cliente.nombreCompleto}</span>
                  <span className="block text-gray-500 mt-0.5">
                    Doc: {expediente.cliente.tipoDocumento} {expediente.cliente.numeroDocumento}
                  </span>
                  <span className="block text-gray-500">
                    Tel: {expediente.cliente.telefono || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block font-medium">Contraparte:</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {expediente.contraparteNombre || 'No registrada'}
                  </span>
                  <span className="block text-gray-500 mt-0.5">
                    Doc: {expediente.contraparteDocumento || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTOS CIFRADOS (AES-256 / MinIO) */}
      {activeTab === 'documentos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Repositorio Digital Cifrado del Expediente
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Archivos custodiados con cifrado AES-256-GCM y verificación de integridad SHA-256.
              </p>
            </div>
          </div>

          {/* Formulario de subida rápida */}
          {!isArchived && (
            <form onSubmit={handleUploadDocument} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Seleccionar Archivo (PDF, Img, Doc)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo Documental</label>
                <select
                  value={tipoDocumental}
                  onChange={(e) => setTipoDocumental(e.target.value as TipoDocumental)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="PRUEBA">Prueba / Soporte</option>
                  <option value="PODER">Poder Especial</option>
                  <option value="DOCUMENTO_IDENTIDAD">Copia Documento</option>
                  <option value="MEMORIAL">Memorial Radicado</option>
                  <option value="SENTENCIA">Fallo / Sentencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <Button type="submit" disabled={uploading || !uploadFile} size="sm">
                <Upload className="h-4 w-4 mr-1.5" />
                {uploading ? 'Cifrando...' : 'Cargar Cifrado'}
              </Button>
            </form>
          )}

          {/* Listado de Documentos */}
          {!expediente.documentos || expediente.documentos.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">No hay documentos cargados en este expediente.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {expediente.documentos.map((doc) => (
                <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{doc.originalName}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        SHA-256: {doc.sha256.slice(0, 16)}... • {(doc.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="blue">{doc.tipoDocumental || 'OTRO'}</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownloadDocument(doc.id, doc.originalName)}
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Descargar Descifrado
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ESCRITOS PROCESALES Y APROBACIONES */}
      {activeTab === 'escritos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                Escritos Procesales y Aval Jurídico Docente (RF-08, RF-10)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Flujo de calidad formativa: Borrador $\rightarrow$ Revisión $\rightarrow$ Aprobado (Art. Ley 2113).
              </p>
            </div>

            {!isArchived && (
              <Button onClick={() => setDraftModalOpen(true)}>
                <FileText className="h-4 w-4 mr-1.5" />
                Redactar Escrito
              </Button>
            )}
          </div>

          {!expediente.escritos || expediente.escritos.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">No hay escritos procesales elaborados para este caso.</p>
          ) : (
            <div className="space-y-4">
              {expediente.escritos.map((esc) => (
                <div key={esc.id} className="p-5 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm">{esc.titulo}</h3>
                        <span className="text-xs font-semibold text-gray-400">v{esc.version}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Tipo: <strong className="text-gray-700">{esc.tipo}</strong> • Redactado por: {esc.autor?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          esc.estado === 'APROBADO'
                            ? 'green'
                            : esc.estado === 'EN_REVISION'
                            ? 'blue'
                            : esc.estado === 'RECHAZADO'
                            ? 'red'
                            : 'yellow'
                        }
                      >
                        {esc.estado}
                      </Badge>
                    </div>
                  </div>

                  {/* Cuerpo del escrito (previsualización) */}
                  <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100 text-xs text-gray-700 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {esc.contenido}
                  </div>

                  {/* Observaciones del docente */}
                  {esc.observacionesDocente && (
                    <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-lg text-xs">
                      <span className="font-bold text-amber-900 block mb-0.5">
                        Observaciones del Docente ({esc.revisadoPor?.name}):
                      </span>
                      <p className="text-amber-950/80">{esc.observacionesDocente}</p>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                    {esc.estado === 'BORRADOR' && (
                      <Button size="sm" onClick={() => handleSubmitForReview(esc.id)}>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Enviar a Revisión Docente
                      </Button>
                    )}

                    {esc.estado === 'EN_REVISION' && isDocenteOrDirector && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDraftForReview(esc)
                          setReviewModalOpen(true)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Award className="h-3.5 w-3.5 mr-1.5" />
                        Revisar y Avalar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TIMELINE DE ACTUACIONES Y TÉRMINOS */}
      {activeTab === 'actuaciones' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Historial de Actuaciones Procesales y Vencimientos (RF-09)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cronología inmutable de diligencias, notificaciones y control de términos judiciales.
              </p>
            </div>

            {!isArchived && (
              <Button onClick={() => setActModalOpen(true)}>
                <Clock className="h-4 w-4 mr-1.5" />
                Registrar Actuación
              </Button>
            )}
          </div>

          {!expediente.actuaciones || expediente.actuaciones.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">No se han registrado actuaciones judiciales en este caso.</p>
          ) : (
            <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6 py-2">
              {expediente.actuaciones.map((act) => {
                const tieneTermino = Boolean(act.fechaVencimientoTermino)
                return (
                  <div key={act.id} className="relative pl-6">
                    <div className="absolute -left-2 top-1.5 h-4 w-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                          {act.tipo.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(act.fechaActuacion).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 leading-relaxed">{act.descripcion}</p>

                      {tieneTermino && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Vence: {new Date(act.fechaVencimientoTermino!).toLocaleDateString()}
                          </span>
                          {!act.terminoCumplido ? (
                            <Button size="sm" variant="secondary" onClick={() => handleCompleteTerm(act.id)}>
                              Marcar Cumplido
                            </Button>
                          ) : (
                            <Badge variant="green">Término Cumplido</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL REDACTAR ESCRITO */}
      {draftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Redactar Escrito Procesal (Borrador)</h3>
              <button onClick={() => setDraftModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Título del Memorial *</label>
                  <Input
                    required
                    placeholder="Ej. Demanda de Alimentos para Menor"
                    value={newDraft.titulo}
                    onChange={(e) => setNewDraft({ ...newDraft, titulo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Escrito</label>
                  <select
                    value={newDraft.tipo}
                    onChange={(e) => setNewDraft({ ...newDraft, tipo: e.target.value as TipoEscrito })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="TUTELA">Acción de Tutela</option>
                    <option value="DEMANDA">Demanda Ordinaria</option>
                    <option value="DERECHO_PETICION">Derecho de Petición</option>
                    <option value="RECURSO">Recurso de Reposición/Apelación</option>
                    <option value="CONCILIACION">Solicitud Conciliación</option>
                    <option value="MEMORIAL">Memorial / Alegato</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contenido Jurídico del Escrito *</label>
                <textarea
                  rows={8}
                  required
                  placeholder="Escriba aquí los hechos, fundamentos de derecho y pretensiones del memorial..."
                  value={newDraft.contenido}
                  onChange={(e) => setNewDraft({ ...newDraft, contenido: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setDraftModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={savingDraft}>
                  {savingDraft ? 'Guardando...' : 'Guardar Borrador'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REVISIÓN DOCENTE */}
      {reviewModalOpen && selectedDraftForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                Supervisión y Control de Calidad Jurídica
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleReviewDraft} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dictamen del Docente *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APROBAR')}
                    className={`py-2 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${
                      reviewAction === 'APROBAR'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Avalar (APROBADO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('RECHAZAR')}
                    className={`py-2 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${
                      reviewAction === 'RECHAZAR'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    Rechazar con Notas
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Observaciones Formativas y Retroalimentación Pedagógica *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Indique las correcciones doctrinales, jurisprudenciales o procesales requeridas..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setReviewModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submittingReview}>
                  {submittingReview ? 'Registrando...' : 'Emitir Aval Jurídico'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ACTUACIÓN */}
      {actModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Registrar Actuación Procesal</h3>
              <button onClick={() => setActModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleCreateActuacion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Actuación *</label>
                <select
                  value={newAct.tipo}
                  onChange={(e) => setNewAct({ ...newAct, tipo: e.target.value as TipoActuacion })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="NOTIFICACION_JUZGADO">Notificación del Juzgado / Auto</option>
                  <option value="RADICACION_MEMORIAL">Radicación de Memorial</option>
                  <option value="AUDIENCIA">Asistencia a Audiencia</option>
                  <option value="SENTENCIA">Notificación de Sentencia</option>
                  <option value="ENTREGA_DOCUMENTOS">Devolución / Entrega Documentos</option>
                  <option value="OTRO">Otra Actuación</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción de la Novedad *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalle de la actuación procesal ocurrida..."
                  value={newAct.descripcion}
                  onChange={(e) => setNewAct({ ...newAct, descripcion: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha Límite / Vencimiento de Términos (Opcional)
                </label>
                <input
                  type="date"
                  value={newAct.fechaVencimientoTermino}
                  onChange={(e) => setNewAct({ ...newAct, fechaVencimientoTermino: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setActModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={savingAct}>
                  {savingAct ? 'Registrando...' : 'Registrar Actuación'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNACIÓN */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Asignar Docente y Pasante</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Docente Supervisor</label>
                <select
                  value={selectedDocenteId}
                  onChange={(e) => setSelectedDocenteId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">-- Seleccionar Docente --</option>
                  {availableUsers
                    .filter((u) => u.role === 'DOCENTE_SUPERVISOR' || u.role === 'DIRECTOR')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pasante Responsable</label>
                <select
                  value={selectedPasanteId}
                  onChange={(e) => setSelectedPasanteId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">-- Seleccionar Pasante --</option>
                  {availableUsers
                    .filter((u) => u.role === 'PASANTE')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setAssignModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={assigning}>
                  {assigning ? 'Asignando...' : 'Guardar Asignación'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CIERRE */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Solicitud Formal de Cierre</h3>
              <button onClick={() => setCloseModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleRequestClose} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo de Culminación *</label>
                <Input
                  required
                  placeholder="Ej. Sentencia favorable en primera instancia"
                  value={closeData.motivo}
                  onChange={(e) => setCloseData({ ...closeData, motivo: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Informe Final de Gestión *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describa el resumen de actuaciones y resultado obtenido en la causa..."
                  value={closeData.informeFinal}
                  onChange={(e) => setCloseData({ ...closeData, informeFinal: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setCloseModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={closing}>
                  {closing ? 'Enviando...' : 'Radicar Solicitud de Cierre'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
