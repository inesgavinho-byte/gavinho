// Script para popular dados do projeto Maria Residences (GA00402)
// Execute este script no console do browser ou importe-o na aplicação

import { supabase } from '../lib/supabase'

export async function seedMariaResidences() {

  try {
    // 1. CRIAR/ATUALIZAR PROJETO
    const projetoData = {
      codigo: 'GA00402',
      nome: 'Maria Residences',
      tipologia: 'Residencial',
      subtipo: 'Edifício',
      morada: 'Rua Maria nº 1 a 7',
      cidade: 'Lisboa',
      localizacao: 'Lisboa',
      pais: 'Portugal',
      fase: 'Construção',
      status: 'at_risk',
      progresso: 45,
      encarregado: 'Sr. Edgard Borges',
      contacto_obra: '+351 937 263 804',
      notas: 'Obra em fase de construção. Encarregado: Sr. Edgard Borges',
      data_inicio: '2024-06-01',
      data_prevista: '2025-06-30'
    }

    // Verificar se projeto existe
    const { data: existingProject } = await supabase
      .from('projetos')
      .select('id')
      .eq('codigo', 'GA00402')
      .single()

    let projetoId

    if (existingProject) {
      // Atualizar projeto existente
      const { data, error } = await supabase
        .from('projetos')
        .update(projetoData)
        .eq('codigo', 'GA00402')
        .select()
        .single()

      if (error) throw error
      projetoId = data.id
    } else {
      // Criar novo projeto
      const { data, error } = await supabase
        .from('projetos')
        .insert([projetoData])
        .select()
        .single()

      if (error) throw error
      projetoId = data.id
    }

    // 2. CRIAR UTILIZADORES (se não existirem)
    const utilizadores = [
      { nome: 'João Umbelino', cargo: 'Arquiteto', departamento: 'Projetos', email: 'joao.umbelino@gavinho.pt' },
      { nome: 'Valentina Gatica', cargo: 'Arquiteta', departamento: 'Projetos', email: 'valentina.gatica@gavinho.pt' },
      { nome: 'Isabel Jardim', cargo: 'Arquiteta', departamento: 'Projetos', email: 'isabel.jardim@gavinho.pt' }
    ]

    const utilizadorIds = {}

    for (const util of utilizadores) {
      const { data: existing } = await supabase
        .from('utilizadores')
        .select('id')
        .eq('nome', util.nome)
        .single()

      if (existing) {
        utilizadorIds[util.nome] = existing.id
      } else {
        const { data, error } = await supabase
          .from('utilizadores')
          .insert([{ ...util, ativo: true }])
          .select()
          .single()

        if (!error && data) {
          utilizadorIds[util.nome] = data.id
        }
      }
    }

    // 3. CRIAR TAREFAS CONCLUÍDAS
    const tarefasConcluidas = [
      { titulo: 'Localização desenhos Samuel', responsavel: 'João Umbelino', data_conclusao: '2024-11-21' },
      { titulo: 'Envio pré-certificados energéticos à Inês', responsavel: 'João Umbelino', data_conclusao: '2024-11-21' },
      { titulo: 'Compatibilização projeto águas/esgotos AW Eng.', responsavel: 'Valentina Gatica', data_conclusao: '2024-11-24' },
      { titulo: 'Guardar PDF e DWF projetos originais AW', responsavel: 'Valentina Gatica', data_conclusao: '2024-11-25' },
      { titulo: 'Reunião eng. Ricardo — agendada visita obra', responsavel: 'Valentina Gatica', data_conclusao: '2024-11-27' }
    ]

    for (const tarefa of tarefasConcluidas) {
      const responsavelId = utilizadorIds[tarefa.responsavel]

      const { error } = await supabase
        .from('tarefas')
        .insert([{
          titulo: tarefa.titulo,
          descricao: `Tarefa do projeto Maria Residences`,
          projeto_id: projetoId,
          responsavel_id: responsavelId,
          responsavel_nome: tarefa.responsavel,
          status: 'concluido',
          prioridade: 'media',
          data_limite: tarefa.data_conclusao,
          data_conclusao: tarefa.data_conclusao
        }])

      if (!error) {
      }
    }

    // 4. CRIAR TAREFAS EM PROGRESSO
    const tarefasEmProgresso = [
      { titulo: 'Atualizar quantidades equipamento sanitário', responsavel: 'Valentina Gatica', estado: 'Aguarda mapas' },
      { titulo: 'Pormenores IS e Cozinha', responsavel: 'Valentina Gatica', estado: 'Aguarda AW Eng.' },
      { titulo: 'Planta cores convencionais último piso', responsavel: 'Valentina Gatica', estado: 'NÃO ENTREGUE' }
    ]

    for (const tarefa of tarefasEmProgresso) {
      const responsavelId = utilizadorIds[tarefa.responsavel]

      const { error } = await supabase
        .from('tarefas')
        .insert([{
          titulo: tarefa.titulo,
          descricao: `Estado: ${tarefa.estado}`,
          projeto_id: projetoId,
          responsavel_id: responsavelId,
          responsavel_nome: tarefa.responsavel,
          status: 'em_progresso',
          prioridade: tarefa.estado === 'NÃO ENTREGUE' ? 'alta' : 'media',
          notas: tarefa.estado
        }])

      if (!error) {
      }
    }

    // 5. CRIAR BLOQUEIOS/DECISÕES
    const bloqueios = [
      {
        titulo: 'Compatibilização cortes e mapas gerais',
        dependencia: 'AW Engenharia',
        impacto: 'Atrasa Valentina',
        tipo: 'blocker'
      },
      {
        titulo: 'Planta cores último piso (parede gesso)',
        dependencia: 'Valentina — não entregue',
        impacto: 'BLOQUEIA MEDIDAS',
        tipo: 'blocker'
      }
    ]

    for (const bloqueio of bloqueios) {
      const { error } = await supabase
        .from('decisoes')
        .insert([{
          titulo: bloqueio.titulo,
          descricao: `Dependência: ${bloqueio.dependencia}\nImpacto: ${bloqueio.impacto}`,
          projeto_id: projetoId,
          tipo: bloqueio.tipo,
          status: 'pendente',
          prioridade: bloqueio.impacto.includes('BLOQUEIA') ? 'urgente' : 'alta',
          responsavel: bloqueio.dependencia
        }])

      if (!error) {
      }
    }

    // 6. CRIAR EVENTO - VISITA OBRA
    const { error: eventoError } = await supabase
      .from('eventos')
      .insert([{
        titulo: 'Visita obra (pedras + medidas janelas)',
        descricao: 'Participantes: Valentina Gatica + Arq. Isabel Jardim\nObra: Maria Residences',
        projeto_id: projetoId,
        data: '2024-12-03',
        hora_inicio: '12:00',
        hora_fim: '14:00',
        tipo: 'visita_obra',
        local: 'Rua Maria nº 1 a 7, Lisboa',
        participantes: 'Valentina Gatica, Isabel Jardim'
      }])

    if (!eventoError) {
    }

    // 7. CRIAR ITENS DE PROCUREMENT (usando notas do projeto ou tabela específica)
    // Como pode não existir tabela específica, vamos adicionar como tarefas de procurement
    const procurement = [
      { item: 'Contentor para obra', fornecedor: 'Máximo Entulhos', prazo: 'Esta semana', estado: 'Enviado' },
      { item: 'Instalação sanitária apoio obra', fornecedor: 'VENDAP', prazo: '—', estado: 'Aguarda' }
    ]

    for (const item of procurement) {
      const { error } = await supabase
        .from('tarefas')
        .insert([{
          titulo: `[PROCUREMENT] ${item.item}`,
          descricao: `Fornecedor: ${item.fornecedor}\nPrazo: ${item.prazo}\nEstado: ${item.estado}`,
          projeto_id: projetoId,
          status: item.estado === 'Enviado' ? 'em_progresso' : 'pendente',
          prioridade: 'media',
          categoria: 'procurement',
          notas: `Fornecedor: ${item.fornecedor}`
        }])

      if (!error) {
      }
    }

    return { success: true, projetoId }

  } catch (error) {
    console.error('❌ Erro no seed:', error)
    return { success: false, error }
  }
}

// Para executar diretamente
// seedMariaResidences()
