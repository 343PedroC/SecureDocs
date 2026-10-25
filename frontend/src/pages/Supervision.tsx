import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  Award,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { draftsAPI, type EscritoProcesal } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'

export function Supervision() {
  const navigate = useNavigate()
  const [pendingDrafts, setPendingDrafts] = useState<EscritoProcesal[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de revisión
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<EscritoProcesal | null>(null)
  const [action, setAction] = useState<'APROBAR' | 'RECHAZAR'>('APROBAR')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  const loadPending = async () => {
    try {
      setLoading(true)
      const res = await draftsAPI.getPendingReview()
      setPendingDrafts(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDraft) return
    try {
      setSubmitting(true)
      await draftsAPI.reviewDraft(selectedDraft.id, {
        accion: action,
        observacionesDocente: notes,
      })
      setReviewModalOpen(false)
      setSelectedDraft(null)
      setNotes('')
      setFeedbackMsg(action === 'APROBAR' ? 'Escrito procesal APROBADO con aval docente.' : 'Escrito devuelto al pasante con observaciones.')
      loadPending()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error en revisión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-indigo-600" />
          Supervisión Académica y Control de Calidad Jurídica
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Bandeja de memoriales y escritos sometidos a revisión docente conforme al CUN-05 y Ley 2113 de 2021.
        </p>
      </div>

      {feedbackMsg && <Alert variant="success">{feedbackMsg}</Alert>}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
            <FileText className="h-4 w-4 text-indigo-600" />
            Memoriales Pendientes de Aval ({pendingDrafts.length})
          </div>
          <Button size="sm" variant="secondary" onClick={loadPending} disabled={loading}>
            Actualizar
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 py-10 text-center">Consultando escritos pendientes...</p>
        ) : pendingDrafts.length === 0 ? (
          <div className="py-14 text-center text-gray-400 space-y-2">
            <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500 opacity-80" />
            <p className="text-sm font-semibold text-gray-700">No hay escritos pendientes de revisión</p>
            <p className="text-xs text-gray-400">Todos los memoriales de sus expedientes asignados se encuentran al día.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingDrafts.map((draft) => (
              <div key={draft.id} className="py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {(draft as any).expediente?.radicado}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm">{draft.titulo}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Tipo: <strong className="text-gray-700">{draft.tipo}</strong> • Redactado por: <strong>{draft.autor?.name}</strong> •
                      Enviado: {draft.fechaEnvioRevision ? new Date(draft.fechaEnvioRevision).toLocaleDateString() : 'Hoy'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="blue">En Revisión</Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDraft(draft)
                        setReviewModalOpen(true)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Award className="h-3.5 w-3.5 mr-1" />
                      Revisar y Avalar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/cases/${draft.expedienteId}`)}
                    >
                      Ver Caso
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs font-mono text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {draft.contenido}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE REVISIÓN DOCENTE */}
      {reviewModalOpen && selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                Aval Jurídico Docente (CUN-05)
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Documento: <strong className="text-gray-800">{selectedDraft.titulo}</strong>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAction('APROBAR')}
                    className={`py-2 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${
                      action === 'APROBAR'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Avalar (APROBADO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('RECHAZAR')}
                    className={`py-2 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${
                      action === 'RECHAZAR'
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
                  placeholder="Señale las indicaciones doctrinales, jurisprudenciales o procesales para el pasante..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setReviewModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Procesando...' : 'Confirmar Dictamen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
