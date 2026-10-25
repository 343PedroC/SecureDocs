import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderLock,
  UserPlus,
  GraduationCap,
  BellRing,
  FileText,
  Shield,
  Users,
  LogOut,
  ShieldCheck,
  UserCircle,
  BarChart3,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: [
      'admin',
      'user',
      'auditor',
      'DIRECTOR',
      'DOCENTE_SUPERVISOR',
      'PASANTE',
      'ADMINISTRATIVO',
      'ADMIN_TI',
    ],
  },
  {
    to: '/cases',
    label: 'Expedientes',
    icon: FolderLock,
    roles: [
      'DIRECTOR',
      'DOCENTE_SUPERVISOR',
      'PASANTE',
      'ADMINISTRATIVO',
      'ADMIN_TI',
      'admin',
    ],
  },
  {
    to: '/admissions',
    label: 'Admisión y Turnos',
    icon: UserPlus,
    roles: ['ADMINISTRATIVO', 'PASANTE', 'DIRECTOR', 'admin'],
  },
  {
    to: '/supervision',
    label: 'Supervisión Docente',
    icon: GraduationCap,
    roles: ['DOCENTE_SUPERVISOR', 'DIRECTOR', 'admin'],
  },
  {
    to: '/alerts',
    label: 'Alertas de Términos',
    icon: BellRing,
    roles: ['PASANTE', 'DOCENTE_SUPERVISOR', 'DIRECTOR', 'admin'],
  },
  {
    to: '/documents',
    label: 'Bóveda Cifrada',
    icon: FileText,
    roles: [
      'admin',
      'user',
      'DIRECTOR',
      'DOCENTE_SUPERVISOR',
      'PASANTE',
      'ADMINISTRATIVO',
      'ADMIN_TI',
    ],
  },
  {
    to: '/audit',
    label: 'Auditoría',
    icon: Shield,
    roles: ['admin', 'auditor', 'DIRECTOR', 'ADMIN_TI'],
  },
  {
    to: '/audit/reports',
    label: 'Reportes',
    icon: BarChart3,
    roles: ['admin', 'auditor', 'DIRECTOR', 'ADMIN_TI'],
  },
  {
    to: '/users',
    label: 'Usuarios',
    icon: Users,
    roles: ['admin', 'DIRECTOR', 'ADMIN_TI'],
  },
  {
    to: '/profile',
    label: 'Mi perfil',
    icon: UserCircle,
    roles: [
      'admin',
      'user',
      'auditor',
      'DIRECTOR',
      'DOCENTE_SUPERVISOR',
      'PASANTE',
      'ADMINISTRATIVO',
      'CLIENTE',
      'ADMIN_TI',
    ],
  },
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

  const formatRoleName = (role?: string) => {
    if (!role) return ''
    switch (role) {
      case 'DOCENTE_SUPERVISOR':
        return 'Docente Supervisor'
      case 'ADMINISTRATIVO':
        return 'Personal Administrativo'
      case 'ADMIN_TI':
        return 'Administrador TI'
      default:
        return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    }
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-gray-900 text-white shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <ShieldCheck className="h-6 w-6 text-indigo-400" />
        <div>
          <span className="text-lg font-bold tracking-tight block leading-tight">SecureDocs</span>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block">
            Consultorio Jurídico
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filtered.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="mb-3 px-1">
          <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <span className="mt-1.5 inline-block rounded-full bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-300">
            {formatRoleName(user?.role)}
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
