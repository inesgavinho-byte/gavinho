# Gavin Ho Platform - Schema da Base de Dados Supabase

## Sumário Executivo

Este documento descreve a estrutura completa da base de dados PostgreSQL utilizada pela plataforma **Gavin Ho**, uma aplicação de gestão de projetos de arquitetura e construção civil desenvolvida com Supabase.

### O que foi desenvolvido

A plataforma Gavin Ho é um sistema integrado que combina:

1. **Gestão de Projetos de Arquitetura** - Controlo de projetos desde a fase de conceito até execução em obra
2. **Sistema de Comunicações Unificadas** - Integração WhatsApp (Twilio) + Email com timeline centralizada por obra
3. **Processamento de IA** - Análise automática de mensagens para extração de ações, requisições de material, e registo de horas
4. **Central de Entregas** - Gestão de ficheiros de projeto com versionamento e aprovação "Bom para Construção"
5. **Diário de Bordo** - Registo cronológico de todas as atividades e comunicações do projeto
6. **Decision Log** - Sistema de registo e resposta a dúvidas técnicas do projeto
7. **Design Review** - Revisão colaborativa de desenhos técnicos (PDFs) com anotações e desenho livre
8. **Painel Financeiro** - Dashboard financeiro em tempo real com KPIs, alertas, extras e projeções ETC/EAC
9. **Acompanhamento de Projeto** - Visitas de obra, fotografias geolocalizadas, desenhos em uso obra com anotações
10. **Push Notifications** - Notificações push via web-push com auto-subscribe e triggers automáticos
11. **PWA** - Progressive Web App com service worker, push support e install prompt

---

## Arquitetura de Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PROJETOS & OBRAS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  projetos ─────┬──► projeto_entregaveis ──► entrega_ficheiros               │
│       │        │                                                             │
│       │        ├──► projeto_diario ◄──── diario_categorias                  │
│       │        │         ▲                                                   │
│       │        │         └──── projeto_diario_tags ◄──── diario_tags        │
│       │        │                                                             │
│       │        ├──► project_decisions ◄──── decision_comments               │
│       │        │                                                             │
│       │        └──► design_reviews ──► design_review_versions               │
│       │                                    │                                 │
│       ▼                                    ├──► design_review_annotations   │
│    obras ──────┬──► obra_canais ──► obra_canal_participantes               │
│                │                                                             │
│                ├──► obra_timeline                                            │
│                │                                                             │
│                ├──► obra_acoes ──┬──► obra_acoes_historico                  │
│                │                 └──► obra_acoes_comentarios                │
│                │                                                             │
│                ├──► obra_emails                                              │
│                │                                                             │
│                └──► whatsapp_mensagens ◄──── whatsapp_contactos             │
│                            │                                                 │
│                            └──► ia_sugestoes                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tabelas Base

### `projetos` - Projetos de Arquitetura

Tabela central que armazena todos os projetos de arquitetura geridos pela plataforma.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `codigo` | VARCHAR | Código do projeto (ex: GA00402, GA00489) |
| `nome` | VARCHAR | Nome do projeto |
| `tipologia` | VARCHAR | Tipo de projeto (Residencial, Comercial, etc.) |
| `subtipo` | VARCHAR | Subtipo (Edifício, Moradia, etc.) |
| `morada` | VARCHAR | Endereço completo |
| `cidade` | VARCHAR | Cidade |
| `localizacao` | VARCHAR | Localização/Zona |
| `pais` | VARCHAR | País |
| `fase` | VARCHAR | Fase atual (Projeto Base, Execução, Construção) |
| `status` | VARCHAR | Estado (at_risk, in_progress, completed) |
| `progresso` | INTEGER | Percentagem de progresso (0-100) |
| `notas` | TEXT | Notas e observações |
| `data_inicio` | DATE | Data de início |
| `data_prevista` | DATE | Data prevista de conclusão |
| `orcamento_atual` | NUMERIC | Orçamento atual |
| `arquivado` | BOOLEAN | Se o projeto está arquivado |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `utilizadores` - Utilizadores do Sistema

Tabela de perfis de utilizadores com informações profissionais.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `nome` | VARCHAR | Nome completo |
| `cargo` | VARCHAR | Cargo (Arquiteto, Encarregado de Obra, etc.) |
| `departamento` | VARCHAR | Departamento (Projetos, Obras, etc.) |
| `email` | VARCHAR | Email |
| `avatar_url` | VARCHAR | URL da foto de perfil |
| `ativo` | BOOLEAN | Se o utilizador está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `obras` - Obras de Construção

Tabela de obras associadas a projetos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `nome` | VARCHAR | Nome da obra |
| `projeto_id` | UUID | FK → projetos.id |
| `codigo` | VARCHAR | Código da obra (GA00402, GB00402) |
| `codigo_canonico` | VARCHAR | Código canónico interno (OBR-00402) - gerado automaticamente |
| `localizacao` | VARCHAR | Localização da obra |
| `tipo` | VARCHAR | Tipo (Construção Nova, Reabilitação) |
| `status` | VARCHAR | Estado (em_curso, concluida, suspensa) |
| `progresso` | INTEGER | Percentagem de progresso |
| `data_inicio` | DATE | Data de início |
| `data_prevista_conclusao` | DATE | Data prevista de conclusão |
| `encarregado` | VARCHAR | Nome do encarregado |
| `contacto_obra` | VARCHAR | Telefone de contacto |
| `orcamento` | NUMERIC | Orçamento da obra |
| `notas` | TEXT | Notas e observações |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Triggers:**
- `trg_gerar_codigo_canonico` - Gera automaticamente o código canónico (OBR-XXXXX) a partir do código original

