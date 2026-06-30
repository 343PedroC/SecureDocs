import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface AlertProps {
  children: ReactNode
  variant?: 'error' | 'success' | 'info'
}

const config = {
  error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', Icon: AlertCircle, iconColor: 'text-red-500' },
  success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', Icon: CheckCircle, iconColor: 'text-green-500' },
  info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', Icon: Info, iconColor: 'text-blue-500' },
}

export function Alert({ children, variant = 'info' }: AlertProps) {
  const { bg, text, Icon, iconColor } = config[variant]
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${bg} ${text}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <span>{children}</span>
    </div>
  )
}
