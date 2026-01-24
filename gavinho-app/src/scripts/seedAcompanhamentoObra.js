// Script para inserir dados de teste para Acompanhamento de Obra
// Execute este script através da página AdminSeed

// Não Conformidades de exemplo
export const naoConformidades = [
  {
    titulo: 'Armadura de laje com espaçamento incorreto',
    descricao: 'Verificado que a armadura superior da laje L1 no Piso 1 apresenta espaçamento de 20cm entre varões quando o projeto especifica 15cm. Desvio identificado durante inspeção de rotina antes da betonagem.',
    tipo: 'execucao',
    gravidade: 'maior',
    especialidade: 'Estrutura',
    zona: 'Piso 1',
    responsavel_resolucao: 'Sonangil - Eng. Filipe',
    dias_atras: 5,
    estado: 'em_resolucao',
    acao_corretiva: 'Recolocação das armaduras com espaçamento correto de 15cm conforme projeto'
  },
  {
    titulo: 'Impermeabilização com bolhas de ar',
    descricao: 'Membrana de impermeabilização na cobertura apresenta múltiplas bolhas de ar, comprometendo a estanquicidade. Área afetada: aproximadamente 15m².',
    tipo: 'execucao',
    gravidade: 'critica',
    especialidade: 'Impermeabilização',
    zona: 'Cobertura',
    responsavel_resolucao: 'IMPERSOL',
    dias_atras: 2,
    estado: 'aberta'
  },
  {
    titulo: 'Condutas AVAC com diâmetro incorreto',
    descricao: 'Condutas de insuflação instaladas no piso -1 têm diâmetro de 200mm quando projeto indica 250mm. Impacto no caudal de ar previsto.',
    tipo: 'material',
    gravidade: 'maior',
    especialidade: 'AVAC',
    zona: 'Piso -1',
    responsavel_resolucao: 'GET Engenharia - João Madeira',
    dias_atras: 10,
    estado: 'resolvida',
    acao_corretiva: 'Substituição das condutas por diâmetro correto de 250mm',
    acao_preventiva: 'Verificação de materiais na receção antes de instalação'
  },
  {
    titulo: 'Cota de soleira diferente do projeto',
    descricao: 'Soleira da porta principal executada a +0.58m quando deveria estar a +0.55m. Diferença de 3cm afeta compatibilização com pavimento exterior.',
    tipo: 'execucao',
    gravidade: 'menor',
    especialidade: 'Alvenarias',
    zona: 'Piso 0',
    responsavel_resolucao: 'Empreiteiro Geral',
    dias_atras: 15,
    estado: 'verificada',
    acao_corretiva: 'Ajuste de cota do pavimento exterior para compatibilização'
  },
  {
    titulo: 'Quadro elétrico sem identificação de circuitos',
    descricao: 'Quadro elétrico geral do piso 0 instalado sem identificação dos circuitos. Não conformidade com regulamentação RTIEBT.',
    tipo: 'execucao',
    gravidade: 'menor',
    especialidade: 'Elétrico',
    zona: 'Piso 0',
    responsavel_resolucao: 'ElectroLux',
    dias_atras: 3,
    estado: 'aberta'
  },
  {
    titulo: 'Prumo do pilar P5 fora de tolerância',
    descricao: 'Pilar P5 apresenta desvio de prumo de 2.5cm na altura total de 3m. Tolerância admissível é 1.5cm. Requer verificação estrutural.',
    tipo: 'execucao',
    gravidade: 'critica',
    especialidade: 'Estrutura',
    zona: 'Piso 0',
    responsavel_resolucao: 'GAPRES',
    dias_atras: 1,
    estado: 'aberta'
  }
]

