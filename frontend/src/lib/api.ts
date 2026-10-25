import axios from 'axios'
import type { Role } from '../store/auth.store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ==========================================
// TIPOS DEL CONSULTORIO JURÍDICO
// ==========================================

export type AreaJuridica = 'CIVIL' | 'LABORAL' | 'PENAL' | 'FAMILIA' | 'PUBLICO'
export type EstadoExpediente =
  | 'ADMITIDO'
  | 'ASIGNADO'
  | 'EN_TRAMITE'
  | 'EN_REVISION_DOCENTE'
  | 'PENDIENTE_CIERRE'
  | 'ARCHIVADO'
export type NivelSensibilidad = 'NORMAL' | 'MAXIMA_SENSIBILIDAD'
export type EstadoEscrito = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO'
export type TipoEscrito =
  | 'TUTELA'
  | 'DEMANDA'
  | 'DERECHO_PETICION'
  | 'RECURSO'
  | 'CONCILIACION'
  | 'MEMORIAL'
  | 'OTRO'
export type TipoActuacion =
  | 'AUDIENCIA'
  | 'NOTIFICACION_JUZGADO'
  | 'RADICACION_MEMORIAL'
  | 'AUTO_INTERLOCUTORIO'
  | 'SENTENCIA'
  | 'ENTREGA_DOCUMENTOS'
  | 'OTRO'
export type TipoDocumental =
  | 'PODER'
  | 'PRUEBA'
  | 'DOCUMENTO_IDENTIDAD'
  | 'MEMORIAL'
  | 'ACTA_CONCILIACION'
  | 'SENTENCIA'
  | 'OTRO'
export type EstadoTurno = 'EN_ESPERA' | 'ATENDIENDO' | 'FINALIZADO' | 'CANCELADO'

export interface Cliente {
  id: string
  tipoDocumento: string
  numeroDocumento: string
  nombreCompleto: string
  telefono?: string
  email?: string
  direccion?: string
  estrato: number
  grupoSisben?: string
  declaracionIndefension: boolean
  esVictimaViolencia: boolean
  esMenorEdad: boolean
  indiceVulnerabilidad?: number
  consentimientoHabeasData: boolean
  fechaConsentimiento?: string
  createdAt: string
  expedientes?: ExpedienteSummary[]
}

export interface ExpedienteSummary {
  id: string
  radicado: string
  areaJuridica: AreaJuridica
  tipoCaso: string
  estado: EstadoExpediente
  fechaApertura: string
}

export interface TurnoAtencion {
  id: string
  numeroTurno: number
  fecha: string
  estado: EstadoTurno
  clienteId: string
  cliente: Cliente
  observaciones?: string
  atendidoPor?: { id: string; name: string; role: Role }
}

export interface DocumentItem {
  id: string
  originalName: string
  mimeType: string
  size: number
  sha256: string
  tipoDocumental?: TipoDocumental
  createdAt: string
}

export interface EscritoProcesal {
  id: string
  expedienteId: string
  autorId: string
  autor?: { id: string; name: string; role: Role }
  titulo: string
  tipo: TipoEscrito
  contenido: string
  version: number
  estado: EstadoEscrito
  observacionesDocente?: string
  revisadoPor?: { id: string; name: string; role: Role }
  fechaEnvioRevision?: string
  fechaAprobacion?: string
  createdAt: string
  updatedAt: string
}

export interface ActuacionProcesal {
  id: string
  expedienteId: string
  tipo: TipoActuacion
  descripcion: string
  fechaActuacion: string
  fechaVencimientoTermino?: string
  terminoCumplido: boolean
  documentoSoporteId?: string
  registradoPor?: { id: string; name: string; role: Role }
  createdAt: string
}

export interface SolicitudCierre {
  id: string
  expedienteId: string
  informeFinalPasante: string
  avalDocente: boolean
  observacionesDocente?: string
  aprobacionDirector: boolean
  observacionesDirector?: string
  devolucionOriginalesUsuario: boolean
  fechaSolicitud: string
  fechaAprobacion?: string
}

export interface Expediente {
  id: string
  radicado: string
  areaJuridica: AreaJuridica
  tipoCaso: string
  hechos?: string
  pretensiones?: string
  sensibilidad: NivelSensibilidad
  estado: EstadoExpediente
  contraparteNombre?: string
  contraparteDocumento?: string
  clienteId: string
  cliente: Cliente
  docenteSupervisorId?: string
  docenteSupervisor?: { id: string; name: string; email: string }
  pasanteId?: string
  pasante?: { id: string; name: string; email: string }
  fechaApertura: string
  fechaAsignacion?: string
  fechaCierre?: string
  motivoCierre?: string
  documentos?: DocumentItem[]
  escritos?: EscritoProcesal[]
  actuaciones?: ActuacionProcesal[]
  solicitudCierre?: SolicitudCierre
  _count?: {
    documentos: number
    escritos: number
    actuaciones: number
  }
}

