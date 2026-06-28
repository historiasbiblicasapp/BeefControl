import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Plus, Trash2, Save, Beef, Calculator, Scale, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParams, useNavigate } from 'react-router-dom'

interface AnimalWithFornecedor {
  id: string
  empresa_id: string
  fornecedor_id: string
  numero_lote: string
  data_compra: string
  peso_vivo: number
  peso_carcaca: number
  arrobas: number
  preco_pago: number
  frete: number
  impostos: number
  outras_despesas: number
  valor_total: number
  observacoes: string | null
  created_by: string
  fornecedor: { id: string; nome: string } | null
}

interface CorteForm {
  id: string
  nome: string
  peso: number
  quantidade: number
  categoria_id: string
  preco_sugerido: number
  preco_venda: number
  observacoes: string
}

interface CategoriaOption {
  id: string
  nome: string
}

const CORTES_PADRAO = [
  'Picanha', 'Alcatra', 'Contra Filé', 'Filé Mignon', 'Patinho',
  'Coxão Mole', 'Coxão Duro', 'Maminha', 'Fraldinha', 'Cupim',
  'Acém', 'Paleta', 'Músculo', 'Costela', 'Peito', 'Pescoço',
  'Rabo', 'Fígado', 'Língua', 'Coração',
]

export function ButcheringForm() {
  const { empresa, user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [animal, setAnimal] = useState<AnimalWithFornecedor | null>(null)
  const [categorias, setCategorias] = useState<CategoriaOption[]>([])
  const [cortes, setCortes] = useState<CorteForm[]>([])
  const [existingCortes, setExistingCortes] = useState<CorteForm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCortesPadrao, setShowCortesPadrao] = useState(false)

  useEffect(() => {
    if (!empresa || !id) return
    loadData()
  }, [empresa, id])

  async function loadData() {
    setLoading(true)
    const [animalResult, cortesResult, categoriasResult] = await Promise.all([
      supabase
        .from('animais')
        .select('*, fornecedor:fornecedores(id, nome)')
        .eq('id', id)
        .single(),
      supabase
        .from('cortes')
        .select('*')
        .eq('animal_id', id)
        .order('created_at'),
      supabase
        .from('categorias')
        .select('id, nome')
        .eq('empresa_id', empresa!.id)
        .order('nome'),
    ])

    if (animalResult.error || !animalResult.data) {
      toast.error('Animal não encontrado')
      navigate('/animais')
      return
    }

    setAnimal(animalResult.data as unknown as AnimalWithFornecedor)
    setCategorias(categoriasResult.data || [])

    const loaded = (cortesResult.data || []).map(c => ({
      id: c.id,
      nome: c.nome,
      peso: c.peso,
      quantidade: c.quantidade,
      categoria_id: c.categoria_id || '',
      preco_sugerido: c.preco_sugerido,
      preco_venda: c.preco_venda,
      observacoes: c.observacoes || '',
    }))
    setExistingCortes(loaded)
    setCortes(loaded)
    setLoading(false)
  }

  function addCortePadrao(nome: string) {
    if (cortes.some(c => c.nome === nome)) {
      toast.error(`Corte "${nome}" já adicionado`)
      return
    }
    setCortes(prev => [...prev, {
      id: crypto.randomUUID(),
      nome,
      peso: 0,
      quantidade: 1,
      categoria_id: '',
      preco_sugerido: 0,
      preco_venda: 0,
      observacoes: '',
    }])
  }

  function addCustomCorte() {
    setCortes(prev => [...prev, {
      id: crypto.randomUUID(),
      nome: '',
      peso: 0,
      quantidade: 1,
      categoria_id: '',
      preco_sugerido: 0,
      preco_venda: 0,
      observacoes: '',
    }])
  }

  function removeCorte(id: string) {
    setCortes(prev => prev.filter(c => c.id !== id))
  }

  function updateCorte(id: string, field: keyof CorteForm, value: string | number) {
    setCortes(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const pesoTotalProduzido = cortes.reduce((sum, c) => sum + c.peso, 0)
  const pesoCarcaca = animal?.peso_carcaca || 0
  const pesoPerdido = Math.max(0, pesoCarcaca - pesoTotalProduzido)
  const quebra = pesoCarcaca > 0 ? ((pesoCarcaca - pesoTotalProduzido) / pesoCarcaca * 100) : 0
  const rendimento = pesoCarcaca > 0 ? (pesoTotalProduzido / pesoCarcaca * 100) : 0
  const custoPorKg = pesoTotalProduzido > 0 ? (animal?.valor_total || 0) / pesoTotalProduzido : 0
  const valorInvestido = animal?.valor_total || 0
  const valorVendido = cortes.reduce((sum, c) => sum + (c.peso * c.preco_venda), 0)
  const lucroBruto = valorVendido - valorInvestido
  const margem = valorVendido > 0 ? (lucroBruto / valorVendido * 100) : 0

  function padraoUsado(nome: string) {
    return cortes.some(c => c.nome === nome)
  }

  async function handleSave() {
    if (!empresa || !user || !animal) return

    const invalid = cortes.find(c => !c.nome.trim())
    if (invalid) {
      toast.error('Todos os cortes precisam ter um nome')
      return
    }
    if (cortes.length === 0) {
      toast.error('Adicione pelo menos um corte')
      return
    }
    if (pesoTotalProduzido === 0) {
      toast.error('Peso total produzido não pode ser zero')
      return
    }

    setSaving(true)

    const cortesToInsert = cortes.map(c => ({
      empresa_id: empresa.id,
      animal_id: animal.id,
      nome: c.nome.trim(),
      peso: c.peso,
      quantidade: c.quantidade,
      categoria_id: c.categoria_id || null,
      preco_sugerido: c.preco_sugerido,
      preco_venda: c.preco_venda,
      observacoes: c.observacoes || null,
      created_by: user.id,
    }))

    const { error: deleteError } = await supabase
      .from('cortes')
      .delete()
      .eq('animal_id', animal.id)
    if (deleteError) {
      toast.error('Erro ao remover cortes antigos')
      setSaving(false)
      return
    }

    const { error: estoqueDeleteError } = await supabase
      .from('estoque')
      .delete()
      .eq('animal_id', animal.id)
    if (estoqueDeleteError) {
      toast.error('Erro ao remover estoque antigo')
      setSaving(false)
      return
    }

    const { data: insertedCortes, error: insertError } = await supabase
      .from('cortes')
      .insert(cortesToInsert)
      .select()

    if (insertError || !insertedCortes) {
      toast.error('Erro ao salvar cortes')
      setSaving(false)
      return
    }

    const estoqueToInsert = insertedCortes.map(c => ({
      empresa_id: empresa.id,
      animal_id: animal.id,
      corte_id: c.id,
      nome: c.nome,
      peso: c.peso,
      quantidade: c.quantidade,
      data_entrada: new Date().toISOString(),
      validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lote: animal.numero_lote,
    }))

    const { error: estoqueError } = await supabase
      .from('estoque')
      .insert(estoqueToInsert)

    if (estoqueError) {
      toast.error('Cortes salvos, mas erro ao registrar estoque')
      setSaving(false)
      return
    }

    toast.success('Desmanche registrado com sucesso!')
    setSaving(false)
    navigate(`/animais/${animal.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!animal) return null

  return (
    <div>
      <PageHeader
        title={`Desmanche - ${animal.numero_lote}`}
        description="Registre os cortes do animal"
        actions={
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Salvar Desmanche
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Beef className="w-5 h-5 text-red-500" />
              <CardTitle>Informações do Animal</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Lote</p>
                <p className="text-sm text-zinc-100 font-medium mt-1">{animal.numero_lote}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Fornecedor</p>
                <p className="text-sm text-zinc-100 font-medium mt-1">{animal.fornecedor?.nome || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Data Compra</p>
                <p className="text-sm text-zinc-100 font-medium mt-1">
                  {new Date(animal.data_compra).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Peso Vivo</p>
                <p className="text-sm text-zinc-100 font-medium mt-1">{animal.peso_vivo.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Peso Carcaça</p>
                <p className="text-sm text-zinc-100 font-medium mt-1">{animal.peso_carcaca.toFixed(2)} kg</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Arrobas</p>
                <p className="text-sm text-zinc-100 font-medium mt-1">{animal.arrobas.toFixed(1)} @</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Valor Total</p>
                <p className="text-sm text-zinc-100 font-medium mt-1">{formatCurrency(animal.valor_total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-red-500" />
              <CardTitle>Registro de Cortes</CardTitle>
            </div>
            <Button variant="secondary" onClick={() => setShowCortesPadrao(!showCortesPadrao)}>
              <Plus className="w-4 h-4" />
              Cortes Padrão
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCortesPadrao && (
              <div className="flex flex-wrap gap-2 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                {CORTES_PADRAO.map(nome => (
                  <button
                    key={nome}
                    onClick={() => addCortePadrao(nome)}
                    disabled={padraoUsado(nome)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      padraoUsado(nome)
                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-red-600 hover:text-white'
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            )}

            {cortes.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum corte registrado ainda.</p>
                <p className="text-sm mt-1">Clique em "Cortes Padrão" para adicionar ou use o botão abaixo.</p>
              </div>
            )}

            {cortes.map((corte, index) => (
              <div key={corte.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium">Corte #{index + 1}</span>
                  <button
                    onClick={() => removeCorte(corte.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Input
                    label="Nome"
                    value={corte.nome}
                    onChange={e => updateCorte(corte.id, 'nome', e.target.value)}
                  />
                  <Input
                    label="Peso (kg)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={corte.peso || ''}
                    onChange={e => updateCorte(corte.id, 'peso', Number(e.target.value))}
                  />
                  <Input
                    label="Quantidade"
                    type="number"
                    step="1"
                    min="1"
                    value={corte.quantidade}
                    onChange={e => updateCorte(corte.id, 'quantidade', Number(e.target.value))}
                  />
                  <Select
                    label="Categoria"
                    value={corte.categoria_id}
                    onChange={e => updateCorte(corte.id, 'categoria_id', e.target.value)}
                    options={categorias.map(c => ({ value: c.id, label: c.nome }))}
                  />
                  <Input
                    label="Preço Sugerido"
                    type="number"
                    step="0.01"
                    min="0"
                    value={corte.preco_sugerido || ''}
                    onChange={e => updateCorte(corte.id, 'preco_sugerido', Number(e.target.value))}
                  />
                  <Input
                    label="Preço Venda"
                    type="number"
                    step="0.01"
                    min="0"
                    value={corte.preco_venda || ''}
                    onChange={e => updateCorte(corte.id, 'preco_venda', Number(e.target.value))}
                  />
                  <div className="lg:col-span-2">
                    <Input
                      label="Observações"
                      value={corte.observacoes}
                      onChange={e => updateCorte(corte.id, 'observacoes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="secondary" onClick={addCustomCorte}>
              <Plus className="w-4 h-4" />
              Adicionar Corte Personalizado
            </Button>
          </CardContent>
        </Card>

        {cortes.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-red-500" />
                <CardTitle>Resumo do Desmanche</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Peso Total Produzido</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">{pesoTotalProduzido.toFixed(2)} kg</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Peso Perdido</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">{pesoPerdido.toFixed(2)} kg</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Quebra</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">{quebra.toFixed(1)}%</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Rendimento</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">{rendimento.toFixed(1)}%</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Custo por KG</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">{formatCurrency(custoPorKg)}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Valor Investido</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">{formatCurrency(valorInvestido)}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Valor Vendido (est.)</p>
                  <p className="text-lg font-semibold text-zinc-100 mt-1">{formatCurrency(valorVendido)}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Lucro Bruto</p>
                  <p className={`text-lg font-semibold mt-1 ${lucroBruto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(lucroBruto)}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Margem</p>
                  <p className={`text-lg font-semibold mt-1 ${margem >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {margem.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
