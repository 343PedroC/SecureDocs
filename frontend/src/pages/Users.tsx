import { useEffect, useState } from 'react'
import { Users as UsersIcon } from 'lucide-react'
import { api } from '../lib/api'
import { Badge } from '../components/ui/Badge'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'auditor'
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

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/users')
      .then((r) => setUsers(r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Listado de todos los usuarios registrados en la plataforma
        </p>
      </div>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Registro</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={ROLE_COLORS[user.role] ?? 'gray'}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