// Relatórios de exemplo
export const relatorios = [
  {
    titulo: 'Relatório Semanal #12',
    tipo: 'semanal',
    dias_inicio: 14,
    dias_fim: 7,
    resumo_executivo: 'Semana marcada pelo avanço significativo na estrutura do Piso 1. Conclusão da betonagem das lajes e início da alvenaria de enchimento. Pequenos atrasos devido a condições meteorológicas adversas na terça e quarta-feira.',
    trabalhos_realizados: '• Betonagem completa da laje L1 Piso 1 (150m³)\n• Execução de 60% das alvenarias de enchimento Piso 0\n• Instalação de tubagens de abastecimento de água Piso -1\n• Montagem de condutas AVAC na zona técnica',
    trabalhos_proxima_semana: '• Conclusão das alvenarias Piso 0\n• Início da cofragem de pilares Piso 2\n• Continuação das instalações MEP\n• Receção de caixilharias',
    problemas_identificados: '• Atraso na entrega de aço (2 dias)\n• Condições meteorológicas desfavoráveis',
    progresso_global: 42,
    estado: 'publicado'
  },
  {
    titulo: 'Relatório Semanal #11',
    tipo: 'semanal',
    dias_inicio: 21,
    dias_fim: 14,
    resumo_executivo: 'Semana de progresso constante. Conclusão da estrutura do Piso 0 e preparação para o Piso 1.',
    trabalhos_realizados: '• Descofragem de vigas Piso 0\n• Preparação de cofragem Piso 1\n• Instalação de prumadas elétricas',
    trabalhos_proxima_semana: '• Betonagem laje Piso 1\n• Alvenarias Piso 0',
    progresso_global: 38,
    estado: 'publicado'
  },
  {
    titulo: 'Relatório Quinzenal - Estruturas',
    tipo: 'quinzenal',
    dias_inicio: 28,
    dias_fim: 14,
    resumo_executivo: 'Relatório focado no avanço da componente estrutural. Bom progresso geral apesar de alguns desafios técnicos identificados.',
    trabalhos_realizados: '• Execução completa de fundações\n• Estrutura do Piso 0\n• Início da estrutura do Piso 1',
    progresso_global: 40,
    estado: 'publicado'
  },
  {
    titulo: 'Relatório Semanal #13',
    tipo: 'semanal',
    dias_inicio: 7,
    dias_fim: 0,
    resumo_executivo: 'Semana em curso. Bom progresso nas frentes de trabalho previstas.',
    trabalhos_realizados: '• Alvenarias Piso 0 em conclusão\n• Cofragem pilares Piso 2 iniciada\n• Instalações MEP em progresso',
    progresso_global: 45,
    estado: 'rascunho'
  }
]

