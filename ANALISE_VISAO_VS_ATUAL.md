# GAVINHO: Análise Visão Estratégica vs Estado Actual

> Análise realizada em Janeiro 2025

---

## Resumo Executivo

| Categoria | Implementado | Parcial | Por Fazer |
|-----------|--------------|---------|-----------|
| **Onda 1: Libertar Tempo** | 25% | 35% | 40% |
| **Onda 2: Decisões Informadas** | 30% | 30% | 40% |
| **Onda 3: Visibilidade Total** | 40% | 30% | 30% |
| **Onda 4: Manual da Tradição** | 5% | 15% | 80% |
| **Infraestrutura Base** | 85% | 10% | 5% |

**Estado Global: ~35% da visão implementada**

---

## Infraestrutura Existente

### ✅ Totalmente Implementado

| Componente | Descrição | Localização |
|------------|-----------|-------------|
| **Stack Frontend** | React 19 + Vite + React Router | `/gavinho-app/src/` |
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | `/supabase/` |
| **Autenticação** | Login, registo, roles (admin/gp/colaborador) | `AuthContext.jsx` |
| **Base de Dados** | 19 migrações, schema robusto | `/supabase/migrations/` |
| **Gestão de Projectos** | CRUD completo, estados, fases, equipas | `Projetos.jsx`, `ProjetoDetalhe.jsx` |
| **Gestão de Fornecedores** | Base de dados com ratings e especialidades | `Fornecedores.jsx` |
| **Gestão de Clientes** | Tabela clientes com tipos | Schema `clientes` |
| **AI Integration** | Claude API (Sonnet 4 + Haiku) | Edge Functions |

---

## ONDA 1: Libertar Tempo

### 1.1 Assistente de Email

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Emails chegam automaticamente (Outlook) | 🔄 Parcial | `outlook-sync` function existe, webhook configurado |
| IA classifica por projecto | 🔄 Parcial | Classificação por código obra (GA/GB/OBR) existe |
| IA classifica por urgência | ❌ Não existe | Não implementado |
| Sugere respostas baseadas em contexto | ❌ Não existe | Não implementado |
| Interface para editar e enviar | ❌ Não existe | `email-send` existe mas sem UI de composição |

**Componentes Existentes:**
- `obra_emails` - tabela para tracking de emails
- `email_config` - configuração de email
- `outlook-sync` - edge function para sincronização
- `email-webhook` - recepção de emails
- `email-send` - envio via SendGrid

**O que falta:**
- [ ] UI para visualizar emails classificados
- [ ] Sistema de classificação por urgência (Claude)
- [ ] Gerador de sugestões de resposta
- [ ] Interface de composição e envio

---

### 1.2 Registo Automático de Decisões

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Emails com decisões → extraídas automaticamente | ❌ Não existe | |
| Reuniões gravadas → decisões identificadas | ❌ Não existe | |
| Validação humana antes de guardar | ✅ Existe | Sistema de decisões tem workflow |
| Pesquisável: "Quando decidimos o mármore?" | 🔄 Parcial | Existe mas sem pesquisa semântica |

**Componentes Existentes:**
- `project_decisions` - registo de decisões
- `decision_comments` - comentários em decisões
- Workflow: pending → discussion → resolved
- Integração com Diário de Bordo

**O que falta:**
- [ ] Extração automática de decisões de emails (Claude)
- [ ] Transcrição de reuniões
- [ ] Pesquisa em linguagem natural (RAG)
- [ ] Timeline de decisões por categoria

---

### 1.3 Gerador de Relatórios

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Templates pré-definidos | 🔄 Parcial | `obra_relatorios` existe com tipos |
| Dados puxados automaticamente | 🔄 Parcial | Relatórios de obra buscam dados |
| IA preenche texto | ❌ Não existe | |
| Export DOCX/PDF | ❌ Não existe | UI existe mas export não |

**Componentes Existentes:**
- `obra_relatorios` - relatórios semanais/mensais de obra
- `obra_relatorio_fotos` - fotos anexadas
- UI para criar/visualizar relatórios

