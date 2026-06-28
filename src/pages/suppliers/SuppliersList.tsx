import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Search, Phone, MapPin, Building2, Trash2, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Fornecedor } from '../../types'

interface FormData {
  nome: string
  telefone: string
  whatsapp: string
  cidade: string
  cpf_cnpj: string
  observacoes: string
}

const emptyForm: FormData = {
  nome: '', telefone: '', whatsapp: '', cidade: '', cpf_cnpj: '', observacoes: '',
}

export function SuppliersList() {
  const { user, empresa } = useAuth()
  const [suppliers, setSuppliers] = useState<Fornecedor[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const empresaId = empresa?.id

  async function loadSuppliers() {
    if (!empresaId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome')
    if (error) toast.error('Erro ao carregar fornecedores')
    else setSuppliers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadSuppliers()
  }, [empresaId])

  const filtered = suppliers.filter(s =>
    s.nome.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(supplier: Fornecedor) {
    setEditingId(supplier.id)
    setForm({
      nome: supplier.nome,
      telefone: supplier.telefone ?? '',
      whatsapp: supplier.whatsapp ?? '',
      cidade: supplier.cidade ?? '',
      cpf_cnpj: supplier.cpf_cnpj ?? '',
      observacoes: supplier.observacoes ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!empresaId || !user) return
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    setSaving(true)

    if (editingId) {
      const { error } = await supabase
        .from('fornecedores')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editingId)
      if (error) toast.error('Erro ao atualizar fornecedor')
      else { toast.success('Fornecedor atualizado!'); setModalOpen(false); loadSuppliers() }
    } else {
      const { error } = await supabase
        .from('fornecedores')
        .insert({ ...form, empresa_id: empresaId, created_by: user.id })
      if (error) toast.error('Erro ao criar fornecedor')
      else { toast.success('Fornecedor criado!'); setModalOpen(false); loadSuppliers() }
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    const { error } = await supabase.from('fornecedores').delete().eq('id', deleteId)
    if (error) toast.error('Erro ao excluir fornecedor')
    else { toast.success('Fornecedor excluído!'); setDeleteId(null); loadSuppliers() }
  }

  function setField(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Novo Fornecedor
          </Button>
        }
      />

      <div className="mb-6">
        <Input
          placeholder="Buscar fornecedor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum fornecedor encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(supplier => (
            <Card key={supplier.id}>
              <CardHeader>
                <CardTitle>{supplier.nome}</CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(supplier)}
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(supplier.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.cpf_cnpj && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Badge>{supplier.cpf_cnpj}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {supplier.telefone && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Phone className="w-4 h-4 text-zinc-600" />
                      {supplier.telefone}
                    </div>
                  )}
                  {supplier.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Phone className="w-4 h-4 text-green-600" />
                      {supplier.whatsapp}
                    </div>
                  )}
                  {supplier.cidade && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="w-4 h-4 text-zinc-600" />
                      {supplier.cidade}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-600">Criado em {formatDate(supplier.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={e => setField('nome', e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefone" value={form.telefone} onChange={e => setField('telefone', e.target.value)} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={e => setField('whatsapp', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cidade" value={form.cidade} onChange={e => setField('cidade', e.target.value)} />
            <Input label="CPF/CNPJ" value={form.cpf_cnpj} onChange={e => setField('cpf_cnpj', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-400 block mb-1">Observações</label>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 min-h-[100px] resize-y"
              value={form.observacoes}
              onChange={e => setField('observacoes', e.target.value)}
              placeholder="Observações..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir Fornecedor"
      >
        <p className="text-zinc-400 mb-6">Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