---

### `projeto_entregaveis` - Entregáveis do Projeto

Lista de desenhos e documentos a entregar em cada fase do projeto.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `fase` | VARCHAR | Fase (Projeto Base, Projeto de Execução) |
| `categoria` | VARCHAR | Categoria do entregável |
| `codigo` | VARCHAR | Código hierárquico (ex: 01.01.01) |
| `nome` | VARCHAR | Nome/descrição do entregável |
| `escala` | VARCHAR | Escala do desenho (1/100, 1/50, etc.) |
| `data_inicio` | DATE | Data de início |
| `data_conclusao` | DATE | Data de conclusão |
| `status` | VARCHAR | Estado atual |
| `executante` | VARCHAR | Responsável pela execução |

---

## Sistema de Comunicações Unificadas

### `whatsapp_contactos` - Contactos WhatsApp

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `telefone` | VARCHAR(20) | Número de telefone (UNIQUE) |
| `nome` | VARCHAR(255) | Nome do contacto |
| `obra_id` | UUID | FK → obras.id |
| `cargo` | VARCHAR(100) | Cargo (Encarregado, Subempreiteiro, etc.) |
| `ativo` | BOOLEAN | Se está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `whatsapp_mensagens` - Mensagens WhatsApp

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `twilio_sid` | VARCHAR(50) | SID único do Twilio (UNIQUE) |
| `telefone_origem` | VARCHAR(20) | Número de origem |
| `telefone_destino` | VARCHAR(20) | Número de destino |
| `conteudo` | TEXT | Conteúdo da mensagem |
| `tipo` | VARCHAR(20) | Tipo: `recebida` ou `enviada` |
| `contacto_id` | UUID | FK → whatsapp_contactos.id |
| `obra_id` | UUID | FK → obras.id |
| `canal_id` | UUID | FK → obra_canais.id |
| `autor_nome` | VARCHAR(255) | Nome do autor |
| `anexos` | JSONB | Array de {url, tipo, nome} |
| `lida` | BOOLEAN | Se foi lida |
| `processada_ia` | BOOLEAN | Se foi processada pela IA |
| `created_at` | TIMESTAMPTZ | Data de receção/envio |

**Triggers:**
- `trg_whatsapp_to_timeline` - Adiciona automaticamente à timeline da obra

---