**O que falta:**
- [ ] Templates editáveis
- [ ] Auto-preenchimento com IA
- [ ] Export PDF (react-pdf ou puppeteer)
- [ ] Export DOCX (docx library)
- [ ] Relatórios de projecto (não só obra)

---

## ONDA 2: Decisões Informadas

### 2.1 Análise de Orçamentos

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Upload de orçamento (PDF) | ❌ Não existe | Storage existe mas não extracção |
| IA extrai linhas, quantidades, preços | ❌ Não existe | |
| Compara com orçamento GAVINHO | ❌ Não existe | |
| Compara com preços de referência | ❌ Não existe | Não há base de preços |
| Compara com orçamentos anteriores | ❌ Não existe | |
| Alerta desvios | ❌ Não existe | |
| Sugere perguntas ao fornecedor | ❌ Não existe | |

**Componentes Existentes:**
- `projeto_custos` - tracking de custos (diferente de orçamentos recebidos)
- Página Orçamentos existe como placeholder

**O que falta:**
- [ ] Tabela `orcamentos_recebidos` (fornecedor, projecto, ficheiro, status)
- [ ] Tabela `orcamento_linhas` (item, quantidade, unidade, preco_unitario, preco_total)
- [ ] Parser de PDF com Claude Vision
- [ ] Base de dados de preços de referência
- [ ] Comparador com visualização de desvios
- [ ] UI de análise com sugestões IA

---

### 2.2 Comparativo Orçamentado vs Real

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Dashboard: orçamentado vs comprometido vs pago | ✅ Existe | `Finance.jsx` implementado |
| Alerta quando categoria ultrapassa X% | 🔄 Parcial | Health indicators existem |
| Projecção de desvio | ❌ Não existe | |
| Sugestões de compensação | ❌ Não existe | |

**Componentes Existentes:**
- `projeto_custos` com estados: comprometido, realizado, faturado
- `v_custos_por_capitulo` - view agregada
- `Finance.jsx` - dashboard financeiro
- Health status: On Track, At Risk, Critical
- Margin tracking

**O que falta:**
- [ ] Projecção baseada em ritmo de gastos
- [ ] Sugestões automáticas de compensação (IA)
- [ ] Alertas configuráveis por email
- [ ] Gráficos de evolução temporal

---

### 2.3 Requisições Inteligentes

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Requisição por voz/app | 🔄 Parcial | WhatsApp existe, voz não |
| Identificar fornecedor preferido | ❌ Não existe | |
| Preço acordado/histórico | ❌ Não existe | |
| Stock disponível | ❌ Não existe | |
| Aprovação e envio automático | ❌ Não existe | |

**Componentes Existentes:**
- `whatsapp_mensagens` - mensagens recebidas
- `ia_sugestoes` - sugestões extraídas por IA (requisições de material)
- `analisar-mensagens` - extrai requisições de WhatsApp

**O que falta:**
- [ ] Workflow de requisição → aprovação → encomenda
- [ ] Tabela `requisicoes` com estados
- [ ] Ligação fornecedor preferido por material
- [ ] Histórico de preços por fornecedor
- [ ] Envio automático de encomenda por email

---

## ONDA 3: Visibilidade Total

### 3.1 Tracking de Tempo em Desenhos

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Registo de tempo por entregável | ❌ Não existe | |
| Sistema aprende duração típica | ❌ Não existe | |
| Previsão automática | ❌ Não existe | |
| Alerta se ritmo baixar | ❌ Não existe | |

**Componentes Existentes:**
- `projeto_entregaveis` - entregáveis com status
- `projeto_equipa` - alocação de equipa

**O que falta:**
- [ ] Tabela `time_entries` (utilizador, entregável, data, horas, descrição)
- [ ] UI de time tracking (timer ou entrada manual)
- [ ] Métricas por tipo de entregável
- [ ] Modelo preditivo de duração
- [ ] Dashboard de produtividade

---

