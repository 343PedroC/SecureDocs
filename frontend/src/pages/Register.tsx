import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'

interface FormValues {
  name: string
  email: string
  password: string
}

export function Register() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (data: FormValues) => {
    setError('')
    try {
      await api.post('/auth/register', data)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al registrarse'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-8 w-8 text-indigo-400" />
            <span className="text-2xl font-bold text-white">SecureDocs</span>
          </div>
          <p className="text-gray-400 text-sm">Gestión segura de documentos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Crear cuenta</h1>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}
          {success && (
            <div className="mb-4">
              <Alert variant="success">Cuenta creada. Redirigiendo al login...</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nombre completo"
              type="text"
              placeholder="Pedro Gutierrez"
              error={errors.name?.message}
              {...register('name', { required: 'El nombre es requerido', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="usuario@ejemplo.com"
              error={errors.email?.message}
              {...register('email', { required: 'El correo es requerido' })}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              error={errors.password?.message}
              {...register('password', {
                required: 'La contraseña es requerida',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
            />
            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Crear cuenta
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
