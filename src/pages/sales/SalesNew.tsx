import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ShoppingBag, Plus, Minus, Trash2, Search, User, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import type { Cliente } from '../../types'

interface EstoqueItem {
  id: string
  nome: string
  peso: number
  quantidade: number
  preco_venda: number
}

interface CartItem {
  estoque_id: string
  corte_nome: string
  quantidade: number
  peso: number
  preco_unitario: number
  subtotal: number
}

export function SalesNew() {
  const { empresa, user } = useAuth()
  const navigate = useNavigate()

  const [tipo, setTipo] = useState<'peso' | 'quantidade'>('peso')
  const [estoqueItems, setEstoqueItems] = useState<EstoqueItem[]>([])
  const [inventorySearch, setInventorySearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)
  const [formaPagamento, setFormaPagamento] = useState('pix')
  const [observacoes, setObservacoes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')

  useEffect(() => {
    if (empresa) {
      fetchEstoque()
      fetchClientes()
    }
  }, [empresa])

  async function fetchEstoque() {
    if (!empresa) return
    const { data, error } = await supabase
      .from('estoque')
      .select('*, corte:cortes(preco_venda)')
      .eq('empresa_id', empresa.id)
      .gt('quantidade', 0)

    if (!error && data) {
      setEstoqueItems(
        data.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          nome: item.nome as string,
          peso: item.peso as number,
          quantidade: item.quantidade as number,
          preco_venda: (item.corte as { preco_venda: number })?.preco_venda ?? 0,
        }))
      )
    }
  }

  async function fetchClientes() {
    if (!empresa) return
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('nome')
    if (data) setClientes(data)
  }

  const filteredInventory = estoqueItems.filter(i =>
    !inventorySearch || i.nome.toLowerCase().includes(inventorySearch.toLowerCase())
  )

  const filteredClientes = clientes.filter(c =>
    !clientSearch || c.nome.toLowerCase().includes(clientSearch.toLowerCase())
  )

  function addToCart(item: EstoqueItem) {
    if (cart.some(c => c.estoque_id === item.id)) {
      toast.error('Item já adicionado ao carrinho')
      return
    }
    const newItem: CartItem = {
      estoque_id: item.id,
      corte_nome: item.nome,
      quantidade: tipo === 'quantidade' ? 1 : 1,
      peso: tipo === 'peso' ? 0.5 : 0,
      preco_unitario: item.preco_venda,
      subtotal: 0,
    }
    newItem.subtotal = calcSubtotal(newItem)
    setCart([...cart, newItem])
  }

  function removeFromCart(estoque_id: string) {
    setCart(cart.filter(c => c.estoque_id !== estoque_id))
  }

  function updateCartItem(estoque_id: string, field: 'quantidade' | 'peso', value: number) {
    setCart(prev =>
      prev.map(item => {
        if (item.estoque_id !== estoque_id) return item
        const updated = { ...item, [field]: Math.max(0, value) }
        updated.subtotal = calcSubtotal(updated)
        return updated
      })
    )
  }

  function calcSubtotal(item: CartItem): number {
    if (tipo === 'peso') return item.peso * item.preco_unitario
    return item.quantidade * item.preco_unitario
  }

  function recalcCartSubtotals(prev: CartItem[]): CartItem[] {
    return prev.map(item => ({ ...item, subtotal: calcSubtotal(item) }))
  }

  useEffect(() => {
    setCart(recalcCartSubtotals)
  }, [tipo])

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0)

  const selectedCliente = clientes.find(c => c.id === selectedClienteId)

  async function handleCreateCliente() {
    if (!empresa || !user || !newClientName.trim()) return
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        empresa_id: empresa.id,
        nome: newClientName.trim(),
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar cliente')
      return
    }
    toast.success('Cliente criado!')
    setClientes([...clientes, data])
    setSelectedClienteId(data.id)
    setNewClientName('')
    setShowNewClient(false)
  }

  async function handleConfirm() {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho')
      return
    }
    if (!empresa || !user) return
    setSubmitting(true)

    const vendaId = crypto.randomUUID()
    const now = new Date().toISOString()

    const { error: vendaError } = await supabase.from('vendas').insert({
      id: vendaId,
      empresa_id: empresa.id,
      cliente_id: selectedClienteId,
      tipo,
      forma_pagamento: formaPagamento,
      valor_total: total,
      observacoes: observacoes || null,
      created_by: user.id,
    })

    if (vendaError) {
      toast.error('Erro ao registrar venda')
      setSubmitting(false)
      return
    }

    const itens = cart.map(item => ({
      venda_id: vendaId,
      estoque_id: item.estoque_id,
      corte_nome: item.corte_nome,
      quantidade: item.quantidade,
      peso: item.peso,
      preco_unitario: item.preco_unitario,
      subtotal: item.subtotal,
    }))

    const { error: itensError } = await supabase.from('itens_venda').insert(itens)

    if (itensError) {
      toast.error('Erro ao registrar itens da venda')
      setSubmitting(false)
      return
    }

    for (const item of cart) {
      const estoqueItem = estoqueItems.find(e => e.id === item.estoque_id)
      if (!estoqueItem) continue

      const qtyDeduction = tipo === 'quantidade' ? item.quantidade : 1
      const pesoDeduction = tipo === 'peso' ? item.peso : 0

      const { error: updateError } = await supabase
        .from('estoque')
        .update({
          quantidade: Math.max(0, estoqueItem.quantidade - qtyDeduction),
          peso: Math.max(0, estoqueItem.peso - pesoDeduction),
        })
        .eq('id', item.estoque_id)

      if (updateError) {
        toast.error(`Erro ao atualizar estoque: ${item.corte_nome}`)
      }

      await supabase.from('movimentacoes_estoque').insert({
        empresa_id: empresa.id,
        estoque_id: item.estoque_id,
        tipo: 'saida',
        quantidade: qtyDeduction,
        peso: pesoDeduction,
        motivo: `Venda #${vendaId.slice(0, 8)}`,
        created_by: user.id,
      })
    }

    const { error: receitaError } = await supabase.from('receitas').insert({
      empresa_id: empresa.id,
      descricao: `Venda - ${cart.map(i => i.corte_nome).join(', ')}`,
      valor: total,
      data: now,
      categoria: 'venda',
      venda_id: vendaId,
      created_by: user.id,
    })

    if (receitaError) {
      toast.error('Erro ao registrar receita')
    }

    toast.success('Venda realizada com sucesso!')
    setSubmitting(false)
    navigate('/vendas')
  }

  return (
    <div>
      <PageHeader
        title="Nova Venda"
        description="Registrar venda no PDV"
        actions={
          <Button variant="ghost" onClick={() => navigate('/vendas')}>
            Voltar
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Adicionar Itens
                </div>
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      tipo === 'peso'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={() => setTipo('peso')}
                  >
                    Por Peso
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      tipo === 'quantidade'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    onClick={() => setTipo('quantidade')}
                  >
                    Por Quantidade
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    className="w-56 bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Buscar item..."
                    value={inventorySearch}
                    onChange={e => setInventorySearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInventory.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Nenhum item disponível no estoque</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {filteredInventory.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{item.nome}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {item.quantidade} un · {item.peso.toFixed(2)} kg ·{' '}
                          {formatCurrency(item.preco_venda)}
                          {tipo === 'peso' ? '/kg' : '/un'}
                        </p>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="shrink-0 ml-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-all duration-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Carrinho
                </div>
              </CardTitle>
              <span className="text-sm text-zinc-500">{cart.length} itens</span>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-zinc-500 py-6">Carrinho vazio</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div
                      key={item.estoque_id}
                      className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-zinc-200 truncate">{item.corte_nome}</p>
                        <button
                          onClick={() => removeFromCart(item.estoque_id)}
                          className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {tipo === 'peso' ? (
                          <div className="flex items-center gap-1 flex-1">
                            <button
                              className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                              onClick={() => updateCartItem(item.estoque_id, 'peso', +(item.peso - 0.1).toFixed(2))}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-20 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                              value={item.peso}
                              onChange={e => updateCartItem(item.estoque_id, 'peso', parseFloat(e.target.value) || 0)}
                            />
                            <button
                              className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                              onClick={() => updateCartItem(item.estoque_id, 'peso', +(item.peso + 0.1).toFixed(2))}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-xs text-zinc-500 ml-1">kg</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-1">
                            <button
                              className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                              onClick={() => updateCartItem(item.estoque_id, 'quantidade', Math.max(0, item.quantidade - 1))}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                              value={item.quantidade}
                              onChange={e => updateCartItem(item.estoque_id, 'quantidade', parseInt(e.target.value) || 0)}
                            />
                            <button
                              className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
                              onClick={() => updateCartItem(item.estoque_id, 'quantidade', item.quantidade + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-xs text-zinc-500 ml-1">un</span>
                          </div>
                        )}
                        <p className="text-sm font-medium text-zinc-100 shrink-0 ml-2">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-400">Subtotal</span>
                  <span className="text-sm text-zinc-200">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="text-zinc-100">Total</span>
                  <span className="text-red-400">{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Cliente
                </div>
              </CardTitle>
              <button
                onClick={() => setShowNewClient(true)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                />
              </div>

              {filteredClientes.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredClientes.map(cliente => (
                    <button
                      key={cliente.id}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedClienteId === cliente.id
                          ? 'bg-red-600/20 text-red-400 border border-red-800/30'
                          : 'text-zinc-300 hover:bg-zinc-800 border border-transparent'
                      }`}
                      onClick={() =>
                        setSelectedClienteId(
                          selectedClienteId === cliente.id ? null : cliente.id
                        )
                      }
                    >
                      {cliente.nome}
                      {cliente.telefone && (
                        <span className="text-zinc-500 ml-2">{cliente.telefone}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedCliente && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50">
                  <span className="text-sm text-zinc-200">{selectedCliente.nome}</span>
                  <button
                    onClick={() => setSelectedClienteId(null)}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              )}

              <Select
                label="Forma de Pagamento"
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}
                options={[
                  { value: 'pix', label: 'PIX' },
                  { value: 'dinheiro', label: 'Dinheiro' },
                  { value: 'cartao', label: 'Cartão' },
                  { value: 'prazo', label: 'Prazo' },
                ]}
              />

              <Input
                label="Observações"
                placeholder="Observações da venda..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
              />

              <Button
                className="w-full"
                loading={submitting}
                onClick={handleConfirm}
                disabled={cart.length === 0}
              >
                <ShoppingBag className="w-4 h-4" />
                Confirmar Venda — {formatCurrency(total)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        title="Novo Cliente"
      >
        <div className="space-y-4">
          <Input
            label="Nome do Cliente"
            placeholder="Digite o nome..."
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateCliente()
            }}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowNewClient(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCliente} disabled={!newClientName.trim()}>
              <Plus className="w-4 h-4" />
              Criar Cliente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
