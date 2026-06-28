export interface Empresa {
  id: string
  nome: string
  logo?: string
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: string
  cidade?: string
  estado?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export type UserRole = 'admin' | 'gerente' | 'funcionario'

export interface Usuario {
  id: string
  email: string
  nome: string
  empresa_id: string
  cargo: UserRole
  avatar?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Fornecedor {
  id: string
  empresa_id: string
  nome: string
  telefone?: string
  whatsapp?: string
  cidade?: string
  cpf_cnpj?: string
  observacoes?: string
  created_at: string
  updated_at: string
  created_by: string
}

export interface Animal {
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
  observacoes?: string
  fotos?: string[]
  notas_fiscais?: string[]
  created_at: string
  updated_at: string
  created_by: string
  fornecedor?: Fornecedor
}

export interface Categoria {
  id: string
  empresa_id: string
  nome: string
  descricao?: string
  created_at: string
}

export interface Corte {
  id: string
  empresa_id: string
  animal_id: string
  nome: string
  peso: number
  quantidade: number
  categoria_id?: string
  preco_sugerido: number
  preco_venda: number
  observacoes?: string
  created_at: string
  created_by: string
  categoria?: Categoria
}

export interface Estoque {
  id: string
  empresa_id: string
  animal_id: string
  corte_id: string
  nome: string
  peso: number
  quantidade: number
  localizacao?: string
  data_entrada: string
  validade?: string
  lote: string
  codigo_interno?: string
  codigo_barras?: string
  created_at: string
  updated_at: string
}

export type MovimentoTipo = 'entrada' | 'saida' | 'ajuste' | 'perda'

export interface MovimentacaoEstoque {
  id: string
  empresa_id: string
  estoque_id: string
  tipo: MovimentoTipo
  quantidade: number
  peso: number
  motivo?: string
  created_at: string
  created_by: string
}

export interface Cliente {
  id: string
  empresa_id: string
  nome: string
  telefone?: string
  whatsapp?: string
  email?: string
  cpf_cnpj?: string
  endereco?: string
  observacoes?: string
  created_at: string
  updated_at: string
  created_by: string
}

export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao' | 'prazo'

export interface Venda {
  id: string
  empresa_id: string
  cliente_id?: string
  tipo: 'peso' | 'quantidade'
  forma_pagamento: FormaPagamento
  valor_total: number
  desconto?: number
  observacoes?: string
  created_at: string
  created_by: string
  cliente?: Cliente
  itens?: VendaItem[]
}

export interface VendaItem {
  id: string
  venda_id: string
  estoque_id: string
  corte_nome: string
  quantidade: number
  peso: number
  preco_unitario: number
  subtotal: number
}

export interface Despesa {
  id: string
  empresa_id: string
  descricao: string
  valor: number
  data: string
  categoria?: string
  observacoes?: string
  created_at: string
  created_by: string
}

export interface Receita {
  id: string
  empresa_id: string
  descricao: string
  valor: number
  data: string
  categoria?: string
  observacoes?: string
  venda_id?: string
  created_at: string
  created_by: string
}

export interface LogAuditoria {
  id: string
  empresa_id: string
  usuario_id: string
  acao: string
  entidade: string
  entidade_id: string
  dados_anteriores?: Record<string, unknown>
  dados_novos?: Record<string, unknown>
  ip?: string
  created_at: string
}

export interface Configuracao {
  id: string
  empresa_id: string
  chave: string
  valor: string
  created_at: string
  updated_at: string
}

export interface Notificacao {
  id: string
  empresa_id: string
  titulo: string
  mensagem: string
  tipo: 'alerta' | 'info' | 'sucesso' | 'erro'
  lida: boolean
  created_at: string
}

export interface RelatorioAnimal {
  animal: Animal
  cortes: Corte[]
  peso_total_produzido: number
  peso_perdido: number
  peso_ossos: number
  peso_gordura: number
  quebra: number
  rendimento: number
  aproveitamento: number
  custo_por_kg: number
  valor_investido: number
  valor_vendido: number
  lucro_bruto: number
  lucro_liquido: number
  margem: number
  rentabilidade: number
}

export interface InsightIA {
  tipo: 'alerta' | 'info' | 'sugestao'
  mensagem: string
  gravidade: 'baixa' | 'media' | 'alta'
  created_at: string
}
