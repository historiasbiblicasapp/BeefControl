-- Fix RLS infinite recursion by using a security definer function

-- Drop all existing policies first
DROP POLICY IF EXISTS empresa_isolation ON empresas;
DROP POLICY IF EXISTS usuario_empresa_isolation ON usuarios;
DROP POLICY IF EXISTS fornecedor_empresa_isolation ON fornecedores;
DROP POLICY IF EXISTS animal_empresa_isolation ON animais;
DROP POLICY IF EXISTS categoria_empresa_isolation ON categorias;
DROP POLICY IF EXISTS corte_empresa_isolation ON cortes;
DROP POLICY IF EXISTS estoque_empresa_isolation ON estoque;
DROP POLICY IF EXISTS mov_estoque_empresa_isolation ON movimentacoes_estoque;
DROP POLICY IF EXISTS cliente_empresa_isolation ON clientes;
DROP POLICY IF EXISTS venda_empresa_isolation ON vendas;
DROP POLICY IF EXISTS itens_venda_empresa_isolation ON itens_venda;
DROP POLICY IF EXISTS despesa_empresa_isolation ON despesas;
DROP POLICY IF EXISTS receita_empresa_isolation ON receitas;
DROP POLICY IF EXISTS log_empresa_isolation ON logs_auditoria;
DROP POLICY IF EXISTS config_empresa_isolation ON configuracoes;
DROP POLICY IF EXISTS notificacao_empresa_isolation ON notificacoes;

-- Função security definer para evitar recursão no RLS
CREATE OR REPLACE FUNCTION public.empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()
$$;

-- Novas políticas sem recursão
CREATE POLICY empresa_isolation ON empresas
  FOR ALL USING (id = public.empresa_id());

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
