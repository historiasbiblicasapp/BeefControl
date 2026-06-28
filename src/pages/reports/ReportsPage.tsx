import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatWeight, formatDate } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { BarChart3, FileText, FileSpreadsheet, Download, Search, Calendar, Filter } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

type ReportTab = 'animal' | 'fornecedor' | 'periodo' | 'corte' | 'financeiro' | 'estoque' | 'vendas' | 'perdas'

interface AnimalReport {
  id: string
  numero_lote: string
  data_compra: string
  peso_vivo: number
  peso_carcaca: number
  arrobas: number
  valor_total: number
  fornecedor: { nome: string } | null
  cortes_count: number
  peso_cortes: number
  valor_vendas: number
}

interface FornecedorReport {
  id: string
  nome: string
  cidade: string | null
  total_animais: number
  total_investido: number
  total_peso_vivo: number
}

interface PeriodoTransaction {
  id: string
  tipo: string
  descricao: string
  valor: number
  data: string
  origem: string
}

interface CorteReport {
  nome: string
  quantidade: number
  peso: number
  subtotal: number
  preco_medio: number
}

interface FinanceiroItem {
  id: string
  descricao: string
  valor: number
  data: string
  categoria: string | null
  tipo: 'receita' | 'despesa'
}

interface EstoqueReport {
  id: string
  nome: string
  peso: number
  quantidade: number
  lote: string
  validade: string | null
  localizacao: string | null
  animal: { numero_lote: string } | null
}

interface VendaReport {
  id: string
  created_at: string
  tipo: string
  forma_pagamento: string
  valor_total: number
  desconto: number | null
  cliente: { nome: string } | null
  itens: { corte_nome: string; quantidade: number; peso: number; subtotal: number }[]
}

interface PerdaReport {
  id: string
  created_at: string
  quantidade: number
  peso: number
  motivo: string | null
  estoque: { nome: string; lote: string } | null
}

const tabs: { key: ReportTab; label: string }[] = [
  { key: 'animal', label: 'Por Animal' },
  { key: 'fornecedor', label: 'Por Fornecedor' },
  { key: 'periodo', label: 'Por Período' },
  { key: 'corte', label: 'Por Corte' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'vendas', label: 'Vendas' },
  { key: 'perdas', label: 'Perdas' },
]

