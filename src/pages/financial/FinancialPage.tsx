import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { DollarSign, TrendingUp, TrendingDown, Plus, Search, Receipt, Wallet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import toast from 'react-hot-toast'

type Tab = 'receitas' | 'despesas' | 'fluxo'

interface ReceitaRow {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string | null
}

interface DespesaRow {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string | null
}

interface MonthlyCashFlow {
  mes: string
  receitas: number
  despesas: number
}

interface FormData {
  descricao: string
  valor: string
  data: string
  categoria: string
}

const emptyForm: FormData = {
  descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), categoria: '',
}

const categoriaOptions = [
  { value: 'vendas', label: 'Vendas' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'outros', label: 'Outros' },
]

const despesaCategoriaOptions = [
  { value: 'insumos', label: 'Insumos' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'energia', label: 'Energia' },
  { value: 'agua', label: 'Água' },
  { value: 'salarios', label: 'Salários' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'transportes', label: 'Transportes' },
  { value: 'embalagens', label: 'Embalagens' },
  { value: 'outros', label: 'Outros' },
]

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

export function FinancialPage() {
  const { user, empresa } = useAuth()
  const empresaId = empresa?.id

  const [activeTab, setActiveTab] = useState<Tab>('receitas')

  const [receitas, setReceitas] = useState<ReceitaRow[]>([])
  const [despesas, setDespesas] = useState<DespesaRow[]>([])
  const [receitasSearch, setReceitasSearch] = useState('')
  const [despesasSearch, setDespesasSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [monthReceitas, setMonthReceitas] = useState(0)
  const [monthDespesas, setMonthDespesas] = useState(0)
  const [balance, setBalance] = useState(0)
  const [monthProfit, setMonthProfit] = useState(0)
  const [todayProfit, setTodayProfit] = useState(0)
  const [yearProfit, setYearProfit] = useState(0)

  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyCashFlow[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<'receitas' | 'despesas'>('receitas')
  const [saving, setSaving] = useState(false)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'receitas', label: 'Receitas' },
    { key: 'despesas', label: 'Despesas' },
    { key: 'fluxo', label: 'Fluxo de Caixa' },
  ]

  useEffect(() => {
    if (empresaId) loadAll()
  }, [empresaId])

  async function loadAll() {
    if (!empresaId) return
    setLoading(true)
    await Promise.all([
      fetchReceitas(),
      fetchDespesas(),
      fetchSummary(),
      fetchMonthlyFlow(),
    ])
    setLoading(false)
  }

  async function fetchReceitas() {
    if (!empresaId) return
    const { data, error } = await supabase
      .from('receitas')
      .select('id, descricao, valor, data, categoria')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false })
    if (error) toast.error('Erro ao carregar receitas')
    else setReceitas(data ?? [])
  }

  async function fetchDespesas() {
    if (!empresaId) return
    const { data, error } = await supabase
      .from('despesas')
      .select('id, descricao, valor, data, categoria')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: false })
    if (error) toast.error('Erro ao carregar despesas')
    else setDespesas(data ?? [])
  }

  async function fetchSummary() {
    if (!empresaId) return
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString()

    const [monthRecRes, monthDespRes, todayRecRes, todayDespRes, yearRecRes, yearDespRes] = await Promise.all([
      supabase.from('receitas').select('valor').eq('empresa_id', empresaId).gte('data', startOfMonth),
      supabase.from('despesas').select('valor').eq('empresa_id', empresaId).gte('data', startOfMonth),
      supabase.from('receitas').select('valor').eq('empresa_id', empresaId).gte('data', startOfDay),
      supabase.from('despesas').select('valor').eq('empresa_id', empresaId).gte('data', startOfDay),
      supabase.from('receitas').select('valor').eq('empresa_id', empresaId).gte('data', startOfYear),
      supabase.from('despesas').select('valor').eq('empresa_id', empresaId).gte('data', startOfYear),
    ])

    const mRec = monthRecRes.data?.reduce((a, r) => a + (r.valor || 0), 0) ?? 0
    const mDesp = monthDespRes.data?.reduce((a, d) => a + (d.valor || 0), 0) ?? 0
    setMonthReceitas(mRec)
    setMonthDespesas(mDesp)
    setBalance(mRec - mDesp)
    setMonthProfit(mRec - mDesp)

    const tRec = todayRecRes.data?.reduce((a, r) => a + (r.valor || 0), 0) ?? 0
    const tDesp = todayDespRes.data?.reduce((a, d) => a + (d.valor || 0), 0) ?? 0
    setTodayProfit(tRec - tDesp)

    const yRec = yearRecRes.data?.reduce((a, r) => a + (r.valor || 0), 0) ?? 0
    const yDesp = yearDespRes.data?.reduce((a, d) => a + (d.valor || 0), 0) ?? 0
    setYearProfit(yRec - yDesp)
  }

  async function fetchMonthlyFlow() {
    if (!empresaId) return
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    const startDate = sixMonthsAgo.toISOString()

    const [recRes, despRes] = await Promise.all([
      supabase.from('receitas').select('valor, data').eq('empresa_id', empresaId).gte('data', startDate).order('data'),
      supabase.from('despesas').select('valor, data').eq('empresa_id', empresaId).gte('data', startDate).order('data'),
    ])

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const recByMonth: Record<string, number> = {}
    const despByMonth: Record<string, number> = {}

    recRes.data?.forEach(r => {
      const d = new Date(r.data)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      recByMonth[key] = (recByMonth[key] || 0) + (r.valor || 0)
    })

    despRes.data?.forEach(d => {
      const date = new Date(d.data)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      despByMonth[key] = (despByMonth[key] || 0) + (d.valor || 0)
    })

    const flow: MonthlyCashFlow[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      flow.push({
        mes: monthNames[d.getMonth()],
        receitas: recByMonth[key] || 0,
        despesas: despByMonth[key] || 0,
      })
    }

    setMonthlyFlow(flow)
  }

  function openCreate(type: 'receitas' | 'despesas') {
    setEditingId(null)
    setEditingType(type)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(item: ReceitaRow | DespesaRow, type: 'receitas' | 'despesas') {
    setEditingId(item.id)
    setEditingType(type)
    setForm({
      descricao: item.descricao,
      valor: String(item.valor),
      data: item.data.slice(0, 10),
      categoria: item.categoria ?? '',
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!empresaId || !user) return
    if (!form.descricao.trim() || !form.valor || !form.data) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)

    const payload = {
      empresa_id: empresaId,
      descricao: form.descricao.trim(),
      valor: Number(form.valor),
      data: form.data,
      categoria: form.categoria || null,
      created_by: user.id,
    }

    const table = editingType === 'receitas' ? 'receitas' : 'despesas'

    if (editingId) {
      const { error } = await supabase
        .from(table)
        .update({ descricao: payload.descricao, valor: payload.valor, data: payload.data, categoria: payload.categoria })
        .eq('id', editingId)
      if (error) toast.error(`Erro ao atualizar ${editingType === 'receitas' ? 'receita' : 'despesa'}`)
      else { toast.success(`${editingType === 'receitas' ? 'Receita' : 'Despesa'} atualizada!`); setModalOpen(false); loadAll() }
    } else {
      const { error } = await supabase
        .from(table)
        .insert(payload)
      if (error) toast.error(`Erro ao criar ${editingType === 'receitas' ? 'receita' : 'despesa'}`)
      else { toast.success(`${editingType === 'receitas' ? 'Receita' : 'Despesa'} criada!`); setModalOpen(false); loadAll() }
    }
    setSaving(false)
  }

  async function handleDelete(id: string, type: 'receitas' | 'despesas') {
    const table = type === 'receitas' ? 'receitas' : 'despesas'
    const label = type === 'receitas' ? 'receita' : 'despesa'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) toast.error(`Erro ao excluir ${label}`)
    else { toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} excluída!`); loadAll() }
  }

  const filteredReceitas = receitas.filter(r =>
    r.descricao.toLowerCase().includes(receitasSearch.toLowerCase()) ||
    (r.categoria && r.categoria.toLowerCase().includes(receitasSearch.toLowerCase()))
  )

  const filteredDespesas = despesas.filter(d =>
    d.descricao.toLowerCase().includes(despesasSearch.toLowerCase()) ||
    (d.categoria && d.categoria.toLowerCase().includes(despesasSearch.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Financeiro"
        description={empresa?.nome ? `Gestão financeira - ${empresa.nome}` : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-900/30 rounded-xl text-green-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Receitas (mês)</p>
              <p className="text-2xl font-bold text-zinc-100">{formatCurrency(monthReceitas)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/30 rounded-xl text-red-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Despesas (mês)</p>
              <p className="text-2xl font-bold text-zinc-100">{formatCurrency(monthDespesas)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${balance >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Saldo</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/30 rounded-xl text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Lucro (mês)</p>
              <p className={`text-2xl font-bold ${monthProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(monthProfit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Lucro Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${todayProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(todayProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lucro do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${monthProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(monthProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lucro do Ano</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${yearProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(yearProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'receitas' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar receita..."
                value={receitasSearch}
                onChange={e => setReceitasSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button onClick={() => openCreate('receitas')}>
              <Plus className="w-4 h-4" />
              Nova Receita
            </Button>
          </div>

          {filteredReceitas.length === 0 ? (
            <div className="text-center py-20">
              <Receipt className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhuma receita encontrada</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
                      <th className="text-left text-zinc-400 font-medium pb-3">Descrição</th>
                      <th className="text-left text-zinc-400 font-medium pb-3">Categoria</th>
                      <th className="text-right text-zinc-400 font-medium pb-3">Valor</th>
                      <th className="text-right text-zinc-400 font-medium pb-3 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceitas.map(item => (
                      <tr key={item.id} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-3 text-zinc-300">{formatDate(item.data)}</td>
                        <td className="py-3 text-zinc-100">{item.descricao}</td>
                        <td className="py-3">
                          {item.categoria ? <Badge>{item.categoria}</Badge> : <span className="text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 text-green-400 text-right font-medium">{formatCurrency(item.valor)}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(item, 'receitas')}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, 'receitas')}
                              className="text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'despesas' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar despesa..."
                value={despesasSearch}
                onChange={e => setDespesasSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button onClick={() => openCreate('despesas')}>
              <Plus className="w-4 h-4" />
              Nova Despesa
            </Button>
          </div>

          {filteredDespesas.length === 0 ? (
            <div className="text-center py-20">
              <Receipt className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhuma despesa encontrada</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
                      <th className="text-left text-zinc-400 font-medium pb-3">Descrição</th>
                      <th className="text-left text-zinc-400 font-medium pb-3">Categoria</th>
                      <th className="text-right text-zinc-400 font-medium pb-3">Valor</th>
                      <th className="text-right text-zinc-400 font-medium pb-3 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDespesas.map(item => (
                      <tr key={item.id} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-3 text-zinc-300">{formatDate(item.data)}</td>
                        <td className="py-3 text-zinc-100">{item.descricao}</td>
                        <td className="py-3">
                          {item.categoria ? <Badge>{item.categoria}</Badge> : <span className="text-zinc-600">-</span>}
                        </td>
                        <td className="py-3 text-red-400 text-right font-medium">{formatCurrency(item.valor)}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(item, 'despesas')}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, 'despesas')}
                              className="text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'fluxo' && (
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa - Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyFlow.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyFlow} margin={{ top: 5, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }}
                    formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  />
                  <Bar dataKey="receitas" fill="#22c55e" name="Receitas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-zinc-400">Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-zinc-400">Despesas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? `Editar ${editingType === 'receitas' ? 'Receita' : 'Despesa'}`
            : `Nova${editingType === 'receitas' ? ' Receita' : ' Despesa'}`
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Descrição"
            value={form.descricao}
            onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valor"
              type="number"
              step="0.01"
              min="0.01"
              value={form.valor}
              onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))}
              required
            />
            <Input
              label="Data"
              type="date"
              value={form.data}
              onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))}
              required
            />
          </div>
          <Select
            label="Categoria"
            value={form.categoria}
            onChange={e => setForm(prev => ({ ...prev, categoria: e.target.value }))}
            options={editingType === 'receitas' ? categoriaOptions : despesaCategoriaOptions}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