### `whatsapp_config` - Configuração Twilio

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `twilio_account_sid` | VARCHAR(50) | Account SID do Twilio |
| `twilio_auth_token_encrypted` | VARCHAR(255) | Auth Token encriptado |
| `twilio_phone_number` | VARCHAR(20) | Número de telefone Twilio |
| `webhook_url` | VARCHAR(255) | URL do webhook |
| `ativo` | BOOLEAN | Se está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `obra_canais` - Canais de Comunicação por Obra

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `obra_id` | UUID | FK → obras.id |
| `nome` | VARCHAR(100) | Nome do canal |
| `descricao` | TEXT | Descrição |
| `tipo` | VARCHAR(50) | Tipo do canal (ver valores abaixo) |
| `twilio_conversation_sid` | VARCHAR(50) | SID da conversa Twilio |
| `twilio_friendly_name` | VARCHAR(255) | Nome amigável no Twilio |
| `ativo` | BOOLEAN | Se está ativo |
| `arquivado` | BOOLEAN | Se está arquivado |
| `cor` | VARCHAR(7) | Cor hex para UI (#3B82F6) |
| `icone` | VARCHAR(50) | Nome do ícone Lucide |
| `ordem` | INTEGER | Ordem de apresentação |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |
| `criado_por` | UUID | Quem criou |

**Tipos de Canal:**
- `coordenacao_geral` - Coordenação Geral
- `estruturas` - Estruturas
- `avac` - AVAC (Ar Condicionado, Ventilação, Aquecimento)
- `carpintarias` - Carpintarias
- `fornecimentos` - Fornecimentos
- `entregas` - Entregas
- `qualidade` - Qualidade
- `seguranca` - Segurança
- `financeiro` - Financeiro
- `outro` - Outro

---

### `obra_canal_participantes` - Participantes dos Canais

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `canal_id` | UUID | FK → obra_canais.id |
| `contacto_id` | UUID | FK → whatsapp_contactos.id |
| `telefone` | VARCHAR(20) | Número de telefone |
| `nome` | VARCHAR(255) | Nome do participante |
| `papel` | VARCHAR(50) | Papel: `admin`, `moderador`, `participante` |
| `notificacoes_ativas` | BOOLEAN | Se notificações estão ativas |
| `adicionado_em` | TIMESTAMPTZ | Data de adição |
| `adicionado_por` | UUID | Quem adicionou |

---

### `email_config` - Configuração de Email

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `email_principal` | VARCHAR(255) | Email principal (ex: obras@empresa.pt) |
| `servidor_smtp` | VARCHAR(255) | Servidor SMTP |
| `porta_smtp` | INTEGER | Porta SMTP (default: 587) |
| `servidor_imap` | VARCHAR(255) | Servidor IMAP |
| `porta_imap` | INTEGER | Porta IMAP (default: 993) |
| `usuario` | VARCHAR(255) | Utilizador |
| `password_encrypted` | TEXT | Password encriptada |
| `usar_tls` | BOOLEAN | Usar TLS |
| `ativo` | BOOLEAN | Se está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `obra_emails` - Emails por Obra

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `message_id` | VARCHAR(255) | Message-ID do email (UNIQUE) |
| `obra_id` | UUID | FK → obras.id |
| `canal_id` | UUID | FK → obra_canais.id |
| `assunto` | VARCHAR(500) | Assunto do email |
| `de_email` | VARCHAR(255) | Email do remetente |
| `de_nome` | VARCHAR(255) | Nome do remetente |
| `para_emails` | JSONB | Array de {email, nome} |
| `cc_emails` | JSONB | Array de {email, nome} |
| `corpo_texto` | TEXT | Corpo em texto plano |
| `corpo_html` | TEXT | Corpo em HTML |
| `anexos` | JSONB | Array de {nome, tipo, tamanho, url_storage} |
| `tipo` | VARCHAR(20) | Tipo: `recebido` ou `enviado` |
| `codigo_obra_detectado` | VARCHAR(20) | Código da obra extraído do assunto |
| `classificacao_automatica` | BOOLEAN | Se foi classificado automaticamente |
| `lido` | BOOLEAN | Se foi lido |
| `arquivado` | BOOLEAN | Se está arquivado |
| `importante` | BOOLEAN | Se está marcado como importante |
| `processado_ia` | BOOLEAN | Se foi processado pela IA |
| `in_reply_to` | VARCHAR(255) | Referência ao email anterior |
| `thread_id` | UUID | ID da thread/conversa |
| `data_envio` | TIMESTAMPTZ | Data de envio |
| `data_recebido` | TIMESTAMPTZ | Data de receção |
| `created_at` | TIMESTAMPTZ | Data de criação |

**Triggers:**
- `trg_classificar_email` - Classifica automaticamente emails com base no código da obra no assunto
- `trg_email_to_timeline` - Adiciona automaticamente à timeline da obra

---

### `obra_timeline` - Timeline Unificada

Agregação de todas as comunicações e eventos de uma obra numa timeline única.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `obra_id` | UUID | FK → obras.id |
| `canal_id` | UUID | FK → obra_canais.id |
| `tipo_item` | VARCHAR(50) | Tipo do item na timeline (ver abaixo) |
| `item_id` | UUID | ID da entidade original |
| `titulo` | VARCHAR(500) | Título para display |
| `resumo` | TEXT | Resumo do conteúdo |
| `autor_nome` | VARCHAR(255) | Nome do autor |
| `autor_contacto` | VARCHAR(255) | Email ou telefone |
| `autor_avatar_url` | VARCHAR(500) | URL do avatar |
| `metadados` | JSONB | Dados adicionais específicos do tipo |
| `anexos_count` | INTEGER | Número de anexos |
| `tem_anexos` | BOOLEAN | Se tem anexos |
| `lido` | BOOLEAN | Se foi lido |
| `importante` | BOOLEAN | Se é importante |
| `arquivado` | BOOLEAN | Se está arquivado |
| `tem_accoes` | BOOLEAN | Se tem ações associadas |
| `accoes_count` | INTEGER | Número de ações |
| `data_evento` | TIMESTAMPTZ | Data do evento |
| `created_at` | TIMESTAMPTZ | Data de criação |

**Tipos de Item:**
- `whatsapp_mensagem` - Mensagem WhatsApp
- `email` - Email
- `acao_tarefa` - Ação/Tarefa
- `acao_incidente` - Incidente
- `acao_confirmacao` - Confirmação
- `acao_evento` - Evento
- `acao_evidencia` - Evidência
- `nota_interna` - Nota interna
- `sistema` - Evento de sistema

---

### `obra_acoes` - Ações Operacionais

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `obra_id` | UUID | FK → obras.id |
| `canal_id` | UUID | FK → obra_canais.id |
| `origem_tipo` | VARCHAR(50) | Origem: `whatsapp`, `email`, `manual`, `ia_sugestao`, `sistema` |
| `origem_mensagem_id` | UUID | ID da mensagem de origem |
| `origem_sugestao_id` | UUID | FK → ia_sugestoes.id |
| `tipo_acao` | VARCHAR(50) | Tipo: `tarefa`, `incidente`, `confirmacao`, `evento`, `evidencia` |
| `titulo` | VARCHAR(500) | Título da ação |
| `descricao` | TEXT | Descrição detalhada |
| `responsavel_id` | UUID | ID do responsável |
| `responsavel_nome` | VARCHAR(255) | Nome do responsável |
| `responsavel_contacto` | VARCHAR(255) | Contacto do responsável |
| `prazo` | TIMESTAMPTZ | Prazo de conclusão |
| `data_conclusao` | TIMESTAMPTZ | Data de conclusão efetiva |
| `estado` | VARCHAR(30) | Estado atual (ver abaixo) |
| `prioridade` | VARCHAR(20) | Prioridade: `baixa`, `media`, `alta`, `urgente` |
| `severidade` | VARCHAR(20) | Severidade (para incidentes): `menor`, `maior`, `critica` |
| `confirmado_por` | UUID | Quem confirmou |
| `confirmado_em` | TIMESTAMPTZ | Data de confirmação |
| `anexos` | JSONB | Array de {nome, tipo, url} |
| `tags` | JSONB | Array de strings |
| `metadados` | JSONB | Dados adicionais |
| `criado_por` | UUID | Quem criou |
| `atualizado_por` | UUID | Quem atualizou |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Estados:**
- `pendente` - Pendente
- `em_progresso` - Em progresso
- `aguarda_validacao` - Aguarda validação
- `concluida` - Concluída
- `cancelada` - Cancelada
- `adiada` - Adiada

**Triggers:**
- `trg_acao_historico` - Regista alterações automaticamente no histórico

---

### `obra_acoes_historico` - Histórico de Ações

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `acao_id` | UUID | FK → obra_acoes.id |
| `campo_alterado` | VARCHAR(100) | Nome do campo alterado |
| `valor_anterior` | TEXT | Valor anterior |
| `valor_novo` | TEXT | Novo valor |
| `alterado_por` | UUID | Quem alterou |
| `alterado_por_nome` | VARCHAR(255) | Nome de quem alterou |
| `motivo` | TEXT | Motivo da alteração |
| `created_at` | TIMESTAMPTZ | Data da alteração |

---

### `obra_acoes_comentarios` - Comentários em Ações

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `acao_id` | UUID | FK → obra_acoes.id |
| `autor_id` | UUID | ID do autor |
| `autor_nome` | VARCHAR(255) | Nome do autor |
| `conteudo` | TEXT | Conteúdo do comentário |
| `anexos` | JSONB | Anexos |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

## Sistema de Inteligência Artificial

### `ia_sugestoes` - Sugestões da IA

Sugestões geradas automaticamente pela IA a partir de mensagens WhatsApp e emails.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `mensagem_id` | UUID | FK → whatsapp_mensagens.id |
| `email_id` | UUID | FK → obra_emails.id |
| `obra_id` | UUID | FK → obras.id |
| `tipo` | VARCHAR(50) | Tipo de sugestão (ver abaixo) |
| `dados` | JSONB | Dados extraídos pela IA |
| `texto_original` | TEXT | Texto que originou a sugestão |
| `confianca` | DECIMAL(3,2) | Nível de confiança (0.00 a 1.00) |
| `status` | VARCHAR(20) | Estado: `pendente`, `aceite`, `rejeitada` |
| `fonte` | VARCHAR(20) | Fonte: `whatsapp`, `email`, `manual` |
| `processado_por` | UUID | ID de quem processou |
| `processado_em` | TIMESTAMPTZ | Data de processamento |
| `entidade_criada_id` | UUID | ID da entidade criada |
| `created_at` | TIMESTAMPTZ | Data de criação |

**Tipos de Sugestão:**
- `requisicao_material` - Requisição de material
- `registo_horas` - Registo de horas
- `trabalho_executado` - Trabalho executado
- `nova_tarefa` - Nova tarefa
- `nao_conformidade` - Não conformidade

---

### `ia_processamento_log` - Log de Processamento

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `tipo` | VARCHAR(50) | Tipo: `cron_automatico`, `manual`, `webhook` |
| `whatsapp_processadas` | INTEGER | Mensagens WhatsApp processadas |
| `whatsapp_sugestoes` | INTEGER | Sugestões criadas de WhatsApp |
| `whatsapp_erros` | INTEGER | Erros de WhatsApp |
| `email_processadas` | INTEGER | Emails processados |
| `email_sugestoes` | INTEGER | Sugestões criadas de email |
| `email_erros` | INTEGER | Erros de email |
| `duracao_ms` | INTEGER | Duração em milissegundos |
| `sucesso` | BOOLEAN | Se foi bem sucedido |
| `erro_mensagem` | TEXT | Mensagem de erro |
| `metadados` | JSONB | Metadados adicionais |
| `created_at` | TIMESTAMPTZ | Data de execução |

---

### `ia_cron_config` - Configuração do CRON

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `ativo` | BOOLEAN | Se está ativo |
| `intervalo_minutos` | INTEGER | Intervalo entre execuções (1-60) |
| `batch_size_whatsapp` | INTEGER | Tamanho do lote WhatsApp |
| `batch_size_email` | INTEGER | Tamanho do lote email |
| `ultima_execucao` | TIMESTAMPTZ | Última execução |
| `proxima_execucao` | TIMESTAMPTZ | Próxima execução |
| `execucoes_consecutivas_falhadas` | INTEGER | Falhas consecutivas |
| `max_retries` | INTEGER | Máximo de tentativas |
| `pausar_apos_falhas` | INTEGER | Pausar após N falhas |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

## Diário de Bordo

### `diario_categorias` - Categorias do Diário

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `nome` | VARCHAR(100) | Nome da categoria |
| `cor` | VARCHAR(20) | Cor hex (#5F5C59) |
| `icone` | VARCHAR(50) | Nome do ícone (FileText) |
| `ordem` | INTEGER | Ordem de apresentação |
| `created_at` | TIMESTAMPTZ | Data de criação |

**Categorias Padrão:**
- Tarefa, Desenhos, 3D/Renders, Cliente, Fornecedor, Email, Reunião, Nota

---

### `diario_tags` - Tags do Diário

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `nome` | VARCHAR(50) | Nome da tag (UNIQUE) |
| `cor` | VARCHAR(20) | Cor hex |
| `created_at` | TIMESTAMPTZ | Data de criação |

**Tags Padrão:**
- Urgente, Aguarda Resposta, Concluído, Em Revisão, Pendente Cliente

---

### `projeto_diario` - Entradas do Diário

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `categoria_id` | UUID | FK → diario_categorias.id |
| `titulo` | VARCHAR(500) | Título da entrada |
| `descricao` | TEXT | Descrição detalhada |
| `tipo` | VARCHAR(50) | Tipo: `manual`, `email`, `auto` |
| `fonte` | VARCHAR(100) | Fonte: `outlook`, `manual`, `sistema` |
| `utilizador_id` | UUID | FK → utilizadores.id |
| `entregavel_id` | UUID | FK → projeto_entregaveis.id |
| `email_de` | VARCHAR(255) | Remetente (se tipo=email) |
| `email_para` | VARCHAR(255) | Destinatário (se tipo=email) |
| `email_assunto` | VARCHAR(500) | Assunto (se tipo=email) |
| `email_message_id` | VARCHAR(255) | ID único do email |
| `anexos` | JSONB | Array de URLs |
| `data_evento` | TIMESTAMPTZ | Data do evento |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |
| `created_by` | UUID | FK → utilizadores.id |

---

### `projeto_diario_tags` - Tags das Entradas (M:N)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `diario_id` | UUID | FK → projeto_diario.id |
| `tag_id` | UUID | FK → diario_tags.id |

---

## Central de Entregas

### `entrega_ficheiros` - Ficheiros de Entrega

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT | Chave primária (FILE-000001) |
| `entregavel_id` | UUID | FK → projeto_entregaveis.id |
| `projeto_id` | UUID | FK → projetos.id |
| `nome_ficheiro` | TEXT | Nome do ficheiro |
| `tipo_ficheiro` | TEXT | Tipo: `pdf`, `jpeg`, `jpg`, `png`, `dwg`, `dwf` |
| `ficheiro_url` | TEXT | URL no Supabase Storage |
| `tamanho_bytes` | BIGINT | Tamanho em bytes |
| `versao` | INTEGER | Número da versão |
| `versao_atual` | BOOLEAN | Se é a versão atual |
| `aprovado_construcao` | BOOLEAN | "Bom para Construção" |
| `aprovado_em` | TIMESTAMPTZ | Data de aprovação |
| `aprovado_por` | UUID | FK → utilizadores.id |
| `aprovado_por_nome` | TEXT | Nome de quem aprovou |
| `carregado_por` | UUID | FK → utilizadores.id |
| `carregado_por_nome` | TEXT | Nome de quem carregou |
| `carregado_em` | TIMESTAMPTZ | Data de upload |
| `notas` | TEXT | Notas |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Triggers:**
- `before_entrega_ficheiro_insert` - Gerencia versionamento automático
- `on_construction_approval` - Regista aprovação no Diário de Bordo
- `on_file_upload` - Regista upload no Diário de Bordo

---

## Decision Log

### `project_decisions` - Dúvidas e Decisões

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT | Chave primária (DEC-00001) |
| `projeto_id` | UUID | FK → projetos.id |
| `entregavel_id` | UUID | FK → projeto_entregaveis.id |
| `titulo` | TEXT | Título da dúvida |
| `descricao` | TEXT | Descrição detalhada |
| `imagem_url` | TEXT | URL de imagem anexa |
| `status` | TEXT | Estado: `pending`, `discussion`, `resolved` |
| `submetido_por` | UUID | FK → utilizadores.id |
| `submetido_por_nome` | TEXT | Nome de quem submeteu |
| `submetido_em` | TIMESTAMPTZ | Data de submissão |
| `resposta` | TEXT | Resposta (deprecated, usar comments) |
| `respondido_por` | UUID | FK → utilizadores.id |
| `respondido_por_nome` | TEXT | Nome de quem respondeu |
| `respondido_em` | TIMESTAMPTZ | Data de resposta |
| `resolucao_final` | TEXT | Resolução final |
| `resolvido_em` | TIMESTAMPTZ | Data de resolução |
| `resolvido_por` | UUID | FK → utilizadores.id |
| `resolvido_por_nome` | TEXT | Nome de quem resolveu |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Triggers:**
- `on_decision_submitted` - Regista submissão no Diário de Bordo
- `on_decision_responded` - Regista resposta no Diário de Bordo

---

### `decision_comments` - Comentários nas Decisões

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `decision_id` | TEXT | FK → project_decisions.id |
| `comentario` | TEXT | Conteúdo do comentário |
| `autor_id` | UUID | FK → utilizadores.id |
| `autor_nome` | TEXT | Nome do autor |
| `criado_em` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Triggers:**
- `trigger_decision_comment_insert` - Muda status para `discussion` quando há novo comentário

---

## Design Review

### `design_reviews` - Revisões de Desenhos

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `entregavel_id` | UUID | FK → projeto_entregaveis.id |
| `nome` | TEXT | Nome da revisão |
| `descricao` | TEXT | Descrição |
| `codigo_documento` | TEXT | Código do documento (01.01.01) |
| `tipo_documento` | TEXT | Tipo: `planta`, `corte`, `alcado`, `detalhe`, `mapa` |
| `status` | TEXT | Estado: `em_revisao`, `alteracoes_pedidas`, `aprovado`, `rejeitado` |
| `versao_atual` | INTEGER | Número da versão atual |
| `criado_por` | UUID | FK → utilizadores.id |
| `criado_por_nome` | TEXT | Nome do criador |
| `criado_em` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `design_review_versions` - Versões dos Documentos

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `review_id` | UUID | FK → design_reviews.id |
| `numero_versao` | INTEGER | Número da versão |
| `file_url` | TEXT | URL do ficheiro |
| `file_name` | TEXT | Nome do ficheiro |
| `file_size` | INTEGER | Tamanho em bytes |
| `num_paginas` | INTEGER | Número de páginas |
| `notas` | TEXT | Notas da versão |
| `uploaded_by` | UUID | FK → utilizadores.id |
| `uploaded_by_nome` | TEXT | Nome de quem carregou |
| `uploaded_em` | TIMESTAMPTZ | Data de upload |

**Triggers:**
- `trigger_new_version` - Atualiza versao_atual na tabela design_reviews

---

### `design_review_annotations` - Anotações nos Desenhos

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `version_id` | UUID | FK → design_review_versions.id |
| `pagina` | INTEGER | Número da página |
| `pos_x` | DECIMAL(5,2) | Posição X (0-100%) |
| `pos_y` | DECIMAL(5,2) | Posição Y (0-100%) |
| `comentario` | TEXT | Conteúdo da anotação |
| `categoria` | TEXT | Categoria (ver abaixo) |
| `prioridade` | TEXT | Prioridade: `baixa`, `normal`, `alta`, `urgente` |
| `status` | TEXT | Estado: `aberto`, `em_discussao`, `resolvido` |
| `resolucao` | TEXT | Resolução |
| `resolvido_por` | UUID | FK → utilizadores.id |
| `resolvido_por_nome` | TEXT | Nome de quem resolveu |
| `resolvido_em` | TIMESTAMPTZ | Data de resolução |
| `autor_id` | UUID | FK → utilizadores.id |
| `autor_nome` | TEXT | Nome do autor |
| `criado_em` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Categorias:**
- `geral` - Comentário geral
- `erro` - Erro identificado
- `duvida` - Dúvida/Questão
- `sugestao` - Sugestão de alteração
- `cota_falta` - Cota em falta
- `material` - Questão sobre material
- `dimensao` - Questão sobre dimensões
- `alinhamento` - Problema de alinhamento

---

### `design_review_replies` - Respostas às Anotações

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `annotation_id` | UUID | FK → design_review_annotations.id |
| `comentario` | TEXT | Conteúdo da resposta |
| `autor_id` | UUID | FK → utilizadores.id |
| `autor_nome` | TEXT | Nome do autor |
| `criado_em` | TIMESTAMPTZ | Data de criação |

**Triggers:**
- `trigger_annotation_reply` - Muda status da anotação para `em_discussao`

---

### `design_review_mentions` - Menções (@utilizador)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `annotation_id` | UUID | FK → design_review_annotations.id |
| `user_id` | UUID | FK → utilizadores.id |
| `user_nome` | TEXT | Nome do utilizador |
| `notificado` | BOOLEAN | Se foi notificado |
| `lido` | BOOLEAN | Se foi lido |
| `criado_em` | TIMESTAMPTZ | Data de criação |

---

### `design_review_decisions` - Decisões de Revisão

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `review_id` | UUID | FK → design_reviews.id |
| `version_id` | UUID | FK → design_review_versions.id |
| `decisao` | TEXT | Decisão: `aprovado`, `alteracoes_pedidas`, `rejeitado` |
| `comentarios` | TEXT | Comentários |
| `decidido_por` | UUID | FK → utilizadores.id |
| `decidido_por_nome` | TEXT | Nome de quem decidiu |
| `decidido_em` | TIMESTAMPTZ | Data da decisão |

**Triggers:**
- `trigger_review_decision` - Atualiza status da revisão

---

### `design_review_drawings` - Desenhos sobre PDFs

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `version_id` | UUID | FK → design_review_versions.id |
| `pagina` | INTEGER | Número da página |
| `tipo` | TEXT | Tipo: `pencil`, `rectangle`, `arrow`, `circle`, `line` |
| `data` | JSONB | Coordenadas do desenho |
| `cor` | TEXT | Cor hex (#EF4444) |
| `espessura` | INTEGER | Espessura do traço |
| `autor_id` | UUID | FK → utilizadores.id |
| `autor_nome` | TEXT | Nome do autor |
| `criado_em` | TIMESTAMPTZ | Data de criação |

**Estrutura do campo `data` por tipo:**
- `pencil`: `{ points: [{x, y}, ...] }`
- `rectangle`: `{ x, y, width, height }`
- `arrow`/`line`: `{ x1, y1, x2, y2 }`
- `circle`: `{ cx, cy, radius }`

---

## Painel Financeiro Tempo Real

### `facturacao_cliente` - Milestones de Facturação

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `descricao` | TEXT | Descrição do milestone |
| `valor` | NUMERIC | Valor a facturar |
| `data_prevista` | DATE | Data prevista de facturação |
| `data_emissao` | DATE | Data de emissão da factura |
| `data_recebimento` | DATE | Data de recebimento |
| `status` | TEXT | Estado: `previsto`, `emitido`, `recebido`, `em_atraso` |
| `numero_factura` | TEXT | Número da factura |
| `notas` | TEXT | Notas |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `extras` - Change Orders

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `codigo` | TEXT | Código (EXT-001, etc.) |
| `descricao` | TEXT | Descrição do extra |
| `valor` | NUMERIC | Valor do extra |
| `status` | TEXT | Estado: `proposto`, `aprovado`, `rejeitado`, `executado` |
| `data_proposta` | DATE | Data da proposta |
| `data_aprovacao` | DATE | Data de aprovação |
| `aprovado_por` | TEXT | Quem aprovou |
| `capitulo_id` | UUID | FK → orcamento_capitulos.id |
| `notas` | TEXT | Notas |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `alertas_financeiros` - Regras de Alertas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `tipo` | TEXT | Tipo de alerta (11 tipos disponíveis) |
| `severidade` | TEXT | `info`, `warning`, `critical`, `danger` |
| `mensagem` | TEXT | Mensagem do alerta |
| `dados` | JSONB | Dados contextuais |
| `resolvido` | BOOLEAN | Se foi resolvido |
| `resolvido_em` | TIMESTAMPTZ | Data de resolução |
| `resolvido_por` | UUID | Quem resolveu |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

### `projecoes_financeiras` - Snapshots ETC/EAC

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `data_snapshot` | DATE | Data do snapshot |
| `etc_valor` | NUMERIC | Estimate to Complete |
| `eac_valor` | NUMERIC | Estimate at Completion |
| `spi` | NUMERIC | Schedule Performance Index |
| `cpi` | NUMERIC | Cost Performance Index |
| `dados` | JSONB | Dados detalhados |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

## Acompanhamento de Projeto

### `projeto_acompanhamento_visitas` - Visitas de Obra

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `data_visita` | DATE | Data da visita |
| `notas` | TEXT | Notas da visita |
| `responsavel_id` | UUID | FK → utilizadores.id |
| `responsavel_nome` | TEXT | Nome do responsável |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `projeto_acompanhamento_fotos` - Fotografias de Acompanhamento

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `visita_id` | UUID | FK → projeto_acompanhamento_visitas.id |
| `projeto_id` | UUID | FK → projetos.id |
| `foto_url` | TEXT | URL da foto no Storage |
| `legenda` | TEXT | Legenda da foto |
| `localizacao` | TEXT | Localização/zona na obra |
| `gps_lat` | NUMERIC | Latitude GPS |
| `gps_lng` | NUMERIC | Longitude GPS |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

### `projeto_desenhos_obra` - Desenhos em Uso na Obra

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `projeto_id` | UUID | FK → projetos.id |
| `nome` | TEXT | Nome do desenho |
| `file_url` | TEXT | URL do ficheiro |
| `versao` | INTEGER | Número da versão |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

---

### `projeto_desenho_anotacoes` - Anotações nos Desenhos de Obra

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `desenho_id` | UUID | FK → projeto_desenhos_obra.id |
| `tipo` | TEXT | Tipo: `pin`, `area`, `linha` |
| `dados` | JSONB | Coordenadas e dados visuais |
| `comentario` | TEXT | Comentário |
| `autor_id` | UUID | FK → utilizadores.id |
| `autor_nome` | TEXT | Nome do autor |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

### `projeto_desenho_pins` - Pins nos Desenhos de Obra

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `desenho_id` | UUID | FK → projeto_desenhos_obra.id |
| `pos_x` | NUMERIC | Posição X (%) |
| `pos_y` | NUMERIC | Posição Y (%) |
| `titulo` | TEXT | Título do pin |
| `descricao` | TEXT | Descrição |
| `cor` | TEXT | Cor hex |
| `autor_id` | UUID | FK → utilizadores.id |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

## Push Notifications

### `chat_push_subscriptions` - Subscrições Push

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | Chave primária |
| `utilizador_id` | UUID | FK → utilizadores.id |
| `endpoint` | TEXT | URL do endpoint push |
| `p256dh` | TEXT | Chave pública p256dh |
| `auth` | TEXT | Chave de autenticação |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** `auth.uid() = utilizador_id`

---

## Views

### `v_obra_timeline_completa`
Timeline completa por obra com dados agregados.

### `v_obra_acoes_pendentes`
Ações pendentes por obra, ordenadas por prioridade e prazo.

### `v_obra_comunicacoes_stats`
Estatísticas de comunicação por obra (totais de WhatsApp, emails, ações).

### `v_ia_processamento_stats`
Estatísticas de processamento de IA das últimas 24 horas.

### `v_ia_mensagens_pendentes`
Contagem de mensagens aguardando processamento de IA.

### `obra_documentos_execucao`
Documentos aprovados para execução na obra.

### `v_financeiro_capitulo`
Agregação por capítulo de orçamento: POs, facturas, percentagem executada.

### `v_financeiro_portfolio`
Vista multi-projeto para administração: orçamento, executado, faturado, margem.

---

## Funções Auxiliares

### Código Canónico
- `gerar_codigo_canonico(codigo)` - Gera OBR-XXXXX a partir de GA/GB codes
- `extrair_codigo_obra_email(assunto)` - Extrai código da obra do assunto do email

### Timeline
- `adicionar_timeline_entry(...)` - Adiciona entrada à timeline unificada
- `criar_acao_de_mensagem(...)` - Cria ação a partir de mensagem

### Canais
- `criar_canais_padrao_obra(obra_id)` - Cria canais padrão para uma nova obra

### IA/CRON
- `ia_deve_processar()` - Verifica se deve executar processamento automático
- `ia_atualizar_estado_cron(sucesso)` - Atualiza estado do CRON

### GPS / Presenças
- `calcular_distancia_gps(lat1, lon1, lat2, lon2)` - Distância em metros (Haversine)
- `trigger_presencas_geofence()` - Auto-calcula distância e geofence em check-in/out

### Push Notifications
- `send_push_notification(user_id, title, body, url, tag)` - Chama edge function `send-push` via `pg_net`
- `trigger_push_on_notificacao()` - Push automático para notificações workspace
- `trigger_push_on_app_notificacao()` - Push automático para notificações app
- `trigger_notificacao_on_chat_mensagem()` - Cria notificação de @mention em mensagens de chat

---

## Segurança (RLS)

Todas as tabelas têm **Row Level Security (RLS)** habilitado com políticas permissivas para utilizadores autenticados.

Exemplo de política aplicada a todas as tabelas:
```sql
CREATE POLICY "Allow all for authenticated users" ON [tabela] FOR ALL USING (true);
```

> **Nota:** As políticas devem ser refinadas em produção para implementar controlo de acesso baseado em roles e permissões específicas.

---

## Edge Functions

As seguintes Edge Functions estão disponíveis em `supabase/functions/` (30 total):

| Função | Descrição |
|--------|-----------|
| `agent-execute` | Execução de agentes IA |
| `agent-router` | Routing de agentes IA |
| `analisar-escopo` | Análise de escopo de trabalho |
| `analisar-mensagens` | Analisa mensagens com IA |
| `analisar-viabilidade` | Análise de viabilidade urbanística |
| `decisoes-detectar` | Deteção automática de decisões |
| `decisoes-embedding` | Embeddings para decisões (OpenAI) |
| `decisoes-search` | Pesquisa semântica de decisões |
| `email-classify` | Classificação automática de emails |
| `email-processar` | Processamento de emails |
| `email-send` | Envia emails |
| `email-suggest-reply` | Sugestões de resposta IA |
| `email-webhook` | Webhook para receção de emails |
| `garvis-chat` | GARVIS assistente IA |
| `graph-webhook` | Microsoft Graph webhook |
| `notification-digest` | Digest de notificações por email |
| `notification-email` | Notificações por email |
| `obra-acoes` | Gestão de ações operacionais |
| `outlook-sync` | Sincronização com Outlook |
| `processar-mensagens-cron` | Processamento automático de mensagens |
| `projeto-chat` | Chat de projeto |
| `renew-subscription` | Renovação de subscrições |
| `send-push` | **NOVO** — Push notifications via web-push |
| `telegram-webhook` | Webhook para Telegram |
| `twilio-conversations` | Gestão de conversas Twilio |
| `twilio-send` | Envio de mensagens WhatsApp |
| `twilio-webhook` | Webhook para receção de WhatsApp |
| `viabilidade-chat` | Chat IA para viabilidade |

---

## Localização dos Ficheiros

Todos os ficheiros de migração SQL estão em:
```
/gavinho-app/supabase/migrations/
```

| Ficheiro | Descrição |
|----------|-----------|
| `20250118_whatsapp_tables.sql` | Tabelas WhatsApp + IA básico |
| `20250118_comunicacoes_unificadas.sql` | Sistema de comunicações, canais, timeline, ações |
| `20250119_diario_bordo.sql` | Diário de Bordo |
| `20250119_ia_processamento_automatico.sql` | Configuração e logs de IA |
| `20250120_decision_log.sql` | Decision Log |
| `20250120_decision_comments.sql` | Comentários no Decision Log |
| `20250120_delivery_files.sql` | Central de Entregas |
| `20250121_design_review.sql` | Design Review |
| `20250121_design_review_drawings.sql` | Desenhos no Design Review |
| `20250130_chat_teams_completo.sql` | Sistema de chat Teams-style |
| `20250201_all_missing_tables.sql` | Tabelas em falta (dúvidas, comentários) |
| `20250202_garvis_chat.sql` | GARVIS AI sistema |
| `20250206_app_notificacoes.sql` | Notificações da app |
| `20250207_notificacoes_consolidadas.sql` | Notificações consolidadas |
| `20250210_presencas_gps_tracking.sql` | Presenças com GPS tracking |
| `20250211_fiscalizacao_equipas_tables.sql` | HSO, ocorrências, subempreiteiros |
| `20250211_fix_projetos_status_constraint.sql` | Fix constraint status projetos |
| `20250212_push_notification_triggers.sql` | Triggers push notifications |
| `20250212_chat_mensagens_notification_trigger.sql` | Chat @mention → notificação trigger |
| `20250213_fix_seeds_executados.sql` | Fix seeds_executados: tabela + coluna compat |
| `20250213_painel_financeiro.sql` | Painel Financeiro: 4 tabelas + 2 views + triggers |
| `20250213_acompanhamento_projeto.sql` | Acompanhamento: 5 tabelas + RLS + triggers |
| `20250213_fix_push_subscriptions_rls.sql` | RLS fix para push subscriptions |
| `20250213_fix_projeto_renders_columns.sql` | Fix colunas renders |

**Total: 86 ficheiros de migração SQL**

---

*Última atualização: 2026-02-14*
