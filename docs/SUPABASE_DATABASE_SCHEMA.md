# Gavinho - Schema da Base de Dados Supabase

> **Documentacao criada para manter conhecimento entre sessoes/branches**
>
> Ultima atualizacao: Fevereiro 2026

---

## Indice

1. [Visao Geral](#visao-geral)
2. [Tabelas de Integracao WhatsApp](#tabelas-de-integracao-whatsapp)
3. [Tabelas de Processamento IA](#tabelas-de-processamento-ia)
4. [Sistema de Comunicacoes Unificadas](#sistema-de-comunicacoes-unificadas)
5. [Sistema de Acoes Operacionais](#sistema-de-acoes-operacionais)
6. [Gestao de Projetos](#gestao-de-projetos)
7. [Orcamentos e Propostas](#orcamentos-e-propostas)
8. [Equipa e Organizacao](#equipa-e-organizacao)
9. [Clientes e Fornecedores](#clientes-e-fornecedores)
10. [Financeiro](#financeiro)
11. [Documentacao e Biblioteca](#documentacao-e-biblioteca)
12. [Chat Interno](#chat-interno)
13. [Entregaveis de Projeto](#entregaveis-de-projeto)
14. [Calendario e Eventos](#calendario-e-eventos)
15. [Views da Base de Dados](#views-da-base-de-dados)
16. [Funcoes e Triggers](#funcoes-e-triggers)
17. [Diagrama de Relacoes](#diagrama-de-relacoes)

---

## Visao Geral

A plataforma Gavinho utiliza Supabase como backend. O schema inclui **74+ tabelas** que abrangem:
- Gestao de projetos de construcao
- Comunicacoes unificadas (WhatsApp + Email)
- Processamento automatico com IA
- Orcamentos e propostas
- Gestao de equipas
- Documentacao e biblioteca de materiais

---

## Tabelas de Integracao WhatsApp

### `whatsapp_contactos`

**Proposito:** Armazenar contactos WhatsApp associados a obras

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `telefone` | VARCHAR(20) | Numero de telefone (UNIQUE) |
| `nome` | VARCHAR(255) | Nome do contacto |
| `obra_id` | UUID | FK para tabela obras (pode ser NULL) |
| `cargo` | VARCHAR(100) | Cargo (ex: "Encarregado", "Subempreiteiro") |
| `ativo` | BOOLEAN | Estado ativo (default: true) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

**Indices:** `telefone`, `obra_id`

---

### `whatsapp_mensagens`

**Proposito:** Armazenar mensagens WhatsApp enviadas e recebidas via Twilio

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `twilio_sid` | VARCHAR(50) | ID unico da mensagem Twilio (UNIQUE) |
| `telefone_origem` | VARCHAR(20) | Telefone do remetente |
| `telefone_destino` | VARCHAR(20) | Telefone do destinatario |
| `conteudo` | TEXT | Conteudo da mensagem |
| `tipo` | VARCHAR(20) | CHECK: 'recebida' \| 'enviada' |
| `contacto_id` | UUID | FK para whatsapp_contactos |
| `obra_id` | UUID | FK para obras |
| `canal_id` | UUID | FK para obra_canais |
| `autor_nome` | VARCHAR(255) | Nome do remetente |
| `anexos` | JSONB | Array de {url, tipo, nome} |
| `lida` | BOOLEAN | Mensagem lida (default: false) |
| `processada_ia` | BOOLEAN | Processada pela IA (default: false) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

**Indices:** `obra_id`, `contacto_id`, `created_at DESC`, `processada_ia (WHERE false)`

---

### `whatsapp_config`

**Proposito:** Configuracao da integracao Twilio WhatsApp

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `twilio_account_sid` | VARCHAR(50) | Account SID do Twilio |
| `twilio_auth_token_encrypted` | VARCHAR(255) | Auth token encriptado |
| `twilio_phone_number` | VARCHAR(20) | Numero de telefone Twilio |
| `webhook_url` | VARCHAR(255) | URL do webhook |
| `ativo` | BOOLEAN | Integracao ativa (default: false) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

---

## Tabelas de Processamento IA

### `ia_sugestoes`

**Proposito:** Armazenar sugestoes geradas pela IA a partir de mensagens

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `mensagem_id` | UUID | FK para whatsapp_mensagens (CASCADE) |
| `email_id` | UUID | FK para obra_emails (CASCADE) |
| `obra_id` | UUID | FK para obras (CASCADE) |
| `tipo` | VARCHAR(50) | CHECK: 'requisicao_material' \| 'registo_horas' \| 'trabalho_executado' \| 'nova_tarefa' \| 'nao_conformidade' |
| `fonte` | VARCHAR(20) | CHECK: 'whatsapp' \| 'email' \| 'manual' (default: 'whatsapp') |
| `dados` | JSONB | Dados extraidos pela IA (NOT NULL) |
| `texto_original` | TEXT | Texto original da mensagem |
| `confianca` | DECIMAL(3,2) | Nivel de confianca (0.00-1.00) |
| `status` | VARCHAR(20) | CHECK: 'pendente' \| 'aceite' \| 'rejeitada' (default: 'pendente') |
| `processado_por` | UUID | Utilizador que processou |
| `processado_em` | TIMESTAMP WITH TIME ZONE | Data de processamento |
| `entidade_criada_id` | UUID | ID da entidade criada (requisicao, tarefa, etc.) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

**Indices:** `obra_id`, `status (WHERE 'pendente')`, `tipo`, `email_id`, `fonte`

---

### `ia_processamento_log`

**Proposito:** Log de execucoes de processamento IA para monitorizacao

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `tipo` | VARCHAR(50) | CHECK: 'cron_automatico' \| 'manual' \| 'webhook' |
| `whatsapp_processadas` | INTEGER | Mensagens WhatsApp processadas (default: 0) |
| `whatsapp_sugestoes` | INTEGER | Sugestoes criadas de WhatsApp (default: 0) |
| `whatsapp_erros` | INTEGER | Erros em WhatsApp (default: 0) |
| `email_processadas` | INTEGER | Emails processados (default: 0) |
| `email_sugestoes` | INTEGER | Sugestoes criadas de email (default: 0) |
| `email_erros` | INTEGER | Erros em email (default: 0) |
| `duracao_ms` | INTEGER | Duracao em milissegundos |
| `sucesso` | BOOLEAN | Execucao bem sucedida (default: true) |
| `erro_mensagem` | TEXT | Mensagem de erro |
| `metadados` | JSONB | Metadados adicionais |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

**Indices:** `created_at DESC`, `sucesso`, `tipo`

---

### `ia_cron_config`

**Proposito:** Configuracao do agendador automatico de processamento IA

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `ativo` | BOOLEAN | Cron ativo (default: true) |
| `intervalo_minutos` | INTEGER | Intervalo entre execucoes (default: 5, CHECK: 1-60) |
| `batch_size_whatsapp` | INTEGER | Tamanho do lote WhatsApp (default: 20) |
| `batch_size_email` | INTEGER | Tamanho do lote email (default: 10) |
| `ultima_execucao` | TIMESTAMP WITH TIME ZONE | Ultima execucao |
| `proxima_execucao` | TIMESTAMP WITH TIME ZONE | Proxima execucao |
| `execucoes_consecutivas_falhadas` | INTEGER | Execucoes falhadas consecutivas (default: 0) |
| `max_retries` | INTEGER | Maximo de retentativas (default: 3) |
| `pausar_apos_falhas` | INTEGER | Pausar apos N falhas (default: 5) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

---

## Sistema de Comunicacoes Unificadas

### `obra_canais`

**Proposito:** Canais de comunicacao para cada obra

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `obra_id` | UUID | FK para obras (CASCADE, NOT NULL) |
| `nome` | VARCHAR(100) | Nome do canal (NOT NULL) |
| `descricao` | TEXT | Descricao do canal |
| `tipo` | VARCHAR(50) | CHECK: 'coordenacao_geral' \| 'estruturas' \| 'avac' \| 'carpintarias' \| 'fornecimentos' \| 'entregas' \| 'qualidade' \| 'seguranca' \| 'financeiro' \| 'outro' |
| `twilio_conversation_sid` | VARCHAR(50) | SID da conversa Twilio |
| `twilio_friendly_name` | VARCHAR(255) | Nome amigavel no Twilio |
| `ativo` | BOOLEAN | Canal ativo (default: true) |
| `arquivado` | BOOLEAN | Canal arquivado (default: false) |
| `cor` | VARCHAR(7) | Cor em hex (default: '#3B82F6') |
| `icone` | VARCHAR(50) | Nome do icone Lucide |
| `ordem` | INTEGER | Ordem de exibicao (default: 0) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |
| `criado_por` | UUID | Utilizador que criou |

**Constraint:** UNIQUE(obra_id, nome)

**Indices:** `obra_id`, `tipo`, `ativo (WHERE true)`

---

### `obra_canal_participantes`

**Proposito:** Participantes nos canais de comunicacao

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `canal_id` | UUID | FK para obra_canais (CASCADE, NOT NULL) |
| `contacto_id` | UUID | FK para whatsapp_contactos |
| `telefone` | VARCHAR(20) | Telefone do participante |
| `nome` | VARCHAR(255) | Nome do participante |
| `papel` | VARCHAR(50) | CHECK: 'admin' \| 'moderador' \| 'participante' (default: 'participante') |
| `notificacoes_ativas` | BOOLEAN | Notificacoes ativas (default: true) |
| `adicionado_em` | TIMESTAMP WITH TIME ZONE | Data de adicao (default: NOW()) |
| `adicionado_por` | UUID | Utilizador que adicionou |

**Constraint:** UNIQUE(canal_id, telefone)

**Indices:** `canal_id`, `contacto_id`

---

### `email_config`

**Proposito:** Configuracao do servidor de email

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `email_principal` | VARCHAR(255) | Email principal (NOT NULL) |
| `servidor_smtp` | VARCHAR(255) | Servidor SMTP |
| `porta_smtp` | INTEGER | Porta SMTP (default: 587) |
| `servidor_imap` | VARCHAR(255) | Servidor IMAP |
| `porta_imap` | INTEGER | Porta IMAP (default: 993) |
| `usuario` | VARCHAR(255) | Nome de utilizador |
| `password_encrypted` | TEXT | Password encriptada |
| `usar_tls` | BOOLEAN | Usar TLS (default: true) |
| `ativo` | BOOLEAN | Configuracao ativa (default: true) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

---

### `obra_emails`

**Proposito:** Armazenar emails recebidos e enviados associados a obras

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `message_id` | VARCHAR(255) | ID unico da mensagem (UNIQUE) |
| `obra_id` | UUID | FK para obras |
| `canal_id` | UUID | FK para obra_canais |
| `assunto` | VARCHAR(500) | Assunto do email (NOT NULL) |
| `de_email` | VARCHAR(255) | Email do remetente (NOT NULL) |
| `de_nome` | VARCHAR(255) | Nome do remetente |
| `para_emails` | JSONB | Array de {email, nome} (NOT NULL) |
| `cc_emails` | JSONB | Array de {email, nome} |
| `corpo_texto` | TEXT | Corpo em texto plano |
| `corpo_html` | TEXT | Corpo em HTML |
| `anexos` | JSONB | Array de {nome, tipo, tamanho, url_storage} |
| `tipo` | VARCHAR(20) | CHECK: 'recebido' \| 'enviado' |
| `codigo_obra_detectado` | VARCHAR(20) | Codigo da obra detetado automaticamente |
| `classificacao_automatica` | BOOLEAN | Classificado automaticamente (default: false) |
| `lido` | BOOLEAN | Email lido (default: false) |
| `arquivado` | BOOLEAN | Email arquivado (default: false) |
| `importante` | BOOLEAN | Marcado como importante (default: false) |
| `processado_ia` | BOOLEAN | Processado pela IA (default: false) |
| `in_reply_to` | VARCHAR(255) | Referencia ao email anterior |
| `thread_id` | UUID | ID do thread de conversa |
| `data_envio` | TIMESTAMP WITH TIME ZONE | Data de envio |
| `data_recebido` | TIMESTAMP WITH TIME ZONE | Data de rececao (default: NOW()) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

**Indices:** `obra_id`, `canal_id`, `thread_id`, `data_envio DESC`, `tipo`, `lido (WHERE false)`, `codigo_obra_detectado`

---

### `obra_timeline`

**Proposito:** Timeline unificada de todas as comunicacoes e acoes

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `obra_id` | UUID | FK para obras (CASCADE, NOT NULL) |
| `canal_id` | UUID | FK para obra_canais |
| `tipo_item` | VARCHAR(50) | CHECK: 'whatsapp_mensagem' \| 'email' \| 'acao_tarefa' \| 'acao_incidente' \| 'acao_confirmacao' \| 'acao_evento' \| 'acao_evidencia' \| 'nota_interna' \| 'sistema' |
| `item_id` | UUID | ID da entidade original |
| `titulo` | VARCHAR(500) | Titulo do item |
| `resumo` | TEXT | Resumo do conteudo |
| `autor_nome` | VARCHAR(255) | Nome do autor |
| `autor_contacto` | VARCHAR(255) | Email ou telefone do autor |
| `autor_avatar_url` | VARCHAR(500) | URL do avatar |
| `metadados` | JSONB | Metadados adicionais |
| `anexos_count` | INTEGER | Numero de anexos (default: 0) |
| `tem_anexos` | BOOLEAN | Tem anexos (default: false) |
| `lido` | BOOLEAN | Item lido (default: false) |
| `importante` | BOOLEAN | Marcado como importante (default: false) |
| `arquivado` | BOOLEAN | Arquivado (default: false) |
| `tem_accoes` | BOOLEAN | Tem acoes associadas (default: false) |
| `accoes_count` | INTEGER | Numero de acoes (default: 0) |
| `data_evento` | TIMESTAMP WITH TIME ZONE | Data do evento (default: NOW()) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

**Indices:** `obra_id`, `canal_id`, `tipo_item`, `data_evento DESC`, `(tipo_item, item_id)`, `(obra_id, lido WHERE false)`

---

## Sistema de Acoes Operacionais

### `obra_acoes`

**Proposito:** Acoes operacionais criadas a partir de comunicacoes (tarefas, incidentes, confirmacoes, eventos, evidencias)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `obra_id` | UUID | FK para obras (CASCADE, NOT NULL) |
| `canal_id` | UUID | FK para obra_canais |
| `origem_tipo` | VARCHAR(50) | CHECK: 'whatsapp' \| 'email' \| 'manual' \| 'ia_sugestao' \| 'sistema' |
| `origem_mensagem_id` | UUID | ID da mensagem de origem |
| `origem_sugestao_id` | UUID | FK para ia_sugestoes |
| `tipo_acao` | VARCHAR(50) | CHECK: 'tarefa' \| 'incidente' \| 'confirmacao' \| 'evento' \| 'evidencia' |
| `titulo` | VARCHAR(500) | Titulo da acao (NOT NULL) |
| `descricao` | TEXT | Descricao detalhada |
| `responsavel_id` | UUID | ID do responsavel |
| `responsavel_nome` | VARCHAR(255) | Nome do responsavel |
| `responsavel_contacto` | VARCHAR(255) | Contacto do responsavel |
| `prazo` | TIMESTAMP WITH TIME ZONE | Data limite |
| `data_conclusao` | TIMESTAMP WITH TIME ZONE | Data de conclusao |
| `estado` | VARCHAR(30) | CHECK: 'pendente' \| 'em_progresso' \| 'aguarda_validacao' \| 'concluida' \| 'cancelada' \| 'adiada' |
| `prioridade` | VARCHAR(20) | CHECK: 'baixa' \| 'media' \| 'alta' \| 'urgente' (default: 'media') |
| `severidade` | VARCHAR(20) | CHECK: 'menor' \| 'maior' \| 'critica' |
| `confirmado_por` | UUID | Utilizador que confirmou |
| `confirmado_em` | TIMESTAMP WITH TIME ZONE | Data de confirmacao |
| `anexos` | JSONB | Array de anexos |
| `tags` | JSONB | Array de tags |
| `metadados` | JSONB | Metadados adicionais |
| `criado_por` | UUID | Utilizador que criou |
| `atualizado_por` | UUID | Utilizador que atualizou |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

**Indices:** `obra_id`, `canal_id`, `tipo_acao`, `estado`, `responsavel_id`, `prazo (WHERE NOT IN 'concluida', 'cancelada')`, `prioridade`

---

### `obra_acoes_historico`

**Proposito:** Trilho de auditoria para alteracoes em acoes

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `acao_id` | UUID | FK para obra_acoes (CASCADE, NOT NULL) |
| `campo_alterado` | VARCHAR(100) | Nome do campo alterado (NOT NULL) |
| `valor_anterior` | TEXT | Valor anterior |
| `valor_novo` | TEXT | Valor novo |
| `alterado_por` | UUID | Utilizador que alterou |
| `alterado_por_nome` | VARCHAR(255) | Nome do utilizador |
| `motivo` | TEXT | Motivo da alteracao |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

**Indices:** `acao_id`

---

### `obra_acoes_comentarios`

**Proposito:** Comentarios em acoes operacionais

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `acao_id` | UUID | FK para obra_acoes (CASCADE, NOT NULL) |
| `autor_id` | UUID | ID do autor |
| `autor_nome` | VARCHAR(255) | Nome do autor (NOT NULL) |
| `conteudo` | TEXT | Conteudo do comentario (NOT NULL) |
| `anexos` | JSONB | Array de anexos |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

**Indices:** `acao_id`

---

## Gestao de Projetos

### `projetos`

**Proposito:** Projetos principais (codigos GA/GB)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `codigo` | VARCHAR | Codigo do projeto (ex: GA0001) |
| `nome` | VARCHAR | Nome do projeto |
| `tipologia` | VARCHAR | Tipologia do projeto |
| `subtipo` | VARCHAR | Subtipo |
| `morada` | TEXT | Morada |
| `cidade` | VARCHAR | Cidade |
| `localizacao` | VARCHAR | Localizacao |
| `pais` | VARCHAR | Pais |
| `fase` | VARCHAR | Fase atual |
| `status` | VARCHAR | Estado do projeto |
| `progresso` | INTEGER | Progresso percentual |
| `orcamento_atual` | DECIMAL | Orcamento atual |
| `data_inicio` | DATE | Data de inicio |
| `data_prevista` | DATE | Data prevista de conclusao |
| `notas` | TEXT | Notas adicionais |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

---

### `obras`

**Proposito:** Obras/estaleiros de construcao

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `codigo` | VARCHAR | Codigo (referencia projetos) |
| `nome` | VARCHAR | Nome da obra |
| `projeto_id` | UUID | FK para projetos |
| `tipo` | VARCHAR | Tipo de obra |
| `status` | VARCHAR | Estado da obra |
| `progresso` | INTEGER | Progresso percentual |
| `localizacao` | VARCHAR | Localizacao |
| `encarregado` | VARCHAR | Nome do encarregado |
| `contacto_obra` | VARCHAR | Contacto da obra |
| `data_inicio` | DATE | Data de inicio |
| `data_prevista_conclusao` | DATE | Data prevista de conclusao |
| `orcamento` | DECIMAL | Orcamento |
| `notas` | TEXT | Notas |
| `codigo_canonico` | VARCHAR | Codigo canonico (OBR-XXXXX) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

---

### `tarefas`

**Proposito:** Gestao de tarefas

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `titulo` | VARCHAR | Titulo da tarefa |
| `descricao` | TEXT | Descricao |
| `projeto_id` | UUID | FK para projetos |
| `responsavel_id` | UUID | FK para utilizadores |
| `responsavel_nome` | VARCHAR | Nome do responsavel |
| `status` | VARCHAR | Estado da tarefa |
| `prioridade` | VARCHAR | Prioridade |
| `data_limite` | DATE | Data limite |
| `data_conclusao` | DATE | Data de conclusao |
| `notas` | TEXT | Notas |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Data de atualizacao |

---

### Outras Tabelas de Obra

| Tabela | Descricao |
|--------|-----------|
| `obra_diario` | Registos diarios de obra |
| `obra_autos` | Autos de medicao |
| `obra_auto_items` | Itens dos autos de medicao |
| `obra_licencas` | Licencas e alvaras |
| `obra_ocorrencias` | Incidentes/ocorrencias |
| `obra_especialidades` | Especialidades da obra (estruturas, AVAC, etc.) |
| `obra_zonas` | Zonas/areas da obra |
| `obra_items` | Itens/tarefas da obra |
| `obra_componentes` | Componentes do edificio |

---

## Orcamentos e Propostas

### `obra_propostas`

**Proposito:** Propostas de orcamento

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `obra_id` | UUID | FK para obras |
| `codigo` | VARCHAR | Codigo da proposta |
| `nome` | VARCHAR | Nome da proposta |
| `status` | VARCHAR | Estado da proposta |
| `valor_total` | DECIMAL | Valor total |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

---

### `obra_orcamento_items`

**Proposito:** Itens de orcamento

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `proposta_id` | UUID | FK para obra_propostas |
| `obra_id` | UUID | FK para obras |
| `ref` | VARCHAR | Referencia do item |
| `area` | VARCHAR | Area/capitulo |
| `descricao` | TEXT | Descricao do item |
| `unidade` | VARCHAR | Unidade de medida |
| `quantidade` | DECIMAL | Quantidade |
| `preco_venda_unit` | DECIMAL | Preco unitario de venda |
| `estado_compra` | VARCHAR | Estado de compra |
| `fornecedor` | VARCHAR | Fornecedor selecionado |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

---

### Outras Tabelas de Orcamento

| Tabela | Descricao |
|--------|-----------|
| `orcamentos` | Orcamentos gerais |
| `orcamento_capitulos` | Capitulos de orcamento |
| `orcamento_itens` | Itens de orcamento |

---

## Equipa e Organizacao

### `utilizadores`

**Proposito:** Utilizadores/membros da equipa

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `nome` | VARCHAR | Nome completo |
| `cargo` | VARCHAR | Cargo |
| `departamento` | VARCHAR | Departamento |
| `email` | VARCHAR | Email |
| `ativo` | BOOLEAN | Utilizador ativo |
| `created_at` | TIMESTAMP WITH TIME ZONE | Data de criacao |

---

### Outras Tabelas de Equipa

| Tabela | Descricao |
|--------|-----------|
| `obra_equipa` | Atribuicoes de equipa a obras |
| `projeto_equipa` | Atribuicoes de equipa a projetos |
| `ausencias` | Ausencias/ferias |
| `pedidos_ausencia` | Pedidos de ausencia |
| `timesheets` | Registos de horas |

---

## Clientes e Fornecedores

| Tabela | Descricao |
|--------|-----------|
| `clientes` | Informacao de clientes |
| `fornecedores` | Fornecedores |
| `fornecedor_especialidades` | Especialidades dos fornecedores |
| `fornecedor_trabalhos` | Tipos de trabalho dos fornecedores |
| `rfq_propostas` | Propostas de RFQ |

---

## Financeiro

| Tabela | Descricao |
|--------|-----------|
| `faturas` | Faturas |
| `recibos_mensais` | Recibos mensais |
| `recibos_prestadores` | Recibos de prestadores |
| `entidades_faturacao` | Entidades de faturacao |
| `projeto_pagamentos` | Pagamentos de projetos |

---

## Documentacao e Biblioteca

| Tabela | Descricao |
|--------|-----------|
| `documentos` | Documentos gerais |
| `projeto_documentos` | Documentos de projetos |
| `biblioteca_categorias` | Categorias da biblioteca |
| `biblioteca_inspiracao` | Conteudo de inspiracao/referencia |
| `biblioteca_inspiracao_tags` | Tags de inspiracao |
| `biblioteca_materiais` | Biblioteca de materiais |
| `biblioteca_materiais_tags` | Tags de materiais |
| `biblioteca_modelos3d` | Modelos 3D |
| `biblioteca_modelos3d_tags` | Tags de modelos 3D |
| `biblioteca_tags` | Tags gerais |

---

## Chat Interno

| Tabela | Descricao |
|--------|-----------|
| `chat_canais` | Canais de chat |
| `chat_mensagens` | Mensagens de chat |
| `chat_reacoes` | Reacoes a mensagens |
| `chat_mencoes` | Mencoes em mensagens |
| `chat_topicos` | Topicos de chat |
| `chat-files` | Ficheiros de chat |

---

## Entregaveis de Projeto

| Tabela | Descricao |
|--------|-----------|
| `projeto_entregas` | Entregas de projetos |
| `projeto_entregaveis` | Entregaveis |
| `projeto_servicos` | Servicos de projetos |
| `projeto_custos` | Custos de projetos |
| `projeto_renders` | Renders/visualizacoes |
| `projeto_fases_contratuais` | Fases contratuais |
| `projeto_intervenientes` | Intervenientes/stakeholders |

---

## Calendario e Eventos

| Tabela | Descricao |
|--------|-----------|
| `calendario_eventos` | Eventos de calendario |
| `eventos` | Eventos gerais |
| `decisoes` | Decisoes/bloqueios |
| `feriados_portugal` | Feriados portugueses |
| `encerramentos_empresa` | Encerramentos da empresa |

---

## Outras Tabelas

| Tabela | Descricao |
|--------|-----------|
| `avatars` | Avatares/fotos de perfil |
| `obra-fotos` | Fotos de obras |
| `projeto-files` | Ficheiros de projetos |

---

## Views da Base de Dados

| View | Descricao |
|------|-----------|
| `v_obra_timeline_completa` | Timeline completa com detalhes de projeto e canal |
| `v_obra_acoes_pendentes` | Acoes pendentes com calculo de urgencia |
| `v_obra_comunicacoes_stats` | Estatisticas de comunicacao por projeto |
| `v_ia_processamento_stats` | Estatisticas de processamento IA (ultimas 24h) |
| `v_ia_mensagens_pendentes` | Mensagens pendentes de processamento IA |
| `v_custos_por_capitulo` | Custos por capitulo de orcamento |

---

## Funcoes e Triggers

### Funcoes Principais

| Funcao | Descricao |
|--------|-----------|
| `gerar_codigo_canonico()` | Gera codigo canonico do projeto (OBR-XXXXX) |
| `extrair_codigo_obra_email()` | Extrai codigo da obra do assunto do email |
| `update_updated_at_column()` | Atualiza automaticamente timestamps |
| `criar_canais_padrao_obra()` | Cria canais padrao para nova obra |
| `adicionar_timeline_entry()` | Adiciona entrada na timeline |
| `criar_acao_de_mensagem()` | Cria acao a partir de mensagem |
| `ia_deve_processar()` | Verifica se IA deve processar mensagens |
| `ia_atualizar_estado_cron()` | Atualiza estado do agendador cron |

### Triggers Principais

- Auto-gerar codigos canonicos para projetos
- Auto-classificar emails por codigo de obra
- Auto-adicionar mensagens WhatsApp e emails a timeline
- Auto-registar alteracoes de estado em acoes
- Auto-notificar quando mensagens pendentes excedem limite

---

## Diagrama de Relacoes

```
projetos (1) ─── (N) obras
         └──── (N) tarefas
         └──── (N) decisoes
         └──── (N) eventos

obras (1) ─── (N) whatsapp_contactos
      └─── (N) whatsapp_mensagens
      └─── (N) obra_emails
      └─── (N) obra_canais
      └─── (N) obra_timeline
      └─── (N) obra_acoes
      └─── (N) ia_sugestoes
      └─── (N) obra_propostas
      └─── (N) obra_autos
      └─── (N) obra_especialidades
      └─── (N) obra_zonas
      └─── (N) obra_items

obra_canais (1) ─── (N) obra_canal_participantes
           └──── (N) whatsapp_mensagens
           └──── (N) obra_emails

whatsapp_mensagens ─┐
obra_emails ────────┼─→ ia_sugestoes ─→ obra_acoes
                   └─→ obra_timeline

obra_acoes (1) ──── (N) obra_acoes_historico
           └────── (N) obra_acoes_comentarios
```

---

## Seguranca

1. **Row Level Security (RLS)** - Ativado em todas as tabelas de comunicacao e acoes
2. **Campos Encriptados** - `whatsapp_config.twilio_auth_token_encrypted`, `email_config.password_encrypted`
3. **Trilho de Auditoria** - Historico completo de alteracoes via `obra_acoes_historico`
4. **Timestamps Automaticos** - `created_at` e `updated_at` em todas as tabelas relevantes

---

## Notas de Implementacao

### Codigos de Projeto
- Projetos de arquitetura: `GA####` (ex: GA0001)
- Projetos de construcao: `GB####` (ex: GB0001)
- Codigo canonico de obra: `OBR-XXXXX` (gerado automaticamente)

### Tipos de Acoes IA
- `requisicao_material` - Pedido de materiais
- `registo_horas` - Registo de horas trabalhadas
- `trabalho_executado` - Trabalho completado
- `nova_tarefa` - Nova tarefa identificada
- `nao_conformidade` - Problema de qualidade/conformidade

### Estados de Acoes
- `pendente` - Por iniciar
- `em_progresso` - Em execucao
- `aguarda_validacao` - Aguarda aprovacao
- `concluida` - Finalizada
- `cancelada` - Cancelada
- `adiada` - Adiada para mais tarde

---

> **Este documento deve ser mantido atualizado quando forem criadas novas tabelas ou alterado o schema.**

---

## Briefing de Continuacao de Desenvolvimento

> **Secao criada para facilitar a continuidade do desenvolvimento entre sessoes**

### Estado Atual do Projeto

A plataforma Gavinho e uma aplicacao completa de **gestao de construcao civil** com as seguintes areas funcionais implementadas:

#### Modulos Implementados

| Modulo | Estado | Descricao |
|--------|--------|-----------|
| **Autenticacao** | Completo | Login email/password, OAuth Google, recuperacao senha |
| **Gestao Projetos** | Completo | CRUD projetos GA/GB, dashboard, documentos, entregaveis |
| **Gestao Obras** | Completo | CRUD obras com cards, diario obra, autos, licencas |
| **Chat Obras WhatsApp** | Completo | Integracao Twilio, canais, contactos, historico |
| **Processamento IA** | Completo | Analise automatica de mensagens, sugestoes, cron |
| **Sistema Comunicacoes** | Completo | Canais, emails, timeline unificada, acoes operacionais |
| **Exportacao PDF** | Completo | Diario de obra exportavel para PDF |
| **Biblioteca** | Parcial | Materiais, inspiracao, modelos 3D |
| **Financeiro** | Parcial | Faturas, recibos, pagamentos |
| **Orcamentos** | Parcial | Propostas, itens, capitulos |

---

### Arquitetura Tecnica

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  React 19 + Vite + React Router 7                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │  Contexts   │              │
│  │ (39 paginas)│  │(11 comps)   │  │ (AuthContext)│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────┬───────────────────────────────────────┘
                          │ supabase-js
┌─────────────────────────▼───────────────────────────────────────┐
│                       SUPABASE                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Database   │  │    Auth     │  │   Storage   │              │
│  │ (74+ tabelas)│  │ (usuarios) │  │ (ficheiros) │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌──────────────────────────────────────────────┐               │
│  │           Edge Functions (Deno)               │               │
│  │  analisar-mensagens | processar-mensagens-cron│               │
│  │  twilio-send/webhook | email-send/webhook     │               │
│  │  twilio-conversations | obra-acoes            │               │
│  └──────────────────────────────────────────────┘               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    INTEGRACOES EXTERNAS                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Twilio    │  │  SendGrid   │  │  Anthropic  │              │
│  │  WhatsApp   │  │   Resend    │  │   OpenAI    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

### Ficheiros Principais por Modulo

#### Autenticacao e Layout
| Ficheiro | Localizacao | Funcao |
|----------|-------------|--------|
| `AuthContext.jsx` | `src/contexts/` | Gestao estado auth, roles, permissoes |
| `Layout.jsx` | `src/components/` | Layout principal com sidebar responsiva |
| `ProtectedRoute.jsx` | `src/components/` | HOC protecao de rotas |
| `Login.jsx` | `src/pages/` | Pagina de login |

#### Gestao de Projetos
| Ficheiro | Localizacao | Funcao |
|----------|-------------|--------|
| `Projetos.jsx` | `src/pages/` | Lista projetos com cards/grid |
| `ProjetoDetalhe.jsx` | `src/pages/` | Detalhe com abas |
| `ProjetoDocumentos.jsx` | `src/components/` | Gestao documentos |
| `ProjetoEntregaveis.jsx` | `src/components/` | Gestao entregaveis |

#### Gestao de Obras
| Ficheiro | Localizacao | Funcao |
|----------|-------------|--------|
| `Obras.jsx` | `src/pages/` | Lista obras com cards (redesenhado) |
| `ObraDetalhe.jsx` | `src/pages/` | Detalhe com abas |
| `DiarioObra.jsx` | `src/pages/` | Diario de obra com export PDF |
| `ChatObras.jsx` | `src/pages/` | Chat WhatsApp + IA (principal) |
| `ObraComunicacoes.jsx` | `src/pages/` | Comunicacoes da obra |

#### Edge Functions IA
| Ficheiro | Localizacao | Funcao |
|----------|-------------|--------|
| `analisar-mensagens/` | `supabase/functions/` | Analise IA de mensagens |
| `processar-mensagens-cron/` | `supabase/functions/` | Processamento automatico periodico |
| `obra-acoes/` | `supabase/functions/` | Criar acoes de mensagens/IA |

#### Edge Functions Comunicacao
| Ficheiro | Localizacao | Funcao |
|----------|-------------|--------|
| `twilio-send/` | `supabase/functions/` | Enviar WhatsApp |
| `twilio-webhook/` | `supabase/functions/` | Receber WhatsApp |
| `twilio-conversations/` | `supabase/functions/` | Gestao conversas |
| `email-send/` | `supabase/functions/` | Enviar email |
| `email-webhook/` | `supabase/functions/` | Webhooks email |

---

### Fluxo do Sistema de IA

```
Mensagem WhatsApp/Email
        │
        ▼
┌───────────────────┐
│  twilio-webhook   │ ──► Armazena em whatsapp_mensagens
│  email-webhook    │     (processada_ia = false)
└───────────────────┘
        │
        ▼ (cron ou manual)
┌───────────────────┐
│ processar-cron    │ ──► Busca mensagens nao processadas
│ analisar-mensagens│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Anthropic/      │ ──► Identifica tipo:
│   OpenAI API      │     - requisicao_material
└───────────────────┘     - registo_horas
        │                 - trabalho_executado
        ▼                 - nova_tarefa
┌───────────────────┐     - nao_conformidade
│   ia_sugestoes    │
└───────────────────┘
        │
        ▼ (utilizador aceita)
┌───────────────────┐
│   obra-acoes      │ ──► Cria acao em obra_acoes
└───────────────────┘
```

---

### Variaveis de Ambiente Necessarias

#### Frontend (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Supabase Secrets (Edge Functions)
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
RESEND_API_KEY=re_...
```

#### Twilio (Tabela whatsapp_config)
```sql
-- Credenciais Twilio armazenadas na tabela whatsapp_config
SELECT twilio_account_sid, twilio_phone_number FROM whatsapp_config WHERE ativo = true;
```

---

### Areas para Continuacao de Desenvolvimento

#### Prioridade Alta
| Area | Descricao | Tabelas Relacionadas |
|------|-----------|---------------------|
| **Notificacoes Push** | Sistema de notificacoes em tempo real | Criar `notificacoes` |
| **Dashboard Analitico** | Metricas e KPIs de projetos/obras | Views agregadas |
| **Mobile PWA** | Otimizacao para instalacao mobile | - |

#### Prioridade Media
| Area | Descricao | Tabelas Relacionadas |
|------|-----------|---------------------|
| **Orcamentos Completo** | Fluxo completo de orcamentacao | `orcamentos`, `orcamento_capitulos` |
| **Financeiro Completo** | Faturas, recibos, pagamentos | `faturas`, `recibos_*` |
| **Relatorios Avancados** | Exportacao Word/Excel | - |

#### Prioridade Baixa
| Area | Descricao | Tabelas Relacionadas |
|------|-----------|---------------------|
| **Integracao Calendario** | Sync com Google Calendar | `calendario_eventos` |
| **Biblioteca Completa** | Upload 3D, categorias avancadas | `biblioteca_*` |
| **Multi-tenant** | Suporte a multiplas empresas | Refatoracao RLS |

---

### Comandos Uteis

```bash
# Desenvolvimento
cd gavinho-app && npm run dev

# Build
npm run build

# Deploy Edge Functions
supabase functions deploy analisar-mensagens
supabase functions deploy processar-mensagens-cron

# Logs Edge Functions
supabase functions logs analisar-mensagens --tail

# Testar Edge Function localmente
supabase functions serve analisar-mensagens --env-file .env.local
```

---

### Dependencias Principais

```json
{
  "react": "^19.2.0",
  "react-router": "^7.11.0",
  "@supabase/supabase-js": "^2.88.0",
  "lucide-react": "^0.511.0",
  "jspdf": "^4.0.0",
  "html2canvas": "^1.4.1",
  "xlsx": "^0.18.5",
  "docx": "^9.5.1",
  "file-saver": "^2.0.5"
}
```

---

### Convencoes de Codigo

1. **Nomes de ficheiros**: PascalCase para componentes (`ChatObras.jsx`)
2. **Estilos**: CSS-in-JS inline com objetos JavaScript
3. **Estado**: useState/useEffect local, Context API para global
4. **Queries**: Supabase client direto nas paginas/componentes
5. **Tipos de acao IA**: `requisicao_material`, `registo_horas`, `trabalho_executado`, `nova_tarefa`, `nao_conformidade`
6. **Estados de acao**: `pendente`, `em_progresso`, `aguarda_validacao`, `concluida`, `cancelada`, `adiada`

---

> **Nota**: Este briefing deve ser atualizado sempre que houver alteracoes significativas na arquitetura ou novas funcionalidades implementadas.
