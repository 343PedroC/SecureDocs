import { useState } from 'react'
import { User, Lock, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'

export function Profile() {
  const { user, setAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)

  const [name, setName] = useState(user?.name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      const res = await api.patch('/auth/profile', { name })
      if (user && token) {
        setAuth({ ...user, name: res.data.name }, token)
      }
      setProfileMsg({ type: 'success', text: 'Nombre actualizado correctamente.' })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al actualizar el perfil'
      setProfileMsg({ type: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' })
      return
    }
    setSavingPassword(true)
    try {
      await api.patch('/auth/password', { currentPassword, newPassword })
      setPasswordMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al cambiar la contraseña'
      setPasswordMsg({ type: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tu información personal y seguridad</p>
      </div>

      {/* Profile info */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Información personal</h2>
        </div>

        <div className="mb-4 space-y-1">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Email:</span> {user?.email}
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Rol:</span>{' '}
            <span className="capitalize">{user?.role}</span>
          </p>
        </div>

        {profileMsg && (
          <div className="mb-4">
            <Alert variant={profileMsg.type === 'success' ? 'success' : 'error'}>
              {profileMsg.type === 'success' && <CheckCircle className="h-4 w-4 inline mr-1" />}
              {profileMsg.text}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
          <Button type="submit" loading={savingProfile}>
            Guardar nombre
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Cambiar contraseña</h2>
        </div>

        {passwordMsg && (
          <div className="mb-4">
            <Alert variant={passwordMsg.type === 'success' ? 'success' : 'error'}>
              {passwordMsg.text}
            </Alert>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={savingPassword} variant="secondary">
            Cambiar contraseña
          </Button>
        </form>
      </div>
    </div>
  )
}
