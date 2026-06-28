import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatWeight } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Brain, AlertTriangle, TrendingUp, TrendingDown, Lightbulb, Clock, BarChart3, MessageSquare } from 'lucide-react'
import type { Corte, Estoque } from '../../types'

interface Insight {
  id: string
  tipo: 'analise' | 'positivo' | 'negativo' | 'sugestao' | 'alerta'
  titulo: string
  mensagem: string
  icon: typeof Brain
  variant: 'info' | 'success' | 'danger' | 'warning'
}

const typeConfig = {
  analise: { icon: Brain, label: 'Análise', variant: 'info' as const },
  positivo: { icon: TrendingUp, label: 'Positivo', variant: 'success' as const },
  negativo: { icon: TrendingDown, label: 'Negativo', variant: 'danger' as const },
  sugestao: { icon: Lightbulb, label: 'Sugestão', variant: 'warning' as const },
  alerta: { icon: AlertTriangle, label: 'Alerta', variant: 'danger' as const },
}

export function IntelligencePage() {
  const { empresa } = useAuth()
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<Insight[]>([])

  useEffect(() => {
    if (!empresa) return
    generateInsights(empresa.id)
  }, [empresa?.id])

  async function generateInsights(empresaId: string) {
    setLoading(true)
    const result: Insight[] = []

    try {
      const { data: animais } = await supabase
        .from('animais')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })

      const { data: cortes } = await supabase
        .from('cortes')
        .select('*')
        .eq('empresa_id', empresaId)

      const { data: itensVenda } = await supabase
        .from('itens_venda')
        .select('*')

      const { data: estoque } = await supabase
        .from('estoque')
        .select('*')
        .eq('empresa_id', empresaId)

      if (animais && animais.length >= 2 && cortes) {
        const animaisComReceita = animais.map(a => {
          const cortesAnimal = cortes.filter(c => c.animal_id === a.id)
          const receita = cortesAnimal.reduce((acc, c) => acc + (c.preco_venda * c.peso), 0)
          const margem = receita > 0 ? ((receita - a.valor_total) / receita) * 100 : 0
          return { ...a, receita, margem }
        })

        const [ultimo, penultimo] = animaisComReceita
        if (ultimo && penultimo && ultimo.margem < penultimo.margem) {
          result.push({
            id: '1',
            tipo: 'negativo',
            titulo: 'Margem em declínio',
            mensagem: `O último lote "${ultimo.numero_lote}" teve margem de ${ultimo.margem.toFixed(1)}%, inferior aos ${penultimo.margem.toFixed(1)}% do lote anterior "${penultimo.numero_lote}".`,
            icon: TrendingDown,
            variant: 'danger',
          })
        }
      }

      if (itensVenda && itensVenda.length > 0) {
        const lucroPorCorte: Record<string, number> = {}
        itensVenda.forEach(item => {
          lucroPorCorte[item.corte_nome] = (lucroPorCorte[item.corte_nome] || 0) + (item.subtotal || 0)
        })
        const topCorte = Object.entries(lucroPorCorte).sort((a, b) => b[1] - a[1])[0]
        if (topCorte) {
          result.push({
            id: '2',
            tipo: 'positivo',
            titulo: 'Maior lucro por corte',
            mensagem: `A "${topCorte[0]}" está gerando o maior lucro, com ${formatCurrency(topCorte[1])} em vendas.`,
            icon: TrendingUp,
            variant: 'success',
          })
        }
      }

      if (cortes && cortes.length > 0) {
        const mediaVenda = cortes.reduce((acc, c) => acc + c.preco_venda, 0) / cortes.length
        const cortesAbaixoMedia = cortes.filter(c => c.preco_venda < mediaVenda)

        if (cortesAbaixoMedia.length > 0) {
          const nomes = [...new Set(cortesAbaixoMedia.map(c => c.nome))]
          const destaques = nomes.slice(0, 3).join(', ')
          result.push({
            id: '3',
            tipo: 'negativo',
            titulo: 'Margem abaixo da média',
            mensagem: `${destaques} ${nomes.length > 3 ? `e mais ${nomes.length - 3} ` : ''}estão com preço de venda abaixo da média de ${formatCurrency(mediaVenda)}/kg. Considere revisar os preços.`,
            icon: TrendingDown,
            variant: 'danger',
          })
        }
      }

      if (estoque && estoque.length > 0) {
        const trintaDiasAtras = new Date()
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

        const parados = estoque.filter(e => {
          const entrada = new Date(e.data_entrada)
          return entrada < trintaDiasAtras
        })

        if (parados.length > 0) {
          const maisAntigo = parados.sort(
            (a, b) => new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime()
          )[0]

          result.push({
            id: '4',
            tipo: 'alerta',
            titulo: 'Estoque parado',
            mensagem: `${parados.length} item(ns) estão há mais de 30 dias sem movimentação. O item mais antigo é "${maisAntigo.nome}" desde ${new Date(maisAntigo.data_entrada).toLocaleDateString('pt-BR')}.`,
            icon: AlertTriangle,
            variant: 'danger',
          })
        }
      }

      if (cortes && cortes.length > 0) {
        const cortesReajuste = cortes.filter(c => {
          if (c.preco_sugerido <= 0 || c.preco_venda <= 0) return false
          const diferenca = Math.abs(c.preco_sugerido - c.preco_venda)
          const percentual = diferenca / c.preco_sugerido
          return percentual > 0.1
        })

        if (cortesReajuste.length > 0) {
          const exemplos = cortesReajuste.slice(0, 3).map(c =>
            `${c.nome} (sugerido: ${formatCurrency(c.preco_sugerido)}, atual: ${formatCurrency(c.preco_venda)})`
          ).join(', ')
          result.push({
            id: '5',
            tipo: 'sugestao',
            titulo: 'Reajuste de preço sugerido',
            mensagem: `${cortesReajuste.length} corte(s) possuem diferença superior a 10% entre preço sugerido e preço de venda: ${exemplos}.`,
            icon: Lightbulb,
            variant: 'warning',
          })
        }
      }

      if (result.length === 0) {
        result.push({
          id: '0',
          tipo: 'analise',
          titulo: 'Sem insights disponíveis',
          mensagem: 'Cadastre animais, cortes e realize vendas para gerar insights inteligentes sobre o seu negócio.',
          icon: Brain,
          variant: 'info',
        })
      }
    } catch {
      result.push({
        id: 'error',
        tipo: 'alerta',
        titulo: 'Erro ao gerar insights',
        mensagem: 'Não foi possível analisar os dados. Tente novamente mais tarde.',
        icon: AlertTriangle,
        variant: 'danger',
      })
    }

    setInsights(result)
    setLoading(false)
  }

  const counts = {
    analise: insights.filter(i => i.tipo === 'analise').length,
    positivo: insights.filter(i => i.tipo === 'positivo').length,
    negativo: insights.filter(i => i.tipo === 'negativo').length,
    sugestao: insights.filter(i => i.tipo === 'sugestao').length,
    alerta: insights.filter(i => i.tipo === 'alerta').length,
  }

  return (
    <div>
      <PageHeader
        title="Inteligência"
        description="Insights gerados a partir dos seus dados"
      />

      <div className="flex flex-wrap gap-3 mb-8">
        {(Object.entries(typeConfig) as [keyof typeof counts, typeof typeConfig['analise']][]).map(([tipo, config]) => {
          if (counts[tipo] === 0) return null
          return (
            <Badge key={tipo} variant={config.variant}>
              <config.icon className="w-3 h-3 mr-1.5 inline" />
              {config.label}: {counts[tipo]}
            </Badge>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map(insight => (
            <Card key={insight.id}>
              <CardContent className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  insight.variant === 'info' ? 'bg-blue-900/30 text-blue-400' :
                  insight.variant === 'success' ? 'bg-green-900/30 text-green-400' :
                  insight.variant === 'danger' ? 'bg-red-900/30 text-red-400' :
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  <insight.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-zinc-100">{insight.titulo}</h3>
                    <Badge variant={insight.variant}>
                      {typeConfig[insight.tipo].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{insight.mensagem}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
