import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <ShieldCheck className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Página no encontrada</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
