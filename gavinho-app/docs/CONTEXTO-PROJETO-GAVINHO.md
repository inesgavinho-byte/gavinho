# CONTEXTO DO PROJETO GAVINHO

**Documento para partilha de contexto entre instâncias Claude**

*Última atualização: 2025-01-24*

---

## 1. Visão Geral

A **Plataforma GAVINHO** é uma aplicação web para gestão integrada de projetos de arquitetura e construção, desenvolvida para a empresa GAVINHO (atelier de arquitetura). A plataforma cobre todo o ciclo de vida de projetos: desde viabilidade urbanística, passando pela gestão de projeto, até ao acompanhamento de obra.

### Contexto de Negócio

- **Empresa**: GAVINHO (Arquitetura e Engenharia)
- **Mercado**: Portugal
- **Idioma da UI**: Português (PT-PT)
- **Utilizadores**: Equipa interna (arquitetos, engenheiros, gestores de projeto)

---

## 2. Stack Tecnológico

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 19.2.0 | Framework UI |
| Vite | 7.2.4 | Build tool |
| React Router DOM | 7.11.0 | Routing |
| lucide-react | 0.561.0 | Iconografia |

### Backend

| Tecnologia | Propósito |
|------------|-----------|
| Supabase | BaaS (PostgreSQL, Auth, Storage, Edge Functions) |
| PostgreSQL | Base de dados |
| Supabase Edge Functions | Serverless (Deno) |

### Bibliotecas Adicionais

| Biblioteca | Propósito |
|------------|-----------|
| @supabase/supabase-js | Cliente Supabase |
| jspdf | Geração de PDFs |
| docx | Geração de documentos Word |
| xlsx | Manipulação de Excel |
| pdfjs-dist, react-pdf | Visualização de PDFs |
| html2canvas | Screenshots/exportação |
| perfect-freehand | Anotações desenhadas à mão |

---

## 3. Estrutura de Pastas

```
gavinho-app/
├── public/                    # Assets estáticos
├── scripts/                   # Scripts de build/deploy
├── src/
│   ├── main.jsx              # Entry point
│   ├── App.jsx               # Router principal
│   ├── contexts/
│   │   └── AuthContext.jsx   # Autenticação React Context
│   ├── lib/
│   │   └── supabase.js       # Cliente Supabase
│   ├── hooks/
│   │   └── viabilidade/      # Hooks específicos do módulo
│   ├── pages/                # Páginas (routes)
│   │   ├── Dashboard.jsx
│   │   ├── Projetos.jsx
│   │   ├── ProjetoDetalhe.jsx
│   │   ├── Obras.jsx
│   │   ├── ObraDetalhe.jsx
│   │   ├── Equipa.jsx
│   │   ├── Finance.jsx
│   │   └── ... (30+ páginas)
│   ├── components/           # Componentes reutilizáveis
│   │   ├── Sidebar.jsx
│   │   ├── Layout.jsx
│   │   ├── ObraFotografias.jsx
│   │   ├── ObraRelatorios.jsx
│   │   ├── ObraNaoConformidades.jsx
│   │   ├── DesignReview.jsx
│   │   ├── ProjetoEntregaveis.jsx
│   │   └── ... (25+ componentes)
│   ├── scripts/              # Seeds e scripts de dados
│   └── utils/                # Utilitários (export PDF, etc.)
├── supabase/
│   ├── migrations/           # Migrations SQL
│   └── functions/            # Edge Functions (Deno)
└── docs/                     # Documentação
```

---

## 4. Módulos Implementados

### 4.1 Gestão de Projetos (Completo)

**Páginas**: `Projetos.jsx`, `ProjetoDetalhe.jsx`

- Lista de projetos com filtros e pesquisa
- Detalhe com tabs:
  - Resumo
  - Entregáveis (ProjetoEntregaveis)
  - Design Review (DesignReview)
  - Archviz (ProjetoArchviz)
  - Documentos (ProjetoDocumentos)
  - Viabilidade (ViabilidadeModule)
  - Diário (DiarioBordo)

### 4.2 Gestão de Obras (Em Desenvolvimento)

**Páginas**: `Obras.jsx`, `ObraDetalhe.jsx`

- Lista de obras com timeline visual
- Detalhe com tabs organizadas em grupos colapsáveis:
  - **Resumo**: Dashboard da obra
  - **Comunicação**: Email, WhatsApp, Chat
  - **Planeamento**: Calendário, Tracking
  - **Acompanhamento**: Fotografias, Relatórios, Não Conformidades
  - **Gestão**: Licenças, Orçamentação, Autos
  - **Projeto**: Diário, Projeto Execução

### 4.3 Viabilidade Urbanística (Completo)

**Componentes**: `ViabilidadeModule.jsx`, `AnaliseDetalhe.jsx`, `ChatViabilidade`

- Análise de viabilidade com IA (Claude API)
- Suporte a concelhos (Sintra implementado)
- Chat conversacional com assistente especializado
- Matrizes de decisão configuráveis

### 4.4 Comunicações Unificadas