export function ReportsPage() {
  const { empresa } = useAuth()
  const [activeTab, setActiveTab] = useState<ReportTab>('animal')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')

  const [animalData, setAnimalData] = useState<AnimalReport[]>([])
  const [fornecedorData, setFornecedorData] = useState<FornecedorReport[]>([])
  const [periodoData, setPeriodoData] = useState<PeriodoTransaction[]>([])
  const [corteData, setCorteData] = useState<CorteReport[]>([])
  const [financeiroData, setFinanceiroData] = useState<FinanceiroItem[]>([])
  const [estoqueData, setEstoqueData] = useState<EstoqueReport[]>([])
  const [vendasData, setVendasData] = useState<VendaReport[]>([])
  const [perdasData, setPerdasData] = useState<PerdaReport[]>([])

  useEffect(() => {
    if (empresa) {
      fetchData(activeTab)
    }
  }, [empresa?.id, activeTab])

  async function fetchData(tab: ReportTab) {
    if (!empresa) return
    setLoading(true)
    try {
      switch (tab) {
        case 'animal': await fetchAnimalReport(empresa.id); break
        case 'fornecedor': await fetchFornecedorReport(empresa.id); break
        case 'periodo': break
        case 'corte': await fetchCorteReport(empresa.id); break
        case 'financeiro': await fetchFinanceiroReport(empresa.id); break
        case 'estoque': await fetchEstoqueReport(empresa.id); break
        case 'vendas': await fetchVendasReport(empresa.id); break
        case 'perdas': await fetchPerdasReport(empresa.id); break
      }
    } catch {
      toast.error('Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  async function fetchByPeriod() {
    if (!empresa || !dateStart || !dateEnd) {
      toast.error('Selecione a data inicial e final')
      return
    }
    setLoading(true)
    try {
      const [vendasRes, despesasRes, receitasRes] = await Promise.all([
        supabase.from('vendas').select('id, created_at, valor_total').eq('empresa_id', empresa.id).gte('created_at', dateStart).lte('created_at', dateEnd),
        supabase.from('despesas').select('id, descricao, valor, data').eq('empresa_id', empresa.id).gte('data', dateStart).lte('data', dateEnd),
        supabase.from('receitas').select('id, descricao, valor, data').eq('empresa_id', empresa.id).gte('data', dateStart).lte('data', dateEnd),
      ])

      const transactions: PeriodoTransaction[] = []

      vendasRes.data?.forEach(v => {
        transactions.push({ id: v.id, tipo: 'venda', descricao: 'Venda', valor: v.valor_total, data: v.created_at, origem: 'vendas' })
      })

      despesasRes.data?.forEach(d => {
        transactions.push({ id: d.id, tipo: 'despesa', descricao: d.descricao, valor: d.valor, data: d.data, origem: 'despesas' })
      })

      receitasRes.data?.forEach(r => {
        transactions.push({ id: r.id, tipo: 'receita', descricao: r.descricao, valor: r.valor, data: r.data, origem: 'receitas' })
      })

      transactions.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      setPeriodoData(transactions)
    } catch {
      toast.error('Erro ao buscar período')
    } finally {
      setLoading(false)
    }
  }

  async function fetchAnimalReport(empresaId: string) {
    const { data: animais } = await supabase
      .from('animais')
      .select('id, numero_lote, data_compra, peso_vivo, peso_carcaca, arrobas, valor_total, fornecedor:fornecedor_id(nome)')
      .eq('empresa_id', empresaId)
      .order('data_compra', { ascending: false })

    if (!animais) return

    const reports: AnimalReport[] = await Promise.all(
      (animais as any[]).map(async (a) => {
        const [cortesRes, vendasRes] = await Promise.all([
          supabase.from('cortes').select('peso').eq('animal_id', a.id),
          supabase.from('itens_venda').select('subtotal, vendas!inner(estoque!inner(animal_id))').eq('vendas.estoque.animal_id', a.id),
        ])

        const peso_cortes = cortesRes.data?.reduce((acc, c) => acc + (c.peso || 0), 0) ?? 0
        const valor_vendas = vendasRes.data?.reduce((acc, v) => acc + (v.subtotal || 0), 0) ?? 0

        return {
          id: a.id,
          numero_lote: a.numero_lote,
          data_compra: a.data_compra,
          peso_vivo: a.peso_vivo,
          peso_carcaca: a.peso_carcaca,
          arrobas: a.arrobas,
          valor_total: a.valor_total,
          fornecedor: a.fornecedor,
          cortes_count: cortesRes.data?.length ?? 0,
          peso_cortes,
          valor_vendas,
        }
      })
    )

    setAnimalData(reports)
  }

  async function fetchFornecedorReport(empresaId: string) {
    const { data: fornecedores } = await supabase
      .from('fornecedores')
      .select('id, nome, cidade')
      .eq('empresa_id', empresaId)

    if (!fornecedores) return

    const reports: FornecedorReport[] = await Promise.all(
      fornecedores.map(async (f) => {
        const { data: animais } = await supabase
          .from('animais')
          .select('peso_vivo, valor_total')
          .eq('empresa_id', empresaId)
          .eq('fornecedor_id', f.id)

        const total_investido = animais?.reduce((acc, a) => acc + (a.valor_total || 0), 0) ?? 0
        const total_peso_vivo = animais?.reduce((acc, a) => acc + (a.peso_vivo || 0), 0) ?? 0

        return {
          id: f.id,
          nome: f.nome,
          cidade: f.cidade,
          total_animais: animais?.length ?? 0,
          total_investido,
          total_peso_vivo,
        }
      })
    )

    setFornecedorData(reports)
  }

  async function fetchCorteReport(empresaId: string) {
    const { data } = await supabase
      .from('itens_venda')
      .select('corte_nome, quantidade, peso, subtotal, vendas!inner(empresa_id)')
      .eq('vendas.empresa_id', empresaId)

    if (!data) return

    const grouped: Record<string, { quantidade: number; peso: number; subtotal: number }> = {}
    data.forEach((item: any) => {
      if (!grouped[item.corte_nome]) {
        grouped[item.corte_nome] = { quantidade: 0, peso: 0, subtotal: 0 }
      }
      grouped[item.corte_nome].quantidade += item.quantidade
      grouped[item.corte_nome].peso += item.peso
      grouped[item.corte_nome].subtotal += item.subtotal
    })

    const corteReports: CorteReport[] = Object.entries(grouped)
      .map(([nome, vals]) => ({
        nome,
        quantidade: vals.quantidade,
        peso: vals.peso,
        subtotal: vals.subtotal,
        preco_medio: vals.peso > 0 ? vals.subtotal / vals.peso : 0,
      }))
      .sort((a, b) => b.subtotal - a.subtotal)

    setCorteData(corteReports)
  }

  async function fetchFinanceiroReport(empresaId: string) {
    const [receitasRes, despesasRes] = await Promise.all([
      supabase.from('receitas').select('*').eq('empresa_id', empresaId).order('data', { ascending: false }),
      supabase.from('despesas').select('*').eq('empresa_id', empresaId).order('data', { ascending: false }),
    ])

    const items: FinanceiroItem[] = [
      ...(receitasRes.data?.map(r => ({ ...r, tipo: 'receita' as const })) ?? []),
      ...(despesasRes.data?.map(d => ({ ...d, tipo: 'despesa' as const })) ?? []),
    ]

    items.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    setFinanceiroData(items)
  }

  async function fetchEstoqueReport(empresaId: string) {
    const { data } = await supabase
      .from('estoque')
      .select('id, nome, peso, quantidade, lote, validade, localizacao, animal:animal_id(numero_lote)')
      .eq('empresa_id', empresaId)
      .order('nome')

    if (data) setEstoqueData(data as unknown as EstoqueReport[])
  }

  async function fetchVendasReport(empresaId: string) {
    const { data } = await supabase
      .from('vendas')
      .select('id, created_at, tipo, forma_pagamento, valor_total, desconto, cliente:cliente_id(nome), itens:itens_venda(corte_nome, quantidade, peso, subtotal)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (data) setVendasData(data as unknown as VendaReport[])
  }

  async function fetchPerdasReport(empresaId: string) {
    const { data } = await supabase
      .from('movimentacoes_estoque')
      .select('id, created_at, quantidade, peso, motivo, estoque:estoque_id(nome, lote)')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'perda')
      .order('created_at', { ascending: false })

    if (data) setPerdasData(data as unknown as PerdaReport[])
  }

  function getTabData(tab: ReportTab): any[] {
    switch (tab) {
      case 'animal': return animalData
      case 'fornecedor': return fornecedorData
      case 'periodo': return periodoData
      case 'corte': return corteData
      case 'financeiro': return financeiroData
      case 'estoque': return estoqueData
      case 'vendas': return vendasData
      case 'perdas': return perdasData
    }
  }

  function getHeaderTitle(): string {
    const labels: Record<ReportTab, string> = {
      animal: 'Relatório por Animal',
      fornecedor: 'Relatório por Fornecedor',
      periodo: 'Relatório por Período',
      corte: 'Relatório por Corte',
      financeiro: 'Relatório Financeiro',
      estoque: 'Relatório de Estoque',
      vendas: 'Relatório de Vendas',
      perdas: 'Relatório de Perdas',
    }
    return labels[activeTab]
  }

  function exportPDF(exportData: any[], columns: { header: string; dataKey: string }[], title: string) {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')
      doc.setFontSize(16)
      doc.text(title, 14, 20)
      doc.setFontSize(10)
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28)
      doc.text(`Empresa: ${empresa?.nome ?? '-'}`, 14, 34)

      const rows: string[][] = []
      for (const row of exportData) {
        const cells: string[] = []
        for (const col of columns) {
          const val = (row as any)[col.dataKey]
          if (val === null || val === undefined) cells.push('-')
          else if (typeof val === 'number') cells.push(String(val))
          else cells.push(String(val))
        }
        rows.push(cells)
      }

      ;(doc as any).autoTable({
        head: [columns.map(c => c.header)],
        body: rows,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [220, 38, 38] },
      })

      doc.save(`${title.replace(/\s+/g, '_')}.pdf`)
      toast.success('PDF exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar PDF')
    }
  }

  function exportExcel(exportData: any[], columns: { header: string; dataKey: string }[], title: string) {
    try {
      const rows = exportData.map(row => {
        const obj: Record<string, any> = {}
        columns.forEach(col => {
          obj[col.header] = row[col.dataKey] ?? '-'
        })
        return obj
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório')

      const colWidths = columns.map(c => ({ wch: Math.max(c.header.length * 2, 15) }))
      ws['!cols'] = colWidths

      XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}.xlsx`)
      toast.success('Excel exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar Excel')
    }
  }

  function exportCSV(exportData: any[], columns: { header: string; dataKey: string }[], title: string) {
    try {
      const header = columns.map(c => `"${c.header}"`).join(',')
      const rows = exportData.map(row =>
        columns.map(col => {
          const val = row[col.dataKey]
          if (val === null || val === undefined) return '""'
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(',')
      )

      const csv = [header, ...rows].join('\r\n')
      const bom = '\uFEFF'
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/\s+/g, '_')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar CSV')
    }
  }

  function handleExport(type: 'pdf' | 'excel' | 'csv') {
    const data = getTabData(activeTab)
    if (data.length === 0) {
      toast.error('Nenhum dado para exportar')
      return
    }

    const columns = getExportColumns(activeTab)
    const title = getHeaderTitle()

    if (type === 'pdf') exportPDF(data, columns, title)
    else if (type === 'excel') exportExcel(data, columns, title)
    else exportCSV(data, columns, title)
  }

  function getExportColumns(tab: ReportTab): { header: string; dataKey: string }[] {
    switch (tab) {
      case 'animal':
        return [
          { header: 'Lote', dataKey: 'numero_lote' },
          { header: 'Fornecedor', dataKey: 'fornecedor_nome' },
          { header: 'Data Compra', dataKey: 'data_compra' },
          { header: 'Peso Vivo', dataKey: 'peso_vivo' },
          { header: 'Peso Caraca', dataKey: 'peso_carcaca' },
          { header: 'Arrobas', dataKey: 'arrobas' },
          { header: 'Valor Total', dataKey: 'valor_total' },
          { header: 'Qtd Cortes', dataKey: 'cortes_count' },
          { header: 'Peso Cortes', dataKey: 'peso_cortes' },
          { header: 'Valor Vendas', dataKey: 'valor_vendas' },
        ]
      case 'fornecedor':
        return [
          { header: 'Nome', dataKey: 'nome' },
          { header: 'Cidade', dataKey: 'cidade' },
          { header: 'Total Animais', dataKey: 'total_animais' },
          { header: 'Total Investido', dataKey: 'total_investido' },
          { header: 'Peso Vivo Total', dataKey: 'total_peso_vivo' },
        ]
      case 'periodo':
        return [
          { header: 'Data', dataKey: 'data' },
          { header: 'Tipo', dataKey: 'tipo' },
          { header: 'Descri', dataKey: 'descricao' },
          { header: 'Valor', dataKey: 'valor' },
        ]
      case 'corte':
        return [
          { header: 'Corte', dataKey: 'nome' },
          { header: 'Quantidade', dataKey: 'quantidade' },
          { header: 'Peso', dataKey: 'peso' },
          { header: 'Subtotal', dataKey: 'subtotal' },
          { header: 'Preo Mdio', dataKey: 'preco_medio' },
        ]
      case 'financeiro':
        return [
          { header: 'Data', dataKey: 'data' },
          { header: 'Tipo', dataKey: 'tipo' },
          { header: 'Descri', dataKey: 'descricao' },
          { header: 'Categoria', dataKey: 'categoria' },
          { header: 'Valor', dataKey: 'valor' },
        ]
      case 'estoque':
        return [
          { header: 'Nome', dataKey: 'nome' },
          { header: 'Lote', dataKey: 'lote' },
          { header: 'Animal', dataKey: 'animal_lote' },
          { header: 'Peso', dataKey: 'peso' },
          { header: 'Quantidade', dataKey: 'quantidade' },
          { header: 'Validade', dataKey: 'validade' },
          { header: 'Local', dataKey: 'localizacao' },
        ]
      case 'vendas':
        return [
          { header: 'Data', dataKey: 'created_at' },
          { header: 'Cliente', dataKey: 'cliente_nome' },
          { header: 'Tipo', dataKey: 'tipo' },
          { header: 'Pagamento', dataKey: 'forma_pagamento' },
          { header: 'Valor Total', dataKey: 'valor_total' },
          { header: 'Desconto', dataKey: 'desconto' },
        ]
      case 'perdas':
        return [
          { header: 'Data', dataKey: 'created_at' },
          { header: 'Produto', dataKey: 'produto_nome' },
          { header: 'Lote', dataKey: 'produto_lote' },
          { header: 'Quantidade', dataKey: 'quantidade' },
          { header: 'Peso', dataKey: 'peso' },
          { header: 'Motivo', dataKey: 'motivo' },
        ]
    }
  }

  function getExportData(tab: ReportTab): any[] {
    const data = getTabData(tab)
    switch (tab) {
      case 'animal':
        return data.map((a: AnimalReport) => ({
          ...a,
          fornecedor_nome: a.fornecedor?.nome ?? '-',
          data_compra: formatDate(a.data_compra),
          peso_vivo: formatWeight(a.peso_vivo),
          peso_carcaca: formatWeight(a.peso_carcaca),
          arrobas: a.arrobas.toFixed(1),
          valor_total: formatCurrency(a.valor_total),
          peso_cortes: formatWeight(a.peso_cortes),
          valor_vendas: formatCurrency(a.valor_vendas),
        }))
      case 'fornecedor':
        return data.map((f: FornecedorReport) => ({
          ...f,
          cidade: f.cidade ?? '-',
          total_investido: formatCurrency(f.total_investido),
          total_peso_vivo: formatWeight(f.total_peso_vivo),
        }))
      case 'periodo':
        return data.map((p: PeriodoTransaction) => ({
          ...p,
          data: formatDate(p.data),
          valor: formatCurrency(p.valor),
        }))
      case 'corte':
        return data.map((c: CorteReport) => ({
          ...c,
          peso: formatWeight(c.peso),
          subtotal: formatCurrency(c.subtotal),
          preco_medio: formatCurrency(c.preco_medio),
        }))
      case 'financeiro':
        return data.map((f: FinanceiroItem) => ({
          ...f,
          data: formatDate(f.data),
          categoria: f.categoria ?? '-',
          valor: formatCurrency(f.valor),
        }))
      case 'estoque':
        return data.map((e: EstoqueReport) => ({
          ...e,
          animal_lote: e.animal?.numero_lote ?? '-',
          peso: formatWeight(e.peso),
          validade: e.validade ? formatDate(e.validade) : '-',
          localizacao: e.localizacao ?? '-',
        }))
      case 'vendas':
        return data.map((v: VendaReport) => ({
          ...v,
          created_at: formatDate(v.created_at),
          cliente_nome: v.cliente?.nome ?? 'Consumidor',
          desconto: v.desconto ? formatCurrency(v.desconto) : '-',
          valor_total: formatCurrency(v.valor_total),
        }))
      case 'perdas':
        return data.map((p: PerdaReport) => ({
          ...p,
          created_at: formatDate(p.created_at),
          produto_nome: p.estoque?.nome ?? '-',
          produto_lote: p.estoque?.lote ?? '-',
          peso: formatWeight(p.peso),
          motivo: p.motivo ?? '-',
        }))
    }
  }

  function getTotalFinanceiro(): { totalReceitas: number; totalDespesas: number; saldo: number } {
    const receitas = financeiroData.filter(i => i.tipo === 'receita').reduce((acc, r) => acc + r.valor, 0)
    const despesas = financeiroData.filter(i => i.tipo === 'despesa').reduce((acc, d) => acc + d.valor, 0)
    return { totalReceitas: receitas, totalDespesas: despesas, saldo: receitas - despesas }
  }

  function getTotalVendas(): { total: number; totalDesconto: number } {
    const total = vendasData.reduce((acc, v) => acc + v.valor_total, 0)
    const totalDesconto = vendasData.reduce((acc, v) => acc + (v.desconto ?? 0), 0)
    return { total, totalDesconto }
  }

  function getTotalCortes(): { totalQuantidade: number; totalPeso: number; totalSubtotal: number } {
    return corteData.reduce(
      (acc, c) => ({
        totalQuantidade: acc.totalQuantidade + c.quantidade,
        totalPeso: acc.totalPeso + c.peso,
        totalSubtotal: acc.totalSubtotal + c.subtotal,
      }),
      { totalQuantidade: 0, totalPeso: 0, totalSubtotal: 0 }
    )
  }

  function getTotalPerdas(): { totalPeso: number; totalItens: number } {
    return perdasData.reduce(
      (acc, p) => ({
        totalPeso: acc.totalPeso + p.peso,
        totalItens: acc.totalItens + p.quantidade,
      }),
      { totalPeso: 0, totalItens: 0 }
    )
  }

  function getTotalEstoque(): { totalPeso: number; totalItens: number } {
    return estoqueData.reduce(
      (acc, e) => ({
        totalPeso: acc.totalPeso + e.peso,
        totalItens: acc.totalItens + e.quantidade,
      }),
      { totalPeso: 0, totalItens: 0 }
    )
  }

  function getTotalFornecedor(): { totalAnimais: number; totalInvestido: number } {
    return fornecedorData.reduce(
      (acc, f) => ({
        totalAnimais: acc.totalAnimais + f.total_animais,
        totalInvestido: acc.totalInvestido + f.total_investido,
      }),
      { totalAnimais: 0, totalInvestido: 0 }
    )
  }

  function getTotalAnimal(): { totalPesoVivo: number; totalValor: number; totalArrobas: number } {
    return animalData.reduce(
      (acc, a) => ({
        totalPesoVivo: acc.totalPesoVivo + a.peso_vivo,
        totalValor: acc.totalValor + a.valor_total,
        totalArrobas: acc.totalArrobas + a.arrobas,
      }),
      { totalPesoVivo: 0, totalValor: 0, totalArrobas: 0 }
    )
  }

  if (!empresa) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">Selecione uma empresa para acessar os relatrios</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={getHeaderTitle()}
        description="Relatrios e exportao de dados"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => handleExport('pdf')}>
              <FileText className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="ghost" onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="ghost" onClick={() => handleExport('csv')}>
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'text-red-400 border-b-2 border-red-500 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'periodo' && (
        <div className="flex flex-wrap items-end gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Input
            type="date"
            label="Data Incio"
            value={dateStart}
            onChange={e => setDateStart(e.target.value)}
            icon={<Calendar className="w-4 h-4" />}
          />
          <Input
            type="date"
            label="Data Fim"
            value={dateEnd}
            onChange={e => setDateEnd(e.target.value)}
            icon={<Calendar className="w-4 h-4" />}
          />
          <Button onClick={fetchByPeriod} loading={loading}>
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{getHeaderTitle()}</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-64 bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            </div>
          ) : getTabData(activeTab).length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Nenhum dado encontrado</p>
            </div>
          ) : (
            <>
              {renderTable()}
              {renderSummary()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )

  function renderSummary() {
    switch (activeTab) {
      case 'animal': {
        const t = getTotalAnimal()
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Animais" value={String(animalData.length)} />
            <SummaryBadge label="Total Peso Vivo" value={formatWeight(t.totalPesoVivo)} />
            <SummaryBadge label="Total Arrobas" value={`${t.totalArrobas.toFixed(1)} @`} />
            <SummaryBadge label="Total Investido" value={formatCurrency(t.totalValor)} />
          </div>
        )
      }
      case 'fornecedor': {
        const t = getTotalFornecedor()
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Fornecedores" value={String(fornecedorData.length)} />
            <SummaryBadge label="Total Animais" value={String(t.totalAnimais)} />
            <SummaryBadge label="Total Investido" value={formatCurrency(t.totalInvestido)} />
          </div>
        )
      }
      case 'periodo': {
        const total = periodoData.reduce((acc, p) => acc + p.valor, 0)
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Transaes" value={String(periodoData.length)} />
            <SummaryBadge label="Valor Total" value={formatCurrency(total)} />
          </div>
        )
      }
      case 'corte': {
        const t = getTotalCortes()
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Cortes" value={String(corteData.length)} />
            <SummaryBadge label="Total Quantidade" value={String(t.totalQuantidade)} />
            <SummaryBadge label="Total Peso" value={formatWeight(t.totalPeso)} />
            <SummaryBadge label="Total Vendas" value={formatCurrency(t.totalSubtotal)} />
          </div>
        )
      }
      case 'financeiro': {
        const t = getTotalFinanceiro()
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Receitas" value={formatCurrency(t.totalReceitas)} variant="success" />
            <SummaryBadge label="Total Despesas" value={formatCurrency(t.totalDespesas)} variant="danger" />
            <SummaryBadge
              label="Saldo"
              value={formatCurrency(t.saldo)}
              variant={t.saldo >= 0 ? 'success' : 'danger'}
            />
          </div>
        )
      }
      case 'estoque': {
        const t = getTotalEstoque()
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Itens" value={String(estoqueData.length)} />
            <SummaryBadge label="Total Quantidade" value={String(t.totalItens)} />
            <SummaryBadge label="Total Peso" value={formatWeight(t.totalPeso)} />
          </div>
        )
      }
      case 'vendas': {
        const t = getTotalVendas()
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Vendas" value={String(vendasData.length)} />
            <SummaryBadge label="Valor Total" value={formatCurrency(t.total)} />
            <SummaryBadge label="Total Descontos" value={formatCurrency(t.totalDesconto)} />
          </div>
        )
      }
      case 'perdas': {
        const t = getTotalPerdas()
        return (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-800">
            <SummaryBadge label="Total Registros" value={String(perdasData.length)} />
            <SummaryBadge label="Total Itens" value={String(t.totalItens)} />
            <SummaryBadge label="Peso Total Perdido" value={formatWeight(t.totalPeso)} variant="danger" />
          </div>
        )
      }
    }
  }

  function renderTable() {
    switch (activeTab) {
      case 'animal': return renderAnimalTable()
      case 'fornecedor': return renderFornecedorTable()
      case 'periodo': return renderPeriodoTable()
      case 'corte': return renderCorteTable()
      case 'financeiro': return renderFinanceiroTable()
      case 'estoque': return renderEstoqueTable()
      case 'vendas': return renderVendasTable()
      case 'perdas': return renderPerdasTable()
    }
  }

  function filterData<T extends Record<string, any>>(data: T[], fields: (keyof T)[]): T[] {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter(item =>
      fields.some(field => {
        const val = item[field]
        return val != null && String(val).toLowerCase().includes(term)
      })
    )
  }

  function renderAnimalTable() {
    const filtered = filterData(animalData, ['numero_lote', 'fornecedor_nome' as any])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Lote</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Fornecedor</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Peso Vivo</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Peso Caraca</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Arrobas</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Valor Total</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Cortes</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Peso Cortes</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Vendas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-100 font-medium">{a.numero_lote}</td>
                <td className="py-3 text-zinc-300">{a.fornecedor?.nome ?? '-'}</td>
                <td className="py-3 text-zinc-300">{formatDate(a.data_compra)}</td>
                <td className="py-3 text-zinc-300 text-right">{formatWeight(a.peso_vivo)}</td>
                <td className="py-3 text-zinc-300 text-right">{formatWeight(a.peso_carcaca)}</td>
                <td className="py-3 text-zinc-300 text-right">{a.arrobas.toFixed(1)}</td>
                <td className="py-3 text-zinc-100 text-right font-medium">{formatCurrency(a.valor_total)}</td>
                <td className="py-3 text-zinc-300 text-right">{a.cortes_count}</td>
                <td className="py-3 text-zinc-300 text-right">{formatWeight(a.peso_cortes)}</td>
                <td className="py-3 text-zinc-100 text-right font-medium">{formatCurrency(a.valor_vendas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderFornecedorTable() {
    const filtered = filterData(fornecedorData, ['nome', 'cidade'])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Nome</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Cidade</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Total Animais</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Total Investido</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Peso Vivo Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-100 font-medium">{f.nome}</td>
                <td className="py-3 text-zinc-300">{f.cidade ?? '-'}</td>
                <td className="py-3 text-zinc-300 text-right">{f.total_animais}</td>
                <td className="py-3 text-zinc-100 text-right font-medium">{formatCurrency(f.total_investido)}</td>
                <td className="py-3 text-zinc-300 text-right">{formatWeight(f.total_peso_vivo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderPeriodoTable() {
    const filtered = filterData(periodoData, ['tipo', 'descricao'])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Tipo</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Descrio</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-300">{formatDate(p.data)}</td>
                <td className="py-3">
                  <Badge variant={p.tipo === 'venda' ? 'success' : p.tipo === 'receita' ? 'info' : 'danger'}>
                    {p.tipo}
                  </Badge>
                </td>
                <td className="py-3 text-zinc-100">{p.descricao}</td>
                <td className="py-3 text-zinc-100 text-right font-medium">{formatCurrency(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderCorteTable() {
    const filtered = filterData(corteData, ['nome'])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Corte</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Quantidade</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Peso</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Subtotal</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Preo Mdio</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.nome} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-100 font-medium">{c.nome}</td>
                <td className="py-3 text-zinc-300 text-right">{c.quantidade}</td>
                <td className="py-3 text-zinc-300 text-right">{formatWeight(c.peso)}</td>
                <td className="py-3 text-zinc-100 text-right font-medium">{formatCurrency(c.subtotal)}</td>
                <td className="py-3 text-zinc-300 text-right">{formatCurrency(c.preco_medio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderFinanceiroTable() {
    const filtered = filterData(financeiroData, ['descricao', 'categoria', 'tipo'])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Tipo</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Descrio</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Categoria</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-300">{formatDate(f.data)}</td>
                <td className="py-3">
                  <Badge variant={f.tipo === 'receita' ? 'success' : 'danger'}>
                    {f.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </Badge>
                </td>
                <td className="py-3 text-zinc-100">{f.descricao}</td>
                <td className="py-3 text-zinc-300">{f.categoria ?? '-'}</td>
                <td className={`py-3 text-right font-medium ${f.tipo === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(f.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderEstoqueTable() {
    const filtered = filterData(estoqueData, ['nome', 'lote'])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Nome</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Lote</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Animal</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Peso</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Quantidade</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Validade</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Local</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-100 font-medium">{e.nome}</td>
                <td className="py-3 text-zinc-300">{e.lote}</td>
                <td className="py-3 text-zinc-300">{e.animal?.numero_lote ?? '-'}</td>
                <td className="py-3 text-zinc-300 text-right">{formatWeight(e.peso)}</td>
                <td className="py-3 text-zinc-300 text-right">{e.quantidade}</td>
                <td className="py-3 text-zinc-300">{e.validade ? formatDate(e.validade) : '-'}</td>
                <td className="py-3 text-zinc-300">{e.localizacao ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderVendasTable() {
    const filtered = filterData(vendasData, ['cliente_nome' as any, 'forma_pagamento', 'tipo'])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Cliente</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Tipo</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Pagamento</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Valor Total</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Desconto</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Itens</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-300">{formatDate(v.created_at)}</td>
                <td className="py-3 text-zinc-100 font-medium">{v.cliente?.nome ?? 'Consumidor'}</td>
                <td className="py-3">
                  <Badge variant={v.tipo === 'peso' ? 'info' : 'default'}>
                    {v.tipo === 'peso' ? 'Por Peso' : 'Por Quantidade'}
                  </Badge>
                </td>
                <td className="py-3 text-zinc-300 capitalize">{v.forma_pagamento}</td>
                <td className="py-3 text-zinc-100 text-right font-medium">{formatCurrency(v.valor_total)}</td>
                <td className="py-3 text-red-400 text-right">{v.desconto ? formatCurrency(v.desconto) : '-'}</td>
                <td className="py-3 text-zinc-300">
                  {v.itens?.slice(0, 2).map(i => i.corte_nome).join(', ')}
                  {v.itens && v.itens.length > 2 && ` +${v.itens.length - 2}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderPerdasTable() {
    const filtered = filterData(perdasData, ['motivo'])
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-zinc-400 font-medium pb-3">Data</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Produto</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Lote</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Quantidade</th>
              <th className="text-right text-zinc-400 font-medium pb-3">Peso</th>
              <th className="text-left text-zinc-400 font-medium pb-3">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 text-zinc-300">{formatDate(p.created_at)}</td>
                <td className="py-3 text-zinc-100 font-medium">{p.estoque?.nome ?? '-'}</td>
                <td className="py-3 text-zinc-300">{p.estoque?.lote ?? '-'}</td>
                <td className="py-3 text-zinc-300 text-right">{p.quantidade}</td>
                <td className="py-3 text-red-400 text-right font-medium">{formatWeight(p.peso)}</td>
                <td className="py-3 text-zinc-300">{p.motivo ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
}

function SummaryBadge({ label, value, variant = 'default' }: { label: string; value: string; variant?: 'default' | 'success' | 'danger' }) {
  const colors = {
    default: 'bg-zinc-800 text-zinc-300',
    success: 'bg-green-900/30 text-green-400',
    danger: 'bg-red-900/30 text-red-400',
  }
  return (
    <div className={`px-4 py-2 rounded-lg border border-zinc-700 ${colors[variant]}`}>
      <p className="text-xs text-current opacity-70">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
