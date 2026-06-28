import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Plus, Search, Beef, Edit2, Eye, Scissors } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

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
  created_at: string
  fornecedor: { nome: string } | null
}

export function AnimalsList() {
  const { empresa } = useAuth()
  const navigate = useNavigate()
  const [animais, setAnimais] = useState<AnimalWithFornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!empresa) return
    loadAnimais()
  }, [empresa])

  async function loadAnimais() {
    try {
      const { data, error } = await supabase
        .from('animais')
        .select('*, fornecedor:fornecedores(nome)')
        .eq('empresa_id', empresa!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnimais(data || [])
    } catch {
      toast.error('Erro ao carregar animais')
    } finally {
      setLoading(false)
    }
  }

  const filtered = search
    ? animais.filter(a =>
        a.numero_lote.toLowerCase().includes(search.toLowerCase()) ||
        a.fornecedor?.nome?.toLowerCase().includes(search.toLowerCase())
      )
    : animais

  const totalAnimais = animais.length
  const totalPeso = animais.reduce((sum, a) => sum + (a.peso_carcaca || 0), 0)
  const totalInvestido = animais.reduce((sum, a) => sum + (a.valor_total || 0), 0)

  return (
    <div>
      <PageHeader
        title="Animais"
        actions={
          <Button onClick={() => navigate('/animais/novo')}>
            <Plus className="w-4 h-4" />
            Novo Animal
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-red-900/30 rounded-xl text-red-400">
              <Beef className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total de Animais</p>
              <p className="text-2xl font-bold text-zinc-100">{totalAnimais}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/30 rounded-xl text-blue-400">
              <Beef className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Peso Carcaça Total</p>
              <p className="text-2xl font-bold text-zinc-100">{totalPeso.toFixed(2)} kg</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-green-900/30 rounded-xl text-green-400">
              <Beef className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total Investido</p>
              <p className="text-2xl font-bold text-zinc-100">{formatCurrency(totalInvestido)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Animais</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              className="w-64 bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Pesquisar por lote ou fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Lote</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 text-left text-zinc-400 font-medium">Data</th>
                  <th className="px-4 py-3 text-right text-zinc-400 font-medium">Peso Carcaça</th>
                  <th className="px-4 py-3 text-right text-zinc-400 font-medium">Arrobas</th>
                  <th className="px-4 py-3 text-right text-zinc-400 font-medium">Valor Total</th>
                  <th className="px-4 py-3 text-center text-zinc-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full" />
                        Carregando...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      Nenhum animal encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map(animal => (
                    <tr key={animal.id} className="border-t border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 text-zinc-100 font-medium">{animal.numero_lote}</td>
                      <td className="px-4 py-3 text-zinc-300">{animal.fornecedor?.nome || '-'}</td>
                      <td className="px-4 py-3 text-zinc-300">{formatDate(animal.data_compra)}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{animal.peso_carcaca.toFixed(2)} kg</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{animal.arrobas.toFixed(1)} @</td>
                      <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(animal.valor_total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/animais/${animal.id}`)}
                            className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/animais/${animal.id}/editar`)}
                            className="p-1.5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/animais/${animal.id}/desmanche`)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Desmanche"
                          >
                            <Scissors className="w-4 h-4" />
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
    </div>
  )
}