**Páginas**: `ObraComunicacoes.jsx`, `ChatObras.jsx`, `ChatProjetos.jsx`

- Integração WhatsApp via Twilio
- Email tracking
- Chat interno colaborativo

### 4.5 Design Review (Completo)

**Componente**: `DesignReview.jsx`

- Visualização de renders e desenhos
- Sistema de anotações (freehand + texto)
- Versionamento de ficheiros
- Workflow de aprovação

### 4.6 Entregáveis (Completo)

**Componente**: `ProjetoEntregaveis.jsx`

- Gestão de entregas por especialidade
- Upload de ficheiros com versionamento
- Estados: pendente → em revisão → aprovado
- Comentários e histórico

---

## 5. Schema da Base de Dados

### Tabelas Core

```sql
-- Utilizadores e Auth
utilizadores (id, nome, email, role, ativo)

-- Projetos
projetos (id, codigo, nome, cliente_id, estado, data_inicio)
projeto_fases (id, projeto_id, nome, data_inicio, data_fim)
projeto_equipa (projeto_id, utilizador_id, funcao)

-- Obras
obras (id, codigo, nome, projeto_id, estado, data_inicio, data_fim_prevista)

-- Clientes
clientes (id, nome, email, telefone, tipo)

-- Fornecedores
fornecedores (id, nome, especialidades, rating)
```

### Tabelas Acompanhamento Obra (Novo)

```sql
-- Zonas da Obra
obra_zonas (id, obra_id, codigo, nome, piso, tipo, area_m2, progresso)

-- Especialidades (partilhada)
especialidades (id, nome, cor, icone, categoria, ordem)

-- Fotografias
obra_fotografias (id, obra_id, url, filename, titulo, descricao, data_fotografia,
                  zona_id, especialidade_id, tags, autor, destaque)

-- Relatórios
obra_relatorios (id, obra_id, codigo, titulo, tipo, data_inicio, data_fim,
                 resumo_executivo, trabalhos_realizados, progresso_global, estado)
obra_relatorio_fotos (relatorio_id, fotografia_id, legenda)

-- Não Conformidades
nao_conformidades (id, obra_id, codigo, titulo, descricao, especialidade_id,
                   zona_id, tipo, gravidade, estado, data_identificacao,
                   data_limite_resolucao, acao_corretiva, acao_preventiva)
nc_fotografias (nc_id, fotografia_id, tipo)
nc_historico (nc_id, acao, estado_anterior, estado_novo)

-- Diário de Projeto da Obra
obra_diario_categorias (id, nome, cor, icone)
obra_diario_tags (id, nome, cor)
obra_diario_projeto (id, obra_id, titulo, descricao, categoria_id, estado)
```

### Tabelas Viabilidade

```sql
concelhos (id, codigo, nome, pdm_versao, activo)
analises_viabilidade (id, codigo, projeto_id, concelho_id, dados_entrada, resultado)
concelho_matrizes (id, concelho_id, tipo, nome, dados)
concelho_prompts (id, concelho_id, codigo, titulo, prompt_sistema)
```

### Tabelas Comunicação

```sql
comunicacoes (id, obra_id, projeto_id, tipo, origem, conteudo, remetente)
whatsapp_config (twilio_account_sid, twilio_auth_token_encrypted)
mensagens_processadas (id, comunicacao_id, resumo_ia, tags_extraidas)
```

### Tabelas Entregáveis/Design Review

```sql
entregas (id, projeto_id, especialidade_id, nome, estado, versao)
entrega_ficheiros (id, entrega_id, url, versao, aprovado)
design_review_sessoes (id, projeto_id, tipo, estado)
design_review_itens (id, sessao_id, ficheiro_url, anotacoes)
```

---

## 6. Edge Functions

| Função | Propósito |
|--------|-----------|
| `analisar-viabilidade` | Análise IA de viabilidade urbanística |
| `viabilidade-chat` | Chat com assistente IA de viabilidade |
| `analisar-mensagens` | Processamento IA de comunicações |
| `analisar-escopo` | Análise de escopo de trabalho |
| `email-send` | Envio de emails (SendGrid) |
| `email-webhook` | Receção de emails |
| `twilio-send` | Envio WhatsApp |
| `twilio-webhook` | Receção WhatsApp |
| `twilio-conversations` | Gestão de conversas |
| `obra-acoes` | Ações automatizadas de obra |
| `outlook-sync` | Sincronização Outlook |
| `processar-mensagens-cron` | Processamento batch de mensagens |

---

## 7. Convenções de Código

### Nomenclatura

- **Ficheiros**: PascalCase para componentes (`ObraDetalhe.jsx`)
- **Variáveis**: camelCase (`obraId`, `isLoading`)
- **Tabelas SQL**: snake_case (`obra_fotografias`)
- **Colunas SQL**: snake_case (`data_identificacao`)

### Estrutura de Componentes

```jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Icon } from 'lucide-react'

export default function NomeComponente({ obraId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [obraId])

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tabela')
      .select('*')
      .eq('obra_id', obraId)

    if (!error) setData(data)
    setLoading(false)
  }

  if (loading) return <div>A carregar...</div>

  return (
    <div style={styles.container}>
      {/* conteúdo */}
    </div>
  )
}

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#FAF9F7',
  }
}
```

