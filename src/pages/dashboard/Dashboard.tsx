import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatWeight } from '../../lib/utils'
import { StatCard } from '../../components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { DollarSign, Beef, TrendingUp, Package, ShoppingCart, Scale, AlertTriangle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c']

interface RecentAnimal {
  id: string
  numero_lote: string
  data_compra: string
  peso_vivo: number
  valor_total: number
  fornecedor?: { nome: string } | null
}

interface ChartData {
  name: string
  value: number
}

interface MonthlyProfit {
  mes: string
  receitas: number
  despesas: number
  lucro: number
}

export function Dashboard() {
  const { empresa } = useAuth()

  const [loading, setLoading] = useState(true)
  const [totalInvested, setTotalInvested] = useState(0)
  const [animalCount, setAnimalCount] = useState(0)
  const [monthProfit, setMonthProfit] = useState(0)
  const [yearProfit, setYearProfit] = useState(0)
  const [stockWeight, setStockWeight] = useState(0)
  const [monthWeightSold, setMonthWeightSold] = useState(0)
  const [bestSellingCuts, setBestSellingCuts] = useState<ChartData[]>([])
  const [mostProfitableCuts, setMostProfitableCuts] = useState<ChartData[]>([])
  const [monthlyProfits, setMonthlyProfits] = useState<MonthlyProfit[]>([])
  const [recentAnimals, setRecentAnimals] = useState<RecentAnimal[]>([])

  useEffect(() => {
    if (!empresa) return
    setLoading(true)
    Promise.all([
      fetchStats(empresa.id),
      fetchBestSellingCuts(empresa.id),
      fetchMostProfitableCuts(empresa.id),
      fetchMonthlyProfits(empresa.id),
      fetchRecentAnimals(empresa.id),
    ]).finally(() => setLoading(false))
  }, [empresa?.id])

  async function fetchStats(empresaId: string) {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString()

    const [animaisRes, stockRes, monthReceitasRes, monthDespesasRes, yearReceitasRes, yearDespesasRes, monthVendasRes, monthItensRes] = await Promise.all([
      supabase.from('animais').select('valor_total').eq('empresa_id', empresaId),
      supabase.from('estoque').select('peso').eq('empresa_id', empresaId),
      supabase.from('receitas').select('valor').eq('empresa_id', empresaId).gte('data', startOfMonth),
      supabase.from('despesas').select('valor').eq('empresa_id', empresaId).gte('data', startOfMonth),
      supabase.from('receitas').select('valor').eq('empresa_id', empresaId).gte('data', startOfYear),
      supabase.from('despesas').select('valor').eq('empresa_id', empresaId).gte('data', startOfYear),
      supabase.from('vendas').select('id').eq('empresa_id', empresaId).gte('created_at', startOfMonth),
      supabase.from('itens_venda').select('peso, vendas!inner(empresa_id)').eq('vendas.empresa_id', empresaId).gte('vendas.created_at', startOfMonth),
    ])

    if (animaisRes.data) {
      setTotalInvested(animaisRes.data.reduce((acc, a) => acc + (a.valor_total || 0), 0))
      setAnimalCount(animaisRes.data.length)
    }
    if (stockRes.data) {
      setStockWeight(stockRes.data.reduce((acc, s) => acc + (s.peso || 0), 0))
    }

    const monthReceitas = monthReceitasRes.data?.reduce((acc, r) => acc + (r.valor || 0), 0) ?? 0
    const monthDespesas = monthDespesasRes.data?.reduce((acc, d) => acc + (d.valor || 0), 0) ?? 0
    setMonthProfit(monthReceitas - monthDespesas)

    const yearReceitas = yearReceitasRes.data?.reduce((acc, r) => acc + (r.valor || 0), 0) ?? 0
    const yearDespesas = yearDespesasRes.data?.reduce((acc, d) => acc + (d.valor || 0), 0) ?? 0
    setYearProfit(yearReceitas - yearDespesas)

    if (monthItensRes.data) {
      setMonthWeightSold(monthItensRes.data.reduce((acc, i) => acc + (i.peso || 0), 0))
    }
  }

  async function fetchBestSellingCuts(empresaId: string) {
    const { data } = await supabase
      .from('itens_venda')
      .select('corte_nome, quantidade, vendas!inner(empresa_id)')
      .eq('vendas.empresa_id', empresaId)

    if (!data) return

    const grouped: Record<string, number> = {}
    data.forEach(item => {
      grouped[item.corte_nome] = (grouped[item.corte_nome] || 0) + (item.quantidade || 0)
    })

    const sorted = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    setBestSellingCuts(sorted)
  }

  async function fetchMostProfitableCuts(empresaId: string) {
    const { data } = await supabase
      .from('itens_venda')
      .select('corte_nome, subtotal, vendas!inner(empresa_id)')
      .eq('vendas.empresa_id', empresaId)

    if (!data) return

    const grouped: Record<string, number> = {}
    data.forEach(item => {
      grouped[item.corte_nome] = (grouped[item.corte_nome] || 0) + (item.subtotal || 0)
    })

    const sorted = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    setMostProfitableCuts(sorted)
  }

  async function fetchMonthlyProfits(empresaId: string) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    const startDate = sixMonthsAgo.toISOString()

    const [receitasRes, despesasRes] = await Promise.all([
      supabase.from('receitas').select('valor, data').eq('empresa_id', empresaId).gte('data', startDate).order('data'),
      supabase.from('despesas').select('valor, data').eq('empresa_id', empresaId).gte('data', startDate).order('data'),
    ])

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    const receitasByMonth: Record<string, number> = {}
    const despesasByMonth: Record<string, number> = {}

    receitasRes.data?.forEach(r => {
      const d = new Date(r.data)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      receitasByMonth[key] = (receitasByMonth[key] || 0) + (r.valor || 0)
    })

    despesasRes.data?.forEach(d => {
      const date = new Date(d.data)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      despesasByMonth[key] = (despesasByMonth[key] || 0) + (d.valor || 0)
    })

    const months: MonthlyProfit[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const receitas = receitasByMonth[key] || 0
      const despesas = despesasByMonth[key] || 0
      months.push({
        mes: monthNames[d.getMonth()],
        receitas,
        despesas,
        lucro: receitas - despesas,
      })
    }

    setMonthlyProfits(months)
  }

  async function fetchRecentAnimals(empresaId: string) {
    const { data } = await supabase
      .from('animais')
      .select('id, numero_lote, data_compra, peso_vivo, valor_total, fornecedor:fornecedor_id(nome)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) setRecentAnimals(data as unknown as RecentAnimal[])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const alerts = [
    { icon: AlertTriangle, title: 'Estoque baixo', desc: 'Alguns cortes estão com quantidade crítica. Revise o estoque.', variant: 'danger' as const },
    { icon: Clock, title: 'Produtos vencendo', desc: 'Itens próximos da data de validade precisam ser revisados.', variant: 'warning' as const },
  ]

  const quickLinks = [
    { href: '/animais/novo', label: 'Novo Animal', icon: Beef },
    { href: '/vendas/nova', label: 'Nova Venda', icon: ShoppingCart },
    { href: '/estoque', label: 'Ver Estoque', icon: Package },
    { href: '/relatorios', label: 'Relatórios', icon: TrendingUp },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Visão geral do negócio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Investido"
          value={formatCurrency(totalInvested)}
          icon={<DollarSign className="w-6 h-6" />}
        />
        <StatCard
          title="Animais Adquiridos"
          value={String(animalCount)}
          icon={<Beef className="w-6 h-6" />}
        />
        <StatCard
          title="Lucro do Mês"
          value={formatCurrency(monthProfit)}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{ value: monthProfit >= 0 ? 100 : -100, positive: monthProfit >= 0 }}
        />
        <StatCard
          title="Lucro do Ano"
          value={formatCurrency(yearProfit)}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{ value: yearProfit >= 0 ? 100 : -100, positive: yearProfit >= 0 }}
        />
        <StatCard
          title="Carne em Estoque"
          value={formatWeight(stockWeight)}
          icon={<Scale className="w-6 h-6" />}
        />
        <StatCard
          title="Vendas (mês)"
          value={formatWeight(monthWeightSold)}
          icon={<ShoppingCart className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Cortes Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {bestSellingCuts.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bestSellingCuts} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }}
                  />
                  <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Cortes Mais Lucrativos</CardTitle>
          </CardHeader>
          <CardContent>
            {mostProfitableCuts.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Nenhum dado disponível</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mostProfitableCuts} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }}
                    formatter={(value: any) => formatCurrency(Number(value) || 0)}
                  />
                  <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lucro dos Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyProfits.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Nenhum dado disponível</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyProfits} margin={{ top: 5, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="mes" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }}
                  formatter={(value: any) => formatCurrency(Number(value) || 0)}
                />
                <Bar dataKey="receitas" fill="#22c55e" name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" fill="#3b82f6" name="Lucro" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Últimos Animais</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnimals.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">Nenhum animal cadastrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-zinc-400 font-medium pb-3">Lote</th>
                      <th className="text-left text-zinc-400 font-medium pb-3">Fornecedor</th>
                      <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
                      <th className="text-right text-zinc-400 font-medium pb-3">Peso</th>
                      <th className="text-right text-zinc-400 font-medium pb-3">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAnimals.map(animal => (
                      <tr key={animal.id} className="border-b border-zinc-800/50 last:border-0">
                        <td className="py-3 text-zinc-100">{animal.numero_lote}</td>
                        <td className="py-3 text-zinc-300">{animal.fornecedor?.nome ?? '-'}</td>
                        <td className="py-3 text-zinc-300">
                          {new Date(animal.data_compra).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 text-zinc-300 text-right">{animal.peso_vivo.toFixed(1)} kg</td>
                        <td className="py-3 text-zinc-100 text-right font-medium">
                          {formatCurrency(animal.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <alert.icon className={`w-5 h-5 mt-0.5 ${
                    alert.variant === 'danger' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-100">{alert.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{alert.desc}</p>
                  </div>
                  <Badge variant={alert.variant}>{alert.variant === 'danger' ? 'Crítico' : 'Atenção'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
                  >
                    <div className="p-2 bg-red-900/30 rounded-lg text-red-400 group-hover:bg-red-900/50 transition-colors">
                      <link.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                      {link.label}
                    </span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
