import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Store, User, Mail, Lock, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function Register() {
  const { signUp } = useAuth()
  const [nome, setNome] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const error = await signUp(email, password, nome, empresaNome)
    setLoading(false)
    if (error) toast.error(error)
    else toast.success('Conta criada! Verifique seu email para confirmar.')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Criar Conta</h1>
          <p className="text-zinc-500 mt-1">Comece a gerenciar seu açougue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <Input label="Seu nome" placeholder="João Silva" value={nome} onChange={e => setNome(e.target.value)} required icon={<User className="w-4 h-4" />} />
          <Input label="Nome da empresa" placeholder="Açougue do João" value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} required icon={<Building2 className="w-4 h-4" />} />
          <Input label="Email" type="email" placeholder="joao@email.com" value={email} onChange={e => setEmail(e.target.value)} required icon={<Mail className="w-4 h-4" />} />
          <Input label="Senha" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} icon={<Lock className="w-4 h-4" />} />

          <Button type="submit" loading={loading} className="w-full">
            <User className="w-4 h-4" />
            Criar conta
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Já tem conta?{' '}
            <Link to="/auth/login" className="text-red-400 hover:text-red-300">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
