# Plano: Módulo de Faturação Completo

## Análise do Estado Atual

### O que existe:
- **`facturacao_cliente`** (BD): Tabela de milestones de pagamento ligada a `projetos`. Campos: `id`, `projeto_id`, `descricao`, `percentagem_contrato`, `valor`, `estado` (prevista/facturada/paga/em_atraso), `data_prevista`, `data_facturada`, `data_vencimento`, `data_recebimento`, `numero_factura`, `documento_url`, `condicoes_pagamento_dias`.
- **`Faturacao.jsx`** (Página): Página básica que consulta tabela `faturas` (que **não existe** na BD). Tem modal "Nova Fatura" apenas com insert, sem edição, sem anulação, sem ligação a projetos/capítulos reais.
- **`useFinanceiroDashboard.js`** (Hook): Já faz fetch de `facturacao_cliente` e guarda em `facturacaoCliente`.

### O que falta:
- Tabela `facturacao_cliente` não tem campos de IVA (`subtotal`, `iva_percentagem`, `iva_valor`, `total`)
- Estados atuais (`prevista`, `facturada`, `paga`, `em_atraso`) não correspondem ao pedido (`rascunho`, `emitida`, `paga`, `anulada`)
- Sem ligação a `orcamento_capitulos`
- Sem numeração automática de faturas
- Sem campos de anulação (`data_anulacao`, `motivo_anulacao`)
- Página não tem edição, anulação, export CSV, nem ligação a projetos/capítulos reais

---

## Plano de Implementação

### 1. Migration SQL Idempotente
**Ficheiro:** `gavinho-app/supabase/migrations/20250215_faturacao_completa.sql`

Alterações à tabela `facturacao_cliente`:
```sql
-- Novos campos IVA
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2)
ADD COLUMN IF NOT EXISTS iva_percentagem DECIMAL(5,2) DEFAULT 23
ADD COLUMN IF NOT EXISTS iva_valor DECIMAL(12,2)
ADD COLUMN IF NOT EXISTS total DECIMAL(12,2)

-- Ligação a capítulos do orçamento
ADD COLUMN IF NOT EXISTS capitulo_id UUID REFERENCES orcamento_capitulos(id) ON DELETE SET NULL

-- Campos de anulação
ADD COLUMN IF NOT EXISTS data_anulacao DATE
ADD COLUMN IF NOT EXISTS motivo_anulacao TEXT

-- Notas e auditoria
ADD COLUMN IF NOT EXISTS notas TEXT
ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES utilizadores(id) ON DELETE SET NULL

-- Sequência para numeração automática (FAT-YYYY-NNNN)
CREATE SEQUENCE IF NOT EXISTS fatura_cliente_seq START 1;
```

Atualizar CHECK do `estado` para aceitar os novos valores:
- `rascunho`, `emitida`, `paga`, `anulada` (novos)
- Manter compatibilidade com `prevista`, `facturada`, `em_atraso` (existentes, para não quebrar dados)

Criar view `v_faturacao_lista` que junta `facturacao_cliente` com `projetos` e `orcamento_capitulos` para facilitar queries na UI.

---

### 2. Hook `useFaturacao`
**Ficheiro:** `gavinho-app/src/hooks/useFaturacao.js`

Custom hook dedicado ao módulo de faturação:
- `fetchFaturas()` — lista todas as faturas com join a projetos e capítulos
- `createFatura(data)` — criar nova fatura (gera número automático FAT-YYYY-NNNN)
- `updateFatura(id, data)` — editar fatura (só permitido se estado = `rascunho`)
- `emitirFatura(id)` — transição rascunho → emitida (valida campos obrigatórios)
- `marcarPaga(id, dataRecebimento)` — transição emitida → paga
- `anularFatura(id, motivo)` — transição qualquer → anulada (regista motivo + data)
- `totais` — computed: total faturado, pago, pendente, vencido, anulado
- `projetos` — lista de projetos para dropdown no formulário
- `capitulos` — capítulos do orçamento por projeto selecionado

State machine dos estados:
```
rascunho → emitida → paga
    ↓          ↓        ↓
  anulada   anulada   anulada
```

---

### 3. Reescrever `Faturacao.jsx`
**Ficheiro:** `gavinho-app/src/pages/Faturacao.jsx`

Reescrever a página completa com:

**a) Header + KPI Cards:**
- Total Faturado (emitida + paga, s/ anuladas)
- Total Pago
- Total Pendente (emitida, não paga)
- Total Vencido (emitida + data_vencimento < hoje)

**b) Filtros:**
- Pesquisa por número, projeto, descrição
- Filtro por estado (Todos, Rascunho, Emitida, Paga, Anulada)
- Filtro por projeto (dropdown)

**c) Tabela com colunas:**
- N.º Fatura
- Projeto
- Capítulo
- Descrição
- Data Emissão
- Data Vencimento
- Subtotal / IVA / Total
- Estado (badge colorido)
- Ações (editar, emitir, pagar, anular)

**d) Modal Criar/Editar:**
- Seleção de projeto (dropdown de projetos reais da BD)
- Seleção de capítulo do orçamento (dropdown dinâmico com base no projeto)
- Descrição
- Subtotal (valor sem IVA)
- Taxa IVA (0%, 6%, 13%, 23%)
- IVA e Total calculados automaticamente
- Data emissão, data vencimento
- Condições de pagamento (dias)
- Notas
- Se for edição: pré-preenche campos, só editável se `rascunho`

**e) Modal Anular:**
- Campo para motivo de anulação (obrigatório)
- Confirmação antes de anular

**f) Export CSV:**
- Botão que exporta faturas filtradas para CSV
- Colunas: N.º, Projeto, Capítulo, Descrição, Subtotal, IVA%, IVA Valor, Total, Estado, Data Emissão, Data Vencimento

---

### 4. Integração com Financeiro Dashboard
**Ficheiro:** `gavinho-app/src/hooks/useFinanceiroDashboard.js`

Ajuste mínimo: o hook já faz fetch de `facturacao_cliente`. Os novos campos (`subtotal`, `iva_valor`, `total`) ficam disponíveis automaticamente. Nenhuma alteração necessária a menos que os totais precisem usar `total` em vez de `valor`.

---

## Ficheiros a Criar/Modificar

| Ação | Ficheiro |
|------|----------|
| **Criar** | `gavinho-app/supabase/migrations/20250215_faturacao_completa.sql` |
| **Criar** | `gavinho-app/src/hooks/useFaturacao.js` |
| **Reescrever** | `gavinho-app/src/pages/Faturacao.jsx` |

## Ficheiros NÃO alterados
- `App.jsx` — A rota `financeiro/faturacao` já existe e aponta para `Faturacao.jsx`
- `useFinanceiroDashboard.js` — Já faz fetch de `facturacao_cliente`, compatível com novos campos
- Nenhum componente novo separado — tudo dentro de `Faturacao.jsx` (modal inline, seguindo padrão existente)

---

## Notas Técnicas
- CSS: inline styles seguindo padrão existente no codebase (sem CSS Modules para esta página, tal como a atual)
- Ícones: lucide-react
- Datas: formato PT (DD/MM/YYYY) na UI, ISO na BD
- Moeda: `Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })`
- Supabase client: `import { supabase } from '../lib/supabase'`
- Migration idempotente: `ADD COLUMN IF NOT EXISTS`, `CREATE SEQUENCE IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`
