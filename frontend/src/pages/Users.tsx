import { useEffect, useState } from 'react'
import { Users as UsersIcon, ShieldCheck, UserX, UserCheck, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'auditor'
  isActive: boolean
  createdAt: string
}

const ROLE_COLORS: Record<string, 'blue' | 'green' | 'yellow'> = {
  admin: 'blue',
  user: 'green',
  auditor: 'yellow',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  user: 'Usuario',
  auditor: 'Auditor',
}

const ROLES: User['role'][] = ['admin', 'user', 'auditor']

export function Users() {
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const load = () =>
    api
      .get('/users')
      .then((r) => setUsers(r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleChangeRole = async (user: User, role: User['role']) => {
    if (role === user.role) return
    setActionId(user.id)
    setError('')
    try {
      await api.patch(`/users/${user.id}/role`, { role })
      setSuccess(`Rol de ${user.name} cambiado a ${ROLE_LABELS[role]}.`)
      await load()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al cambiar el rol'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setActionId(null)
    }
  }

  const handleToggleActive = async (user: User) => {
    const action = user.isActive ? 'disable' : 'enable'
    const confirmMsg = user.isActive
      ? `¿Desactivar la cuenta de ${user.name}? No podrá iniciar sesión.`
      : `¿Activar la cuenta de ${user.name}?`
    if (!confirm(confirmMsg)) return
    setActionId(user.id)
    setError('')
    try {
      await api.patch(`/users/${user.id}/${action}`)
      setSuccess(`Cuenta de ${user.name} ${user.isActive ? 'desactivada' : 'activada'} correctamente.`)
      await load()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al cambiar el estado'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona roles y estado de los usuarios registrados
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <UsersIcon className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-500">No hay usuarios registrados</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id
                const busy = actionId === user.id
                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isSelf ? (
                        <Badge variant={ROLE_COLORS[user.role] ?? 'gray'}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </Badge>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user, e.target.value as User['role'])}
                          disabled={busy}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.isActive ? 'green' : 'gray'}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={busy}
                            title={user.isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                              user.isActive
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">
                              {user.isActive ? 'Desactivar' : 'Activar'}
                            </span>
                          </button>
                        )}
                        {isSelf && (
                          <span className="inline-flex items-center gap-1 text-xs text-indigo-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Tú
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
