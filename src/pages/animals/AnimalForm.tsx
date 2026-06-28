import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Beef, Save, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'

interface FornecedorOption {
  id: string
  nome: string
}

export function AnimalForm() {
  const { empresa, user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [fornecedor_id, setFornecedorId] = useState('')
  const [numero_lote, setNumeroLote] = useState('')
  const [data_compra, setDataCompra] = useState(new Date().toISOString().split('T')[0])
  const [peso_vivo, setPesoVivo] = useState(0)
  const [peso_carcaca, setPesoCarcaca] = useState(0)
  const [arrobas, setArrobas] = useState(0)
  const [preco_pago, setPrecoPago] = useState(0)
  const [frete, setFrete] = useState(0)
  const [impostos, setImpostos] = useState(0)
  const [outras_despesas, setOutrasDespesas] = useState(0)
  const [valor_total, setValorTotal] = useState(0)
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    if (!empresa) return
    loadFornecedores()
    if (isEditing) loadAnimal()
  }, [empresa, id])

  useEffect(() => {
    setArrobas(peso_carcaca / 15)
  }, [peso_carcaca])

  useEffect(() => {
    setValorTotal(preco_pago + frete + impostos + outras_despesas)
  }, [preco_pago, frete, impostos, outras_despesas])

  async function loadFornecedores() {
    const { data } = await supabase
      .from('fornecedores')
      .select('id, nome')
      .eq('empresa_id', empresa!.id)
      .order('nome')
    setFornecedores(data || [])
  }

  async function loadAnimal() {
    setLoading(true)
    const { data, error } = await supabase
      .from('animais')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      toast.error('Erro ao carregar animal')
      navigate('/animais')
      return
    }

    setFornecedorId(data.fornecedor_id)
    setNumeroLote(data.numero_lote)
    setDataCompra(data.data_compra.split('T')[0])
    setPesoVivo(data.peso_vivo)
    setPesoCarcaca(data.peso_carcaca)
    setArrobas(data.arrobas)
    setPrecoPago(data.preco_pago)
    setFrete(data.frete)
    setImpostos(data.impostos)
    setOutrasDespesas(data.outras_despesas)
    setValorTotal(data.valor_total)
    setObservacoes(data.observacoes || '')
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa || !user) return
    setSaving(true)

    const payload = {
      empresa_id: empresa.id,
      fornecedor_id,
      numero_lote,
      data_compra,
      peso_vivo,
      peso_carcaca,
      arrobas,
      preco_pago,
      frete,
      impostos,
      outras_despesas,
      valor_total,
      observacoes: observacoes || null,
    }

    if (isEditing) {
      const { error } = await supabase
        .from('animais')
        .update(payload)
        .eq('id', id)

      if (error) {
        toast.error('Erro ao atualizar animal')
        setSaving(false)
        return
      }
      toast.success('Animal atualizado!')
      navigate(`/animais/${id}/desmanche`)
    } else {
      const { data, error } = await supabase
        .from('animais')
        .insert({ ...payload, created_by: user.id })
        .select()
        .single()

      if (error || !data) {
        toast.error('Erro ao criar animal')
        setSaving(false)
        return
      }
      toast.success('Animal criado!')
      navigate(`/animais/${data.id}/desmanche`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isEditing ? 'Editar Animal' : 'Novo Animal'}
        actions={
          <Button variant="ghost" onClick={() => navigate('/animais')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Animal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Fornecedor"
                value={fornecedor_id}
                onChange={e => setFornecedorId(e.target.value)}
                options={fornecedores.map(f => ({ value: f.id, label: f.nome }))}
                required
              />
              <Input
                label="Número do Lote"
                value={numero_lote}
                onChange={e => setNumeroLote(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Data da Compra"
                type="date"
                value={data_compra}
                onChange={e => setDataCompra(e.target.value)}
                required
              />
              <Input
                label="Peso Vivo (kg)"
                type="number"
                step="0.01"
                min="0"
                value={peso_vivo || ''}
                onChange={e => setPesoVivo(Number(e.target.value))}
              />
              <Input
                label="Peso Carcaça (kg)"
                type="number"
                step="0.01"
                min="0"
                value={peso_carcaca || ''}
                onChange={e => setPesoCarcaca(Number(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Arrobas (@)"
                type="number"
                step="0.1"
                value={arrobas.toFixed(1)}
                className="bg-zinc-700/50"
                readOnly
              />
              <Input
                label="Preço Pago"
                type="number"
                step="0.01"
                min="0"
                value={preco_pago || ''}
                onChange={e => setPrecoPago(Number(e.target.value))}
                required
              />
              <Input
                label="Frete"
                type="number"
                step="0.01"
                min="0"
                value={frete || ''}
                onChange={e => setFrete(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Impostos"
                type="number"
                step="0.01"
                min="0"
                value={impostos || ''}
                onChange={e => setImpostos(Number(e.target.value))}
              />
              <Input
                label="Outras Despesas"
                type="number"
                step="0.01"
                min="0"
                value={outras_despesas || ''}
                onChange={e => setOutrasDespesas(Number(e.target.value))}
              />
              <Input
                label="Valor Total"
                type="number"
                step="0.01"
                value={valor_total.toFixed(2)}
                className="bg-zinc-700/50"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 min-h-[100px] resize-y"
              placeholder="Observações sobre o animal..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => navigate('/animais')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" />
            {isEditing ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
