import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Shield,
  Users,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'user', 'auditor'] },
  { to: '/documents', label: 'Documentos', icon: FileText, roles: ['admin', 'user'] },
  { to: '/audit', label: 'Auditoría', icon: Shield, roles: ['admin', 'auditor'] },
  { to: '/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filtered = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false,
  )

  return (
    <aside className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-700">
        <ShieldCheck className="h-6 w-6 text-indigo-400" />
        <span className="text-lg font-bold tracking-tight">SecureDocs</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {filtered.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium text-white truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-indigo-900 px-2 py-0.5 text-xs font-medium text-indigo-300 capitalize">
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