// Função principal de seed
export async function seedAcompanhamentoObra(supabase, obraId, addLog) {
  addLog('🏗️ A iniciar seed de Acompanhamento de Obra...', 'info')

  // Verificar se a obra existe
  const { data: obra, error: obraError } = await supabase
    .from('obras')
    .select('id, codigo, nome')
    .eq('id', obraId)
    .single()

  if (obraError || !obra) {
    addLog(`❌ Obra não encontrada: ${obraId}`, 'error')
    return
  }

  addLog(`📍 Obra: ${obra.codigo} - ${obra.nome}`, 'info')

  // Buscar especialidades
  const { data: especialidades } = await supabase
    .from('especialidades')
    .select('id, nome')

  const especMap = (especialidades || []).reduce((acc, esp) => {
    acc[esp.nome] = esp.id
    return acc
  }, {})

  // Buscar zonas da obra
  const { data: zonas } = await supabase
    .from('obra_zonas')
    .select('id, nome')
    .eq('obra_id', obraId)

  const zonaMap = (zonas || []).reduce((acc, zona) => {
    acc[zona.nome] = zona.id
    return acc
  }, {})

  // Criar Não Conformidades
  addLog('📋 A criar Não Conformidades...', 'info')

  for (let i = 0; i < naoConformidades.length; i++) {
    const nc = naoConformidades[i]
    const codigo = `NC-${String(i + 1).padStart(3, '0')}`

    const dataIdentificacao = new Date()
    dataIdentificacao.setDate(dataIdentificacao.getDate() - nc.dias_atras)

    const dataLimite = new Date(dataIdentificacao)
    dataLimite.setDate(dataLimite.getDate() + 7)

    const ncData = {
      obra_id: obraId,
      codigo,
      titulo: nc.titulo,
      descricao: nc.descricao,
      tipo: nc.tipo,
      gravidade: nc.gravidade,
      especialidade_id: especMap[nc.especialidade] || null,
      zona_id: zonaMap[nc.zona] || null,
      responsavel_resolucao: nc.responsavel_resolucao,
      data_identificacao: dataIdentificacao.toISOString().split('T')[0],
      data_limite_resolucao: dataLimite.toISOString().split('T')[0],
      estado: nc.estado,
      acao_corretiva: nc.acao_corretiva || null,
      acao_preventiva: nc.acao_preventiva || null
    }

    if (nc.estado === 'resolvida' || nc.estado === 'verificada') {
      const dataResolucao = new Date(dataIdentificacao)
      dataResolucao.setDate(dataResolucao.getDate() + 3)
      ncData.data_resolucao = dataResolucao.toISOString().split('T')[0]
    }

    const { data: ncCriada, error } = await supabase
      .from('nao_conformidades')
      .insert(ncData)
      .select()
      .single()

    if (error) {
      addLog(`❌ Erro ao criar NC ${codigo}: ${error.message}`, 'error')
    } else {
      addLog(`✅ NC criada: ${codigo} - ${nc.titulo}`, 'success')

      // Adicionar histórico
      await supabase.from('nc_historico').insert({
        nc_id: ncCriada.id,
        acao: 'criada',
        descricao: 'Não conformidade criada (seed)',
        estado_novo: 'aberta'
      })
    }
  }

  // Criar Relatórios
  addLog('📄 A criar Relatórios...', 'info')

  for (let i = 0; i < relatorios.length; i++) {
    const rel = relatorios[i]
    const codigo = `REL-${String(i + 1).padStart(3, '0')}`

    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - rel.dias_inicio)

    const dataFim = new Date()
    dataFim.setDate(dataFim.getDate() - rel.dias_fim)

    const relData = {
      obra_id: obraId,
      codigo,
      titulo: rel.titulo,
      tipo: rel.tipo,
      data_inicio: dataInicio.toISOString().split('T')[0],
      data_fim: dataFim.toISOString().split('T')[0],
      resumo_executivo: rel.resumo_executivo,
      trabalhos_realizados: rel.trabalhos_realizados,
      trabalhos_proxima_semana: rel.trabalhos_proxima_semana || null,
      problemas_identificados: rel.problemas_identificados || null,
      progresso_global: rel.progresso_global,
      estado: rel.estado
    }

    if (rel.estado === 'publicado') {
      relData.data_publicacao = dataFim.toISOString()
    }

    const { error } = await supabase
      .from('obra_relatorios')
      .insert(relData)

    if (error) {
      addLog(`❌ Erro ao criar relatório ${codigo}: ${error.message}`, 'error')
    } else {
      addLog(`✅ Relatório criado: ${codigo} - ${rel.titulo}`, 'success')
    }
  }

  addLog('🎉 Seed de Acompanhamento de Obra concluído!', 'success')
}

// Função para limpar dados de teste
export async function clearAcompanhamentoObra(supabase, obraId, addLog) {
  addLog('🗑️ A limpar dados de Acompanhamento de Obra...', 'info')

  // Limpar NC histórico primeiro (foreign key)
  const { data: ncs } = await supabase
    .from('nao_conformidades')
    .select('id')
    .eq('obra_id', obraId)

  if (ncs && ncs.length > 0) {
    const ncIds = ncs.map(nc => nc.id)
    await supabase.from('nc_historico').delete().in('nc_id', ncIds)
    await supabase.from('nc_fotografias').delete().in('nc_id', ncIds)
  }

  // Limpar NCs
  const { error: ncError } = await supabase
    .from('nao_conformidades')
    .delete()
    .eq('obra_id', obraId)

  if (ncError) {
    addLog(`❌ Erro ao limpar NCs: ${ncError.message}`, 'error')
  } else {
    addLog('✅ Não Conformidades limpas', 'success')
  }

  // Limpar relatórios
  const { error: relError } = await supabase
    .from('obra_relatorios')
    .delete()
    .eq('obra_id', obraId)

  if (relError) {
    addLog(`❌ Erro ao limpar relatórios: ${relError.message}`, 'error')
  } else {
    addLog('✅ Relatórios limpos', 'success')
  }

  // Limpar fotografias
  const { error: fotoError } = await supabase
    .from('obra_fotografias')
    .delete()
    .eq('obra_id', obraId)

  if (fotoError) {
    addLog(`❌ Erro ao limpar fotografias: ${fotoError.message}`, 'error')
  } else {
    addLog('✅ Fotografias limpas', 'success')
  }

  addLog('🎉 Limpeza concluída!', 'success')
}
