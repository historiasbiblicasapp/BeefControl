-- BeefControl - Schema Inicial
-- Sistema de Gestão para Açougues

-- Tabela de Empresas (Tenants)
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  logo TEXT,
  cnpj VARCHAR(20),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Usuários
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cargo VARCHAR(20) NOT NULL CHECK (cargo IN ('admin', 'gerente', 'funcionario')),
  avatar TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Fornecedores
CREATE TABLE fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  whatsapp VARCHAR(20),
  cidade VARCHAR(100),
  cpf_cnpj VARCHAR(20),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Animais
CREATE TABLE animais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE RESTRICT,
  numero_lote VARCHAR(100) NOT NULL,
  data_compra DATE NOT NULL,
  peso_vivo DECIMAL(10,2) NOT NULL,
  peso_carcaca DECIMAL(10,2) NOT NULL,
  arrobas DECIMAL(10,2) NOT NULL,
  preco_pago DECIMAL(10,2) NOT NULL,
  frete DECIMAL(10,2) DEFAULT 0,
  impostos DECIMAL(10,2) DEFAULT 0,
  outras_despesas DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  fotos TEXT[] DEFAULT '{}',
  notas_fiscais TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Categorias de Cortes
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Cortes (Desmanche)
CREATE TABLE cortes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  peso DECIMAL(10,2) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  categoria_id UUID REFERENCES categorias(id),
  preco_sugerido DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Estoque
CREATE TABLE estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animais(id) ON DELETE CASCADE,
  corte_id UUID NOT NULL REFERENCES cortes(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  peso DECIMAL(10,2) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  localizacao VARCHAR(100),
  data_entrada DATE NOT NULL,
  validade DATE,
  lote VARCHAR(100) NOT NULL,
  codigo_interno VARCHAR(100),
  codigo_barras VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Movimentações de Estoque
CREATE TABLE movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  estoque_id UUID NOT NULL REFERENCES estoque(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'perda')),
  quantidade INTEGER NOT NULL,
  peso DECIMAL(10,2) NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  cpf_cnpj VARCHAR(20),
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Vendas
CREATE TABLE vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('peso', 'quantidade')),
  forma_pagamento VARCHAR(20) NOT NULL CHECK (forma_pagamento IN ('pix', 'dinheiro', 'cartao', 'prazo')),
  valor_total DECIMAL(10,2) NOT NULL,
  desconto DECIMAL(10,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Itens de Venda
CREATE TABLE itens_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  estoque_id UUID NOT NULL REFERENCES estoque(id) ON DELETE RESTRICT,
  corte_nome VARCHAR(100) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  peso DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Tabela de Despesas
CREATE TABLE despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  categoria VARCHAR(100),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Receitas
CREATE TABLE receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  categoria VARCHAR(100),
  observacoes TEXT,
  venda_id UUID REFERENCES vendas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabela de Logs de Auditoria
CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  acao VARCHAR(100) NOT NULL,
  entidade VARCHAR(100) NOT NULL,
  entidade_id UUID NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Configurações
CREATE TABLE configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  chave VARCHAR(100) NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, chave)
);

-- Tabela de Notificações
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('alerta', 'info', 'sucesso', 'erro')),
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_fornecedores_empresa ON fornecedores(empresa_id);
CREATE INDEX idx_animais_empresa ON animais(empresa_id);
CREATE INDEX idx_animais_fornecedor ON animais(fornecedor_id);
CREATE INDEX idx_cortes_animal ON cortes(animal_id);
CREATE INDEX idx_cortes_empresa ON cortes(empresa_id);
CREATE INDEX idx_estoque_empresa ON estoque(empresa_id);
CREATE INDEX idx_estoque_animal ON estoque(animal_id);
CREATE INDEX idx_movimentacoes_estoque_empresa ON movimentacoes_estoque(empresa_id);
CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX idx_vendas_empresa ON vendas(empresa_id);
CREATE INDEX idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX idx_itens_venda_venda ON itens_venda(venda_id);
CREATE INDEX idx_despesas_empresa ON despesas(empresa_id);
CREATE INDEX idx_receitas_empresa ON receitas(empresa_id);
CREATE INDEX idx_logs_empresa ON logs_auditoria(empresa_id);
CREATE INDEX idx_notificacoes_empresa ON notificacoes(empresa_id);

-- Function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_animais_updated_at BEFORE UPDATE ON animais FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_estoque_updated_at BEFORE UPDATE ON estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função security definer para evitar recursão no RLS
CREATE OR REPLACE FUNCTION public.empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()
$$;

-- RLS Policies
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE animais ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários veem apenas dados da sua empresa
CREATE POLICY empresa_isolation ON empresas
  FOR ALL USING (id = public.empresa_id());

-- Usuário pode ver seu próprio registro e admins/gerentes veem todos da empresa
CREATE POLICY usuario_self ON usuarios
  FOR SELECT USING (id = auth.uid());
CREATE POLICY usuario_empresa ON usuarios
  FOR SELECT USING (empresa_id = public.empresa_id());
CREATE POLICY usuario_insert ON usuarios
  FOR INSERT WITH CHECK (empresa_id = public.empresa_id());
CREATE POLICY usuario_update ON usuarios
  FOR UPDATE USING (empresa_id = public.empresa_id());
CREATE POLICY usuario_delete ON usuarios
  FOR DELETE USING (empresa_id = public.empresa_id() AND id <> auth.uid());

CREATE POLICY fornecedor_empresa_isolation ON fornecedores
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY animal_empresa_isolation ON animais
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY categoria_empresa_isolation ON categorias
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY corte_empresa_isolation ON cortes
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY estoque_empresa_isolation ON estoque
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY mov_estoque_empresa_isolation ON movimentacoes_estoque
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY cliente_empresa_isolation ON clientes
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY venda_empresa_isolation ON vendas
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY itens_venda_empresa_isolation ON itens_venda
  FOR ALL USING (venda_id IN (
    SELECT id FROM vendas WHERE empresa_id = public.empresa_id()
  ));

CREATE POLICY despesa_empresa_isolation ON despesas
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY receita_empresa_isolation ON receitas
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY log_empresa_isolation ON logs_auditoria
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY config_empresa_isolation ON configuracoes
  FOR ALL USING (empresa_id = public.empresa_id());

CREATE POLICY notificacao_empresa_isolation ON notificacoes
  FOR ALL USING (empresa_id = public.empresa_id());
