import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Store, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export function ResetPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const error = await resetPassword(email)
    setLoading(false)
    if (error) toast.error(error)
    else { setSent(true); toast.success('Email de recuperação enviado!') }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md text-center">
          <Mail className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Email enviado!</h2>
          <p className="text-zinc-500 mb-4">Verifique sua caixa de entrada e siga as instruções.</p>
          <Link to="/auth/login" className="text-red-400 hover:text-red-300 text-sm">Voltar ao login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Recuperar Senha</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <Input label="Email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" loading={loading} className="w-full">Enviar link de recuperação</Button>
          <p className="text-center text-sm text-zinc-500">
            <Link to="/auth/login" className="text-red-400 hover:text-red-300">Voltar ao login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
