import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatWeight, formatDate } from '../../lib/utils'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Search, Box, Package, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Estoque } from '../../types'

type MovementType = 'saida' | 'ajuste' | 'perda'

const movementOptions = [
  { value: 'saida', label: 'Saída' },
  { value: 'ajuste', label: 'Ajuste' },
  { value: 'perda', label: 'Perda' },
]

function isNearExpiry(validade: string | null | undefined): boolean {
  if (!validade) return false
  const diff = new Date(validade).getTime() - Date.now()
  return diff >= 0 && diff <= 5 * 24 * 60 * 60 * 1000
}

function isExpired(validade: string | null | undefined): boolean {
  if (!validade) return false
  return new Date(validade) < new Date()
}

export function InventoryList() {
  const { user, empresa } = useAuth()
  const [items, setItems] = useState<Estoque[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [selectedItem, setSelectedItem] = useState<Estoque | null>(null)
  const [movementOpen, setMovementOpen] = useState(false)

  const [movementTipo, setMovementTipo] = useState<MovementType>('saida')
  const [movementQtd, setMovementQtd] = useState(1)
  const [movementPeso, setMovementPeso] = useState(0)
  const [movementMotivo, setMovementMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.empresa_id) fetchItems()
  }, [user?.empresa_id])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('estoque')
      .select('*')
      .eq('empresa_id', user!.empresa_id)
      .order('created_at', { ascending: false })

    if (error) toast.error('Erro ao carregar estoque')
    else setItems(data ?? [])
    setLoading(false)
  }

  const locations = [...new Set(items.map(i => i.localizacao).filter(Boolean))] as string[]

  const filtered = items.filter(item => {
    const matchSearch = !search || item.nome.toLowerCase().includes(search.toLowerCase())
    const matchLocation = !filterLocation || item.localizacao === filterLocation
    return matchSearch && matchLocation
  })

  const totalItems = items.length
  const totalWeight = items.reduce((acc, i) => acc + i.peso, 0)
  const nearExpiry = items.filter(i => isNearExpiry(i.validade)).length

  function openDetail(item: Estoque) {
    setSelectedItem(item)
    setMovementTipo('saida')
    setMovementQtd(1)
    setMovementPeso(0)
    setMovementMotivo('')
    setMovementOpen(false)
  }

  async function handleMovement() {
    if (!selectedItem || !user) return

    if (movementQtd <= 0 || movementPeso <= 0) {
      toast.error('Quantidade e peso devem ser maiores que zero')
      return
    }

    if (movementQtd > selectedItem.quantidade) {
      toast.error('Quantidade maior que o disponível em estoque')
      return
    }

    if (movementPeso > selectedItem.peso) {
      toast.error('Peso maior que o disponível em estoque')
      return
    }

    setSaving(true)

    const novaQtd = selectedItem.quantidade - movementQtd
    const novoPeso = Math.max(0, selectedItem.peso - movementPeso)

    const { error: movementError } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        empresa_id: user.empresa_id,
        estoque_id: selectedItem.id,
        tipo: movementTipo,
        quantidade: movementQtd,
        peso: movementPeso,
        motivo: movementMotivo || null,
        created_by: user.id,
      })

    if (movementError) {
      toast.error('Erro ao registrar movimentação')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('estoque')
      .update({ quantidade: novaQtd, peso: novoPeso })
      .eq('id', selectedItem.id)

    if (updateError) {
      toast.error('Erro ao atualizar estoque')
      setSaving(false)
      return
    }

    toast.success('Movimentação registrada!')
    setMovementOpen(false)
    setSaving(false)
    fetchItems()
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Estoque"
        description={empresa?.nome ? `Gerenciamento de estoque - ${empresa.nome}` : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/30 rounded-xl text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total de Itens</p>
              <p className="text-2xl font-bold text-zinc-100">{totalItems}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-900/30 rounded-xl text-green-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Peso Total</p>
              <p className="text-2xl font-bold text-zinc-100">{formatWeight(totalWeight)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-900/30 rounded-xl text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Próximos ao Vencimento</p>
              <p className="text-2xl font-bold text-zinc-100">{nearExpiry}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome do corte..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        {locations.length > 0 && (
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="w-full sm:w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Todas localizações</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500">Nenhum item encontrado no estoque</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card
              key={item.id}
              className="cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => openDetail(item)}
            >
              <CardHeader>
                <CardTitle className="truncate">{item.nome}</CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  {item.quantidade <= 0 && (
                    <Badge variant="danger">Sem estoque</Badge>
                  )}
                  {isExpired(item.validade) && (
                    <Badge variant="danger">Vencido</Badge>
                  )}
                  {isNearExpiry(item.validade) && !isExpired(item.validade) && (
                    <Badge variant="warning">Vencendo</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-500">Peso</p>
                    <p className="text-zinc-100 font-medium">{formatWeight(item.peso)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Quantidade</p>
                    <p className="text-zinc-100 font-medium">{item.quantidade}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Lote</p>
                    <p className="text-zinc-100 font-medium truncate">{item.lote}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Localização</p>
                    <p className="text-zinc-100 font-medium truncate">{item.localizacao || '-'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Data Entrada</p>
                    <p className="text-zinc-100 font-medium">{formatDate(item.data_entrada)}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Validade</p>
                    <p className={`font-medium ${isExpired(item.validade) ? 'text-red-400' : isNearExpiry(item.validade) ? 'text-yellow-400' : 'text-zinc-100'}`}>
                      {item.validade ? formatDate(item.validade) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selectedItem && !movementOpen}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.nome ?? ''}
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs mb-1">Peso</p>
                <p className="text-zinc-100 font-semibold text-lg">{formatWeight(selectedItem.peso)}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs mb-1">Quantidade</p>
                <p className="text-zinc-100 font-semibold text-lg">{selectedItem.quantidade}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs mb-1">Lote</p>
                <p className="text-zinc-100 font-semibold text-lg">{selectedItem.lote}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs mb-1">Localização</p>
                <p className="text-zinc-100 font-semibold text-lg">{selectedItem.localizacao || '-'}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs mb-1">Data de Entrada</p>
                <p className="text-zinc-100 font-semibold text-lg">{formatDate(selectedItem.data_entrada)}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-zinc-500 text-xs mb-1">Validade</p>
                <p className={`font-semibold text-lg ${isExpired(selectedItem.validade) ? 'text-red-400' : isNearExpiry(selectedItem.validade) ? 'text-yellow-400' : 'text-zinc-100'}`}>
                  {selectedItem.validade ? formatDate(selectedItem.validade) : '-'}
                </p>
              </div>
            </div>

            {selectedItem.codigo_interno && (
              <div className="text-sm">
                <p className="text-zinc-500">Código Interno</p>
                <p className="text-zinc-100 font-medium">{selectedItem.codigo_interno}</p>
              </div>
            )}

            <div className="border-t border-zinc-800 pt-4">
              <h4 className="text-sm font-medium text-zinc-100 mb-3">Registrar Movimentação</h4>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {movementOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setMovementTipo(opt.value as MovementType)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      movementTipo === opt.value
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input
                  label="Quantidade"
                  type="number"
                  min={1}
                  max={selectedItem.quantidade}
                  value={movementQtd}
                  onChange={e => setMovementQtd(Number(e.target.value))}
                />
                <Input
                  label="Peso (kg)"
                  type="number"
                  step={0.01}
                  min={0.01}
                  max={selectedItem.peso}
                  value={movementPeso}
                  onChange={e => setMovementPeso(Number(e.target.value))}
                />
              </div>
              <Input
                label="Motivo (opcional)"
                placeholder="Descreva o motivo da movimentação..."
                value={movementMotivo}
                onChange={e => setMovementMotivo(e.target.value)}
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setSelectedItem(null)}>
                  Cancelar
                </Button>
                <Button loading={saving} onClick={handleMovement}>
                  Registrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