export interface AlertaTermino {
  actuacionId: string
  expedienteId: string
  radicado: string
  tipoCaso: string
  descripcion: string
  fechaVencimiento: string
  diasRestantes: number
  nivelAlerta: 'VENCIDO' | 'ALERTA_1_DIA' | 'ALERTA_3_DIAS' | 'ALERTA_7_DIAS' | 'NORMAL'
  pasante?: { id: string; name: string }
  docenteSupervisor?: { id: string; name: string }
}

// ==========================================
// CLIENTES DE API
// ==========================================

export const admissionsAPI = {
  createClient: (data: any) => api.post<{ cliente: Cliente; esAdmisible: boolean; mensaje: string }>('/admissions/clients', data),
  searchClients: (q?: string) => api.get<Cliente[]>(`/admissions/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getClientById: (id: string) => api.get<Cliente>(`/admissions/clients/${id}`),
  createTurno: (data: { clienteId: string; observaciones?: string }) => api.post<TurnoAtencion>('/admissions/turnos', data),
  getTodayTurnos: () => api.get<TurnoAtencion[]>('/admissions/turnos/today'),
  updateTurnoStatus: (id: string, estado: EstadoTurno) => api.patch<TurnoAtencion>(`/admissions/turnos/${id}/status`, { estado }),
}

export const casesAPI = {
  getCases: (params?: { area?: string; estado?: string; search?: string }) => {
    const query = new URLSearchParams()
    if (params?.area) query.append('area', params.area)
    if (params?.estado) query.append('estado', params.estado)
    if (params?.search) query.append('search', params.search)
    const qs = query.toString()
    return api.get<Expediente[]>(`/cases${qs ? `?${qs}` : ''}`)
  },
  getCase: (id: string) => api.get<Expediente>(`/cases/${id}`),
  createCase: (data: any) => api.post<Expediente>('/cases', data),
  assignCase: (id: string, data: { docenteSupervisorId?: string; pasanteId?: string }) =>
    api.patch<Expediente>(`/cases/${id}/assign`, data),
  requestClose: (id: string, data: { informeFinalPasante: string; motivoCierre: string }) =>
    api.post<Expediente>(`/cases/${id}/close-request`, data),
  endorseClose: (id: string, data: { observacionesDocente?: string }) =>
    api.patch(`/cases/${id}/close-endorse`, data),
  approveClose: (id: string, data: { observacionesDirector?: string; devolucionOriginalesUsuario: boolean }) =>
    api.patch<Expediente>(`/cases/${id}/close-approve`, data),
}

export const draftsAPI = {
  createDraft: (data: { expedienteId: string; titulo: string; tipo: TipoEscrito; contenido: string }) =>
    api.post<EscritoProcesal>('/legal-drafts', data),
  updateDraft: (id: string, data: { titulo?: string; contenido?: string }) =>
    api.patch<EscritoProcesal>(`/legal-drafts/${id}`, data),
  submitForReview: (id: string) => api.post<EscritoProcesal>(`/legal-drafts/${id}/submit`),
  reviewDraft: (id: string, data: { accion: 'APROBAR' | 'RECHAZAR'; observacionesDocente: string }) =>
    api.post<EscritoProcesal>(`/legal-drafts/${id}/review`, data),
  getPendingReview: () => api.get<EscritoProcesal[]>('/legal-drafts/pending-review'),
  getByExpediente: (expedienteId: string) => api.get<EscritoProcesal[]>(`/legal-drafts/expediente/${expedienteId}`),
  getDraft: (id: string) => api.get<EscritoProcesal>(`/legal-drafts/${id}`),
}

export const proceedingsAPI = {
  create: (data: {
    expedienteId: string
    tipo: TipoActuacion
    descripcion: string
    fechaActuacion?: string
    fechaVencimientoTermino?: string
    documentoSoporteId?: string
  }) => api.post<ActuacionProcesal>('/proceedings', data),
  getByExpediente: (expedienteId: string) => api.get<ActuacionProcesal[]>(`/proceedings/expediente/${expedienteId}`),
  getAlerts: () => api.get<AlertaTermino[]>('/proceedings/alerts'),
  completeTerm: (id: string) => api.patch(`/proceedings/${id}/complete`),
}

// ==========================================
// DOCUMENTOS CIFRADOS (EXISTENTE AMPLIADO)
// ==========================================

export interface EncryptedVersion {
  id: string
  versionNumber: number
  originalName: string
  mimeType: string
  size: number
  sha256: string
  createdAt: string
  encryptionIv: string
  encryptionAuthTag: string
  storageKey: string
}

export const documentVersionAPI = {
  getVersions: (documentId: string) =>
    api.get<EncryptedVersion[]>(`/documents/${documentId}/versions`),
  downloadVersion: (documentId: string, versionId: string) =>
    api.get(`/documents/${documentId}/versions/${versionId}/download`, {
      responseType: 'blob',
    }),
  getVersionMetadata: (documentId: string) =>
    api.get<EncryptedVersion[]>(`/documents/${documentId}/versions`),
}
