import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Settings, User, Shield, Building2, Sun, Moon, FolderTree, Plus, Trash2, Edit2, Upload, Save } from 'lucide-react'
import toast from 'react-hot-toast'

type Tab = 'empresa' | 'usuarios' | 'categorias' | 'tema' | 'perfil'

interface TabConfig {
  id: Tab
  label: string
  icon: React.ReactNode
}

const tabs: TabConfig[] = [
  { id: 'empresa', label: 'Dados da Empresa', icon: <Building2 className="w-4 h-4" /> },
  { id: 'usuarios', label: 'Usuários', icon: <User className="w-4 h-4" /> },
  { id: 'categorias', label: 'Categorias', icon: <FolderTree className="w-4 h-4" /> },
  { id: 'tema', label: 'Tema', icon: <Sun className="w-4 h-4" /> },
  { id: 'perfil', label: 'Meu Perfil', icon: <Shield className="w-4 h-4" /> },
]

const cargoVariant: Record<string, 'danger' | 'info' | 'default'> = {
  admin: 'danger',
  gerente: 'info',
  funcionario: 'default',
}

export function SettingsPage() {
  const { empresa: empresaCtx, user: userCtx } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('empresa')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  return (
    <div>
      <PageHeader title="Configurações" description="Gerencie as configurações do sistema" />

      <div className="flex gap-1 mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'empresa' && <DadosEmpresa />}
      {activeTab === 'usuarios' && <Usuarios />}
      {activeTab === 'categorias' && <Categorias />}
      {activeTab === 'tema' && <TemaSection theme={theme} setTheme={setTheme} />}
      {activeTab === 'perfil' && <MeuPerfil />}
    </div>
  )
}

function DadosEmpresa() {
  const { empresa: empresaCtx } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
  })
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    if (empresaCtx) {
      setForm({
        nome: empresaCtx.nome || '',
        cnpj: empresaCtx.cnpj || '',
        telefone: empresaCtx.telefone || '',
        email: empresaCtx.email || '',
        endereco: empresaCtx.endereco || '',
        cidade: empresaCtx.cidade || '',
        estado: empresaCtx.estado || '',
      })
      setLogoUrl(empresaCtx.logo || '')
    }
  }, [empresaCtx])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !empresaCtx) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${empresaCtx.id}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      const url = publicUrlData.publicUrl
      setLogoUrl(url)

      const { error: updateError } = await supabase
        .from('empresas')
        .update({ logo: url })
        .eq('id', empresaCtx.id)

      if (updateError) throw updateError

      toast.success('Logo atualizado com sucesso')
    } catch {
      toast.error('Erro ao fazer upload do logo')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!empresaCtx) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('empresas')
        .update(form)
        .eq('id', empresaCtx.id)

      if (error) throw error
      toast.success('Dados da empresa atualizados com sucesso')
    } catch {
      toast.error('Erro ao salvar dados da empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            label="Nome da Empresa"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          />
          <Input
            label="CNPJ"
            value={form.cnpj}
            onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
          />
          <Input
            label="Telefone"
            value={form.telefone}
            onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Endereço"
            value={form.endereco}
            onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
          />
          <Input
            label="Cidade"
            value={form.cidade}
            onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
          />
          <Input
            label="Estado"
            value={form.estado}
            onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
          />
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-zinc-400 block mb-1">Logo</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="w-24 h-24 rounded-xl border border-zinc-700 overflow-hidden bg-zinc-800 flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
              >
                <Upload className="w-4 h-4" />
                {logoUrl ? 'Trocar Logo' : 'Upload Logo'}
              </Button>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} loading={loading}>
          <Save className="w-4 h-4" />
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  )
}

