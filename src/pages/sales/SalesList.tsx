import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ShoppingBag, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { Venda } from '../../types'

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  prazo: 'Prazo',
}

const paymentVariants: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
  pix: 'info',
  dinheiro: 'success',
  cartao: 'warning',
  prazo: 'danger',
}

export function SalesList() {
  const { empresa } = useAuth()
  const navigate = useNavigate()
  const [vendas, setVendas] = useState<(Venda & { cliente?: { nome: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (empresa) fetchVendas()
  }, [empresa])

  async function fetchVendas() {
    if (!empresa) return
    setLoading(true)
    const { data, error } = await supabase
      .from('vendas')
      .select('*, cliente:clientes(nome)')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar vendas')
    } else {
      setVendas(data ?? [])
    }
    setLoading(false)
  }

  const filtered = vendas.filter(v =>
    !search || v.cliente?.nome?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Histórico de vendas realizadas"
        actions={
          <Button onClick={() => navigate('/vendas/nova')}>
            <Plus className="w-4 h-4" />
            Nova Venda
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Histórico de Vendas
            </div>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              className="w-64 bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Buscar por cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Data/Hora</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Forma Pagamento</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center px-4 py-8 text-zinc-500">
                        Nenhuma venda encontrada
                      </td>
                    </tr>
                  ) : (
                    filtered.map(venda => (
                      <tr
                        key={venda.id}
                        className="border-t border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/vendas/${venda.id}`)}
                      >
                        <td className="px-4 py-3 text-zinc-300">{formatDateTime(venda.created_at)}</td>
                        <td className="px-4 py-3 text-zinc-300">{venda.cliente?.nome || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={paymentVariants[venda.forma_pagamento] || 'default'}>
                            {paymentLabels[venda.forma_pagamento] || venda.forma_pagamento}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-100 font-medium">
                          {formatCurrency(venda.valor_total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