### 3.2 Prioridades Inteligentes

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Conhece prazos e dependências | 🔄 Parcial | Fases têm datas, dependências não |
| Sugere foco diário | ❌ Não existe | |
| Alerta conflitos | ❌ Não existe | |
| Redistribuição de trabalho | ❌ Não existe | |

**Componentes Existentes:**
- `projeto_fases` - fases com datas
- `projeto_entregaveis` - entregáveis com prazos
- Página Planning existe como placeholder

**O que falta:**
- [ ] Sistema de dependências entre tarefas
- [ ] Gerador de prioridades diárias (IA)
- [ ] Detector de conflitos de agenda
- [ ] Visualização tipo Gantt
- [ ] Sugestões de redistribuição

---

### 3.3 Rastreabilidade de Obra

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Registo: o quê, quando, quem, como | ✅ Existe | `obra_diario_projeto`, `obra_acoes` |
| Fotos geolocalizadas | 🔄 Parcial | Fotos existem, geoloc não |
| Materiais com lote/origem | ❌ Não existe | |
| Timeline visual | 🔄 Parcial | Timeline existe mas básica |
| Pesquisa semântica | ❌ Não existe | |

**Componentes Existentes:**
- `obra_fotografias` - fotos com zona, especialidade, tags
- `obra_zonas` - zonas da obra
- `especialidades` - especialidades (Estrutura, AVAC, etc.)
- `obra_diario_projeto` - diário de obra
- `obra_acoes` - acções operacionais
- `obra_timeline` - timeline unificado (WhatsApp + Email + Acções)
- `nao_conformidades` - NCs com workflow
- `ObraDetalhe.jsx` - interface completa

**O que falta:**
- [ ] Geolocalização nas fotos
- [ ] Rastreabilidade de materiais (tabela `materiais_usados`)
- [ ] Ligação material → lote → fornecedor → origem
- [ ] Pesquisa em linguagem natural
- [ ] Visualização timeline avançada (tipo Notion timeline)

---

## ONDA 4: Manual da Tradição

### 4.1 Ingestão de Conhecimento

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Upload de manuais (PDF) → indexados | ❌ Não existe | |
| Gravações de mestres → transcritas | ❌ Não existe | |
| Artigos classificados por tema | ❌ Não existe | |
| Ficha de cada material tradicional | ❌ Não existe | |

**Componentes Existentes:**
- `skills` - conhecimentos especializados (mas para IA, não materiais)
- Supabase Storage para ficheiros
- Claude API para processamento

**O que falta:**
- [ ] Tabela `materiais_tradicionais` (nome, categoria, origem, durabilidade, características)
- [ ] Tabela `tecnicas_execucao` (nome, categoria, descrição, cuidados)
- [ ] Tabela `mestres_artesaos` (nome, especialidade, contacto, entrevistas)
- [ ] Tabela `conhecimento_documentos` (ficheiro, tipo, tags, embeddings)
- [ ] Sistema de embeddings (OpenAI/Voyage) para RAG
- [ ] UI de upload e indexação
- [ ] Transcrição de áudio (Whisper)

---

### 4.2 Consulta Integrada

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Mostra se é tradicional ou moderno | ❌ Não existe | |
| Histórico de uso e resultados | ❌ Não existe | |
| Alternativas tradicionais | ❌ Não existe | |
| Técnica de aplicação recomendada | ❌ Não existe | |
| Pesquisa em linguagem natural | 🔄 Parcial | Chat IA existe mas sem base de tradição |

**Componentes Existentes:**
- `ChatProjetos.jsx` - chat IA por projecto
- `projeto-chat` edge function
- Sistema de skills especializadas

**O que falta:**
- [ ] Knowledge base de materiais e técnicas tradicionais
- [ ] RAG integrado no chat
- [ ] "Skill" de tradição conectada à base de conhecimento
- [ ] Widget de consulta inline ao especificar materiais

---

### 4.3 Passaporte do Edifício