### Padrões de Estilo

- **CSS inline** com objetos JavaScript (não usamos CSS modules ou styled-components)
- **Paleta de cores** baseada em tons neutros/terra:
  - Background: `#FAF9F7`, `#F5F3EF`
  - Texto: `#1C1917`, `#78716C`
  - Accent: `#8B5CF6` (roxo), `#3B82F6` (azul)
  - Sucesso: `#10B981`
  - Erro: `#EF4444`
  - Alerta: `#F59E0B`
- **Iconografia**: lucide-react exclusivamente

### Padrões SQL

```sql
-- UUIDs como chave primária
id UUID DEFAULT gen_random_uuid() PRIMARY KEY

-- Timestamps padrão
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- Foreign keys com ON DELETE CASCADE
obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE

-- RLS sempre ativado
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para autenticados
CREATE POLICY "Allow all for authenticated users"
  ON nome_tabela FOR ALL USING (true);

-- Triggers para updated_at
CREATE TRIGGER trigger_nome_updated_at
  BEFORE UPDATE ON nome_tabela
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## 8. Configuração

### Variáveis de Ambiente

**Frontend** (`.env`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
```

**Edge Functions** (Supabase Secrets):
```
ANTHROPIC_API_KEY=sk-ant-...
SENDGRID_API_KEY=SG...
```

### Supabase Config

- **Projeto**: `vctcppuvqjstscbzdykn`
- **Região**: EU (Frankfurt)

---

## 9. Estado de Implementação

### Completo ✅

- [x] Autenticação (login, registo, recuperação password)
- [x] Gestão de Projetos (CRUD, equipa, fases)
- [x] Entregáveis com versionamento
- [x] Design Review com anotações
- [x] Viabilidade Urbanística (Sintra)
- [x] Comunicações (WhatsApp, Email)
- [x] Diário de Bordo
- [x] Decision Log
- [x] Gestão de Equipa
- [x] Fornecedores

### Em Desenvolvimento 🔄

- [x] Acompanhamento Obra - Fotografias (CRUD, filtros, galeria)
- [x] Acompanhamento Obra - Relatórios (CRUD, estados)
- [x] Acompanhamento Obra - Não Conformidades (CRUD, workflow)
- [ ] Diário de Obra vs Diário de Projeto (separação conceptual)
- [ ] Upload de fotografias para Storage
- [ ] Exportação de relatórios para PDF/DOCX

### Planeado 📋

- [ ] Dashboard de métricas de obra
- [ ] Timeline visual de obra
- [ ] Alertas e notificações
- [ ] Mobile app (React Native)
- [ ] Integração com sistemas de contabilidade
- [ ] Concelho de Lisboa (viabilidade)
- [ ] OCR de plantas cadastrais

---

## 10. Fluxos de Trabalho

### Criação de Não Conformidade

```
1. Identificar NC em obra
2. Criar registo (código automático NC-XXX)
3. Classificar: tipo, gravidade, especialidade, zona
4. Definir responsável e prazo
5. Acompanhar resolução
6. Estados: aberta → em_resolução → resolvida → verificada
7. Registar ação corretiva e preventiva
```

### Relatório Semanal de Obra

```
1. Criar relatório (código REL-XXX)
2. Definir período (data início/fim)
3. Preencher secções:
   - Resumo executivo
   - Trabalhos realizados
   - Próxima semana
   - Problemas identificados
4. Anexar fotografias
5. Publicar (muda estado de rascunho para publicado)
```

### Análise de Viabilidade

```
1. Criar análise associada a projeto
2. Selecionar concelho
3. Preencher dados de entrada (localização, solo, regimes, operação)
4. Executar análise IA
5. Revisar resultado (viável/condicionado/inviável)
6. Chat com IA para esclarecimentos
7. Gerar relatório (futuro)
```

---

## 11. Notas para Desenvolvimento

### Boas Práticas

1. **Sempre usar Supabase client** do `lib/supabase.js`
2. **RLS obrigatório** em todas as tabelas novas
3. **Migrations incrementais** com data no nome (YYYYMMDD_descricao.sql)
4. **Estados como enum strings** (não integers)
5. **Textos em PT-PT** na UI
6. **Inline styles** com objetos JavaScript

### Cuidados

1. **Não expor service_role key** no frontend
2. **Validar dados** antes de insert/update
3. **Tratar erros** do Supabase com feedback ao utilizador
4. **Não fazer queries N+1** - usar joins ou views

### Testes Manuais

- Seed de dados de teste disponível em `/admin/seed`
- Scripts de seed em `src/scripts/`

---

## 12. Contactos

- **Repositório**: (interno)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/vctcppuvqjstscbzdykn
- **Documentação adicional**: `docs/LICENCIAMENTOS_MODULE.md`, `docs/SETUP.md`

---

*Este documento deve ser atualizado sempre que houver alterações significativas na arquitetura ou módulos da plataforma.*
