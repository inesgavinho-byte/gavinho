// =====================================================
// SAMPLE PROJECT DATA
// Dados de exemplo para desenvolvimento/demonstração
// NOTA: Este ficheiro deve ser removido em produção
// =====================================================

export const sampleProjectData = {
  // ========== PROJETO 1: APARTAMENTO MM (Brasil) ==========
  'GA00492': {
    codigo: 'GA00492',
    codigo_interno: '492_CASTILHO 3',
    referencia_proposta: 'POP.017.2025',
    nome: 'Apartamento MM',
    tipologia: 'Residencial',
    subtipo: 'Apartamento',
    tipo_apartamento: 'T3',
    area_bruta: 227.37,
    area_exterior: 7.92,
    unidade_area: 'm²',
    localizacao: {
      morada: 'Fazenda Da Grama, Rodovia Miguel Melhado Campos Km 83,5',
      cidade: 'Itupeva',
      estado: 'São Paulo',
      codigo_postal: '13299-759',
      pais: 'Brasil'
    },
    datas: {
      data_proposta: '2025-07-22',
      data_assinatura: '2025-07-30',
      data_inicio: '2025-07-30',
      data_prevista: '2027-12-20'
    },
    fase: 'Conceito',
    status: 'on_track',
    progresso: 5,
    cliente: {
      codigo: 'CLI_00141',
      nome: 'Maurício Mendes',
      titulo: 'Engº',
      tipo: 'Particular',
      documento: 'CPF: 016.795.858-51',
      email: 'mauricio@email.com',
      telefone: '+55 11 99999-9999',
      segmento: 'Internacional',
      idioma: 'Português'
    },
    servicos: [
      {
        tipo: 'Gestão de Projeto',
        descricao: 'Acompanhamento e controlo do projeto até conclusão',
        data_fim: '2027-12-20',
        inclui: [
          'Visitas mensais à obra',
          'Relatórios trimestrais',
          'Controlo de qualidade',
          'Controlo de prazos',
          'Coordenação técnica'
        ]
      },
      {
        tipo: 'Design de Interiores',
        descricao: 'Projeto completo de design de interiores em 3 fases',
        fases: [
          {
            numero: 1,
            nome: 'Conceito / Estudo Prévio',
            prazo: '50 dias úteis',
            status: 'em_progresso',
            entregaveis: [
              'Planta Arquitetónica',
              'Cortes e alçados interiores',
              'Moodboard de materiais',
              '10 Imagens 3D de Estudo'
            ]
          },
          {
            numero: 2,
            nome: 'Projeto Base',
            prazo: '60 dias úteis',
            status: 'pendente',
            entregaveis: [
              'Plantas (existente, cores convencionais, proposta)',
              'Planta implantação mobiliário',
              'Mapas Gerais (Tetos, Elétrico, Revestimentos)',
              '12 Imagens 3D Finais'
            ]
          },
          {
            numero: 3,
            nome: 'Projeto de Execução',
            prazo: '60 dias úteis',
            status: 'pendente',
            entregaveis: [
              'Planta implantação final',
              'Desenhos técnicos peças decorativas',
              'Seleção peças autorais',
              'Seleção tecidos e cortinas',
              'Iluminação decorativa',
              'Mapa de Acabamentos',
              'Mapa de quantidades e estimativa custos'
            ]
          }
        ]
      }
    ],
    orcamento: {
      valor_total: 20000.00,
      moeda: 'EUR',
      iva: 'Isento',
      motivo_isencao: 'Artigo 14º do CIVA'
    },
    pagamentos: [
      { prestacao: 1, descricao: 'Adjudicação', data: '2025-07-30', valor: 4000, estado: 'pago' },
      { prestacao: 2, descricao: '2ª Prestação', data: '2026-06-30', valor: 4000, estado: 'pendente' },
      { prestacao: 3, descricao: '3ª Prestação', data: '2026-12-30', valor: 4000, estado: 'pendente' },
      { prestacao: 4, descricao: '4ª Prestação', data: '2027-06-30', valor: 4000, estado: 'pendente' },
      { prestacao: 5, descricao: '5ª Prestação', data: '2027-12-30', valor: 4000, estado: 'pendente' }
    ],
    financeiro: {
      total_contratado: 20000,
      total_faturado: 4000,
      total_pago: 4000,
      total_pendente: 16000
    },
    faturas: [
      {
        numero: 'FAC 1/461',
        data: '2025-08-01',
        valor: 4000,
        estado: 'pago',
        descricao: '1ª Prestação - Adjudicação'
      }
    ],
    documentos: [
      { tipo: 'Proposta', nome: 'POP_017_2025_APARTAMENTO_MM.pdf', data: '2025-07-30', estado: 'assinado' },
      { tipo: 'Fatura', nome: 'Fatura_1_461.pdf', data: '2025-08-01', estado: 'emitido' }
    ],
    equipa: {
      project_manager: 'Maria Gavinho',
      designer: 'Leonor Traguil',
      arquiteto: null
    }
  },

  // ========== PROJETO 2: OEIRAS HOUSE S+K (Casa 1) ==========
  'GA00413': {
    codigo: 'GA00413',
    codigo_nome: 'OEIRAS HOUSE S+K',
    referencia_proposta: 'POP.007.2025',
    proposta_original: 'POP.030.2021',
    nome: 'Oeiras House S+K',
    tipologia: 'Residencial',
    subtipo: 'Moradia',
    numero_unidades: 2,
    pisos_por_unidade: 3,
    localizacao: {
      morada: 'Rua da Gazeta',
      cidade: 'Paço de Arcos',
      concelho: 'Oeiras',
      pais: 'Portugal'
    },
    datas: {
      data_proposta: '2025-03',
      data_assinatura: '2025-05-26',
      data_inicio: '2025-05-26',
      data_prevista: '2027-05-26'
    },
    fase: 'Projeto',
    status: 'on_track',
    progresso: 25,
    cliente: {
      codigo: 'CLI_00119',
      nome: 'Nazir Sadrun Din',
      titulo: 'Sr.',
      tipo: 'Particular',
      documento: 'NIF: 109599560',
      email: 'nazir@email.com',
      telefone: '+351 912 345 678',
      segmento: 'Internacional',
      idioma: 'Português',
      notas: 'Faturação dividida entre dois membros da família para as duas moradias'
    },
    clientes_faturacao: [
      { codigo: 'CLI_00119', nome: 'Shazia Nazir Sadru Din', nif: '246295783', moradia: 'Casa 1' },
      { codigo: 'CLI_00120', nome: 'Sheliza Nazir Sadru Din', nif: '241195322', moradia: 'Casa 2' }
    ],
    coordenacao_licenciamento: 'Frederico Valsassina Arquitetos (FVA)',
    servicos: [
      {
        tipo: 'Arquitetura de Interiores',
        descricao: 'Alterações ao Projeto Licenciado',
        fases: [
          { numero: 1, nome: 'Estudos de Layout / Revisão do Projeto', prazo: 'Concluída', status: 'concluida' },
          { numero: 2, nome: 'Projeto Base de Arquitetura e Interiores', prazo: '40 dias úteis', status: 'em_progresso',
            entregaveis: ['Plantas finais', 'Implantação mobiliário', 'Mapas Gerais', '30 Imagens 3D (15/casa)'] },
          { numero: 3, nome: 'Projeto de Execução de Arquitetura', prazo: '60 dias úteis', status: 'pendente' },
          { numero: 4, nome: 'Projeto de Execução de Interiores', prazo: '60 dias úteis', status: 'pendente' },
          { numero: 5, nome: 'Compatibilização de Projetos', prazo: '50 dias úteis', status: 'pendente' },
          { numero: 6, nome: 'Design de Interiores e Decoração', prazo: '60 dias úteis', status: 'pendente' },
          { numero: 7, nome: 'Assistência Técnica em Obra', prazo: '18 meses (36 visitas)', status: 'pendente' }
        ]
      }
    ],
    orcamento: {
      valor_total: 140000.00,
      moeda: 'EUR',
      iva: true,
      taxa_iva: 23
    },
    pagamentos: [
      { prestacao: 1, descricao: 'Adjudicação (Fase 1)', data: '2025-05-26', valor: 25500, estado: 'pago', notas: 'Dedução de €24.500 de pagamentos anteriores' },
      { prestacao: 2, descricao: 'Entrega Projeto Base', data: '2025-07-15', valor: 23000, estado: 'faturado' },
      { prestacao: 3, descricao: 'Entrega Projeto Execução', data: '2025-10-15', valor: 20000, estado: 'pendente' },
      { prestacao: 4, descricao: 'Conclusão Compatibilização', data: '2026-01-15', valor: 20000, estado: 'pendente' },
      { prestacao: 5, descricao: 'Entrega Design Interiores', data: '2026-04-15', valor: 20000, estado: 'pendente' },
      { prestacao: 6, descricao: 'Conclusão Assistência Técnica', data: '2027-05-26', valor: 7000, estado: 'pendente' }
    ],
    financeiro: {
      total_contratado: 140000,
      total_faturado: 31365,
      total_pago: 25500,
      total_pendente: 108635
    },
    faturas: [
      { numero: 'FAC 1/449', data: '2025-05-23', valor: 15682.50, estado: 'emitido', cliente: 'Shazia (Casa 1)' },
      { numero: 'FAC 1/450', data: '2025-05-25', valor: 15682.50, estado: 'emitido', cliente: 'Sheliza (Casa 2)' }
    ],
    documentos: [
      { tipo: 'Proposta', nome: 'POP_007_2025_ASSINADA_GAVINHO.pdf', data: '2025-05-26', estado: 'assinado' },
      { tipo: 'Fatura', nome: 'Fatura_1_449.pdf', data: '2025-05-23', estado: 'emitido' },
      { tipo: 'Fatura', nome: 'Fatura_1_450.pdf', data: '2025-05-25', estado: 'emitido' }
    ],
    equipa: {
      project_manager: 'Maria Gavinho',
      designer: 'Leonor Traguil',
      arquiteto: 'Leonardo Ribeiro'
    },
    imagens_3d: { total: 30, por_casa: 15 },
    assistencia_tecnica: { visitas_maximas: 36, frequencia: 'quinzenal', valor_por_visita: 500 }
  }
}

// Mapping de IDs para códigos de projeto
export const projectsMap = {
  1: 'GA00402', 2: 'GA00413', 3: 'GA00414', 4: 'GA00425',
  5: 'GA00433', 6: 'GA00461', 7: 'GA00462', 8: 'GA00464',
  9: 'GA00466', 10: 'GA00469', 11: 'GA00473', 12: 'GA00484',
  13: 'GA00485', 14: 'GA00489', 15: 'GA00491', 16: 'GA00492'
}

// Função helper para obter dados de amostra
export const getSampleProject = (codigo) => {
  return sampleProjectData[codigo] || null
}
