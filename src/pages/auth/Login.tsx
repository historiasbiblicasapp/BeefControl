import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Store, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const error = await signIn(email, password)
    setLoading(false)
    if (error) toast.error(error)
    else toast.success('Login realizado!')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">BeefControl</h1>
          <p className="text-zinc-500 mt-1">Sistema de Gestão para Açougues</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-100">Entrar</h2>

          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            icon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            icon={<Lock className="w-4 h-4" />}
          />

          <Button type="submit" loading={loading} className="w-full">
            <Lock className="w-4 h-4" />
            Entrar
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Link to="/auth/cadastro" className="text-red-400 hover:text-red-300 transition-colors">
              Criar conta
            </Link>
            <Link to="/auth/recuperar-senha" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Esqueceu a senha?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