function Usuarios() {
  const { empresa, user: currentUser } = useAuth()
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string; email: string; cargo: string }>>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{ id: string; nome: string; email: string; cargo: string } | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', cargo: 'funcionario' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (empresa) loadUsuarios()
  }, [empresa])

  async function loadUsuarios() {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, cargo')
        .eq('empresa_id', empresa!.id)
        .order('nome')

      if (error) throw error
      setUsuarios(data || [])
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingUser(null)
    setForm({ nome: '', email: '', cargo: 'funcionario' })
    setModalOpen(true)
  }

  function openEditModal(user: { id: string; nome: string; email: string; cargo: string }) {
    setEditingUser(user)
    setForm({ nome: user.nome, email: user.email, cargo: user.cargo })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!empresa) return
    setSaving(true)
    try {
      if (editingUser) {
        const { error } = await supabase
          .from('usuarios')
          .update({ nome: form.nome, cargo: form.cargo })
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('Usuário atualizado com sucesso')
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: '123456',
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Erro ao criar usuário')

        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: authData.user.id,
            email: form.email,
            nome: form.nome,
            cargo: form.cargo,
            empresa_id: empresa.id,
          })

        if (insertError) throw insertError
        toast.success('Usuário criado com sucesso. Senha padrão: 123456')
      }

      setModalOpen(false)
      loadUsuarios()
    } catch {
      toast.error('Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', userId)

      if (error) throw error
      toast.success('Usuário excluído com sucesso')
      loadUsuarios()
    } catch {
      toast.error('Erro ao excluir usuário')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Cargo</th>
                  <th className="px-4 py-3 text-center text-zinc-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  usuarios.map(u => (
                    <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 text-zinc-100">{u.nome}</td>
                      <td className="px-4 py-3 text-zinc-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cargoVariant[u.cargo] || 'default'}>
                          {u.cargo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            disabled={!!editingUser}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-400">Cargo</label>
            <select
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200"
              value={form.cargo}
              onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
            >
              <option value="admin">Admin</option>
              <option value="gerente">Gerente</option>
              <option value="funcionario">Funcionário</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" />
              {editingUser ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function Categorias() {
  const { empresa } = useAuth()
  const [categorias, setCategorias] = useState<Array<{ id: string; nome: string; descricao: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<{ id: string; nome: string; descricao: string } | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (empresa) loadCategorias()
  }, [empresa])

  async function loadCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome, descricao')
        .eq('empresa_id', empresa!.id)
        .order('nome')

      if (error) throw error
      setCategorias(data || [])
    } catch {
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingCat(null)
    setForm({ nome: '', descricao: '' })
    setModalOpen(true)
  }

  function openEditModal(cat: { id: string; nome: string; descricao: string | null }) {
    setEditingCat(cat as { id: string; nome: string; descricao: string })
    setForm({ nome: cat.nome, descricao: cat.descricao || '' })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!empresa) return
    setSaving(true)
    try {
      if (editingCat) {
        const { error } = await supabase
          .from('categorias')
          .update({ nome: form.nome, descricao: form.descricao })
          .eq('id', editingCat.id)

        if (error) throw error
        toast.success('Categoria atualizada com sucesso')
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert({
            nome: form.nome,
            descricao: form.descricao,
            empresa_id: empresa.id,
          })

        if (error) throw error
        toast.success('Categoria criada com sucesso')
      }

      setModalOpen(false)
      loadCategorias()
    } catch {
      toast.error('Erro ao salvar categoria')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(catId: string) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', catId)

      if (error) throw error
      toast.success('Categoria excluída com sucesso')
      loadCategorias()
    } catch {
      toast.error('Erro ao excluir categoria')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Nova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Nome</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Descrição</th>
                  <th className="px-4 py-3 text-center text-zinc-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categorias.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                      Nenhuma categoria encontrada
                    </td>
                  </tr>
                ) : (
                  categorias.map(cat => (
                    <tr key={cat.id} className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 text-zinc-100 font-medium">{cat.nome}</td>
                      <td className="px-4 py-3 text-zinc-300">{cat.descricao || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          />
          <Input
            label="Descrição"
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" />
              {editingCat ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function TemaSection({ theme, setTheme }: { theme: 'light' | 'dark'; setTheme: (t: 'light' | 'dark') => void }) {
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)

    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferência de Tema</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-blue-400" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
            <div>
              <p className="text-sm font-medium text-zinc-100">
                Tema {theme === 'dark' ? 'Escuro' : 'Claro'}
              </p>
              <p className="text-xs text-zinc-500">
                {theme === 'dark'
                  ? 'Modo escuro ativado para toda a aplicação'
                  : 'Modo claro ativado para toda a aplicação'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              'relative w-14 h-7 rounded-full transition-colors duration-300',
              theme === 'dark' ? 'bg-blue-600' : 'bg-zinc-600'
            )}
          >
            <div
              className={cn(
                'absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-md',
                theme === 'dark' ? 'left-8' : 'left-1'
              )}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function MeuPerfil() {
  const { user: currentUser } = useAuth()
  const [form, setForm] = useState({ nome: '', email: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setForm({ nome: currentUser.nome || '', email: currentUser.email || '' })
    }
  }, [currentUser])

  async function handleSave() {
    if (!currentUser) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nome: form.nome })
        .eq('id', currentUser.id)

      if (error) throw error
      toast.success('Perfil atualizado com sucesso')
    } catch {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            label="Nome"
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            disabled
          />
        </div>
        <Button onClick={handleSave} loading={loading}>
          <Save className="w-4 h-4" />
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  )
}