| Funcionalidade | Estado | Notas |
|----------------|--------|-------|
| Documento final ao cliente | ❌ Não existe | |
| Origem de cada material | ❌ Não existe | |
| Técnicas usadas | ❌ Não existe | |
| Artesãos que trabalharam | ❌ Não existe | |
| Instruções de manutenção | ❌ Não existe | |
| Garantia GAVINHO | ❌ Não existe | |

**Componentes Existentes:**
- Nenhum específico

**O que falta:**
- [ ] Gerador de passaporte do edifício
- [ ] Template personalizado GAVINHO
- [ ] Agregação de dados do projecto
- [ ] Export PDF premium
- [ ] QR code para versão digital

---

## Funcionalidades Existentes Não Previstas na Visão

Estas funcionalidades já implementadas são valiosas mas não foram explicitamente mencionadas:

| Funcionalidade | Estado | Valor |
|----------------|--------|-------|
| **Análise de Viabilidade Urbanística** | ✅ Completo | Alto - diferenciador único |
| **Sistema de Design Review** | ✅ Completo | Alto - colaboração em desenhos |
| **Chat IA por Projecto** | ✅ Completo | Alto - assistente contextual |
| **Sistema de Não-Conformidades** | ✅ Completo | Médio - qualidade em obra |
| **Integração WhatsApp** | ✅ Completo | Médio - comunicação de obra |
| **Gestão de Versões de Entregáveis** | ✅ Completo | Médio - controlo documental |

---

## Priorização Recomendada

### Fase 1: Quick Wins (Alto impacto, baixo esforço)

1. **Completar Assistente de Email** - 70% do trabalho já feito
   - Adicionar classificação por urgência
   - UI para ver emails por projecto
   - Sugestão de respostas (já temos Claude)

2. **Export de Relatórios** - Estrutura existe
   - Adicionar export PDF aos relatórios de obra
   - Templates básicos

3. **Alertas Financeiros** - Dashboard existe
   - Adicionar notificações configuráveis
   - Projecção simples

### Fase 2: Completar Ondas 1-2

4. **Análise de Orçamentos**
   - Parser de PDF com Claude Vision
   - Comparador básico

5. **Requisições Inteligentes**
   - Workflow completo
   - Envio automático

6. **Extracção de Decisões**
   - De emails já classificados
   - Validação humana

### Fase 3: Fundação do Manual da Tradição

7. **Schema de Conhecimento**
   - Tabelas de materiais, técnicas, mestres
   - UI de gestão básica

8. **Sistema de RAG**
   - Embeddings para documentos
   - Integração no Chat IA

9. **Passaporte do Edifício v1**
   - Template básico
   - Agregação de dados existentes

---

## Arquitectura Técnica Recomendada para Novas Features

### Para RAG/Knowledge Base:
```
Opção A: Supabase pgvector (recomendado)
- Embedding model: text-embedding-3-small (OpenAI)
- Vector search nativo no PostgreSQL
- Sem dependências externas

Opção B: Pinecone/Weaviate
- Mais escalável
- Custo adicional
- Latência extra
```

### Para Export PDF:
```
- react-pdf/renderer (client-side, simples)
- Puppeteer (server-side, mais controlo)
- Supabase Edge Function com Chrome headless
```

### Para Transcrição de Áudio:
```
- OpenAI Whisper API
- Edge function que recebe áudio, envia para Whisper
- Retorna texto para processamento
```

---

## Conclusão

A plataforma GAVINHO tem uma base técnica sólida (~85% da infraestrutura implementada) e funcionalidades únicas como:
- Análise de Viabilidade com IA
- Sistema de Design Review avançado
- Chat IA contextual por projecto

**O gap principal** está nas funcionalidades de **automação** (email, decisões, relatórios) e no **Manual da Tradição** (conhecimento, materiais, passaporte).

A arquitectura actual suporta bem as extensões necessárias. O Supabase com Edge Functions e Claude API permite implementar todas as funcionalidades da visão sem mudanças estruturais.

**Recomendação**: Focar nas Quick Wins que completam funcionalidades já iniciadas antes de iniciar módulos completamente novos.

---

*Análise gerada em 25 Janeiro 2025*
