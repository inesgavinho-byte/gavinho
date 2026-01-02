import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  Building2,
  FileText,
  Euro,
  CheckCircle,
  Check,
  Clock,
  AlertCircle,
  ChevronRight,
  Download,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Layers,
  Target,
  TrendingUp,
  Receipt,
  CreditCard,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Share,
  Upload,
  X,
  Plus,
  File,
  ListChecks,
  FileCheck,
  Lock,
  Image,
  Star,
  Eye,
  ChevronDown,
  Package
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import ProjetoEntregaveis from '../components/ProjetoEntregaveis'
import ProjetoDocumentos from '../components/ProjetoDocumentos'

// Dados de exemplo baseados nos JSONs fornecidos
const sampleProjectData = {
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
          'Visitas mensais ÀƒÆ’À‚  obra',
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
      { prestacao: 1, descricao: 'Adjudicação (Fase 1)', data: '2025-05-26', valor: 25500, estado: 'pago', notas: 'Dedução de â‚¬24.500 de pagamentos anteriores' },
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
  },

  // ========== PROJETO 2B: OEIRAS HOUSE S (Casa 2) ==========
  'GA00414': {
    codigo: 'GA00414',
    codigo_nome: 'OEIRAS HOUSE S',
    referencia_proposta: 'POP.007.2025',
    proposta_original: 'POP.030.2021',
    nome: 'Oeiras House S',
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
    progresso: 20,
    cliente: {
      codigo: 'CLI_00120',
      nome: 'Sheliza Nazir Sadru Din',
      titulo: 'Sra.',
      tipo: 'Particular',
      documento: 'NIF: 241195322',
      email: 'sheliza@email.com',
      telefone: '+971 50 123 4567',
      morada: 'District One, Mohammed Bin Rashid City, Vila 618, Dubai',
      segmento: 'Internacional',
      idioma: 'Português',
      notas: 'Casa 2 do projeto - Faturação separada'
    },
    coordenacao_licenciamento: 'Frederico Valsassina Arquitetos (FVA)',
    servicos: [
      {
        tipo: 'Arquitetura de Interiores',
        descricao: 'Alterações ao Projeto Licenciado - Casa 2',
        fases: [
          { numero: 1, nome: 'Estudos de Layout / Revisão do Projeto', prazo: 'Concluída', status: 'concluida' },
          { numero: 2, nome: 'Projeto Base de Arquitetura e Interiores', prazo: '40 dias úteis', status: 'em_progresso',
            entregaveis: ['Plantas finais', 'Implantação mobiliário', 'Mapas Gerais', '15 Imagens 3D'] },
          { numero: 3, nome: 'Projeto de Execução de Arquitetura', prazo: '60 dias úteis', status: 'pendente' },
          { numero: 4, nome: 'Projeto de Execução de Interiores', prazo: '60 dias úteis', status: 'pendente' },
          { numero: 5, nome: 'Compatibilização de Projetos', prazo: '50 dias úteis', status: 'pendente' },
          { numero: 6, nome: 'Design de Interiores e Decoração', prazo: '60 dias úteis', status: 'pendente' },
          { numero: 7, nome: 'Assistência Técnica em Obra', prazo: '18 meses (36 visitas)', status: 'pendente' }
        ]
      }
    ],
    orcamento: {
      valor_total: 70000.00,
      moeda: 'EUR',
      iva: true,
      taxa_iva: 23,
      nota: 'Parte da Casa 2 no contrato global de â‚¬140.000'
    },
    pagamentos: [
      { prestacao: 1, descricao: 'Adjudicação (Fase 1)', data: '2025-05-26', valor: 12750, estado: 'pago' },
      { prestacao: 2, descricao: 'Entrega Projeto Base', data: '2025-07-15', valor: 11500, estado: 'faturado' },
      { prestacao: 3, descricao: 'Entrega Projeto Execução', data: '2025-10-15', valor: 10000, estado: 'pendente' },
      { prestacao: 4, descricao: 'Conclusão Compatibilização', data: '2026-01-15', valor: 10000, estado: 'pendente' },
      { prestacao: 5, descricao: 'Entrega Design Interiores', data: '2026-04-15', valor: 10000, estado: 'pendente' },
      { prestacao: 6, descricao: 'Conclusão Assistência Técnica', data: '2027-05-26', valor: 3500, estado: 'pendente' }
    ],
    financeiro: {
      total_contratado: 70000,
      total_faturado: 15682.50,
      total_pago: 12750,
      total_pendente: 54317.50
    },
    faturas: [
      { numero: 'FAC 1/450', data: '2025-05-25', valor: 15682.50, estado: 'emitido', descricao: '2ª Prestação - Projeto Base (com IVA)' }
    ],
    documentos: [
      { tipo: 'Proposta', nome: 'POP_007_2025_ASSINADA_GAVINHO.pdf', data: '2025-05-26', estado: 'assinado' },
      { tipo: 'Fatura', nome: 'Fatura_1_450.pdf', data: '2025-05-25', estado: 'emitido' }
    ],
    equipa: {
      project_manager: 'Maria Gavinho',
      designer: 'Leonor Traguil',
      arquiteto: 'Leonardo Ribeiro'
    },
    imagens_3d: { total: 15 },
    assistencia_tecnica: { visitas_maximas: 18, frequencia: 'quinzenal', valor_por_visita: 500 }
  },

  // ========== PROJETO 3: MAID'S QUARTERS - RESTELO VILLA ==========
  'GA00462': {
    codigo: 'GA00462',
    codigo_nome: 'RESTELO VILLA',
    referencia_proposta: 'POP.016.2025',
    proposta_original: 'POP.025.2024',
    tipo_documento: 'Aditamento nº1',
    nome: "Maid's Quarters - Alcolena",
    tipologia: 'Residencial',
    subtipo: 'Moradia',
    localizacao: {
      morada: 'Rua de Alcolena, nº5',
      cidade: 'Lisboa',
      zona: 'Restelo',
      codigo_postal: '1400-004',
      pais: 'Portugal'
    },
    datas: {
      data_proposta: '2025-08-01',
      data_assinatura: null,
      data_inicio: null,
      data_prevista: null
    },
    fase: 'Proposta',
    status: 'at_risk',
    progresso: 0,
    cliente: {
      codigo: 'CLI_00142',
      nome: 'Raphael Pultuskier',
      titulo: 'Dr.',
      tipo: 'Particular',
      documento: 'NIF: 310038332',
      email: 'raphael@email.com',
      telefone: '+351 912 345 678',
      segmento: 'Nacional',
      idioma: 'Português'
    },
    servicos: [
      {
        tipo: 'Direção e Fiscalização',
        descricao: 'Direção, Fiscalização e Coordenação do Projeto de Interiores',
        valor: 2250
      },
      {
        tipo: 'Fornecimento de Artigos Decorativos',
        descricao: 'Mapa de Artigos para Maid\'s Quarters',
        valor: 20297,
        itens: [
          { ref: '1.1', descricao: 'Cabeceira e sommier estofado 1,40x2,00m', valor: 2794 },
          { ref: '1.2', descricao: 'Mesa de cabeceira GAVINHO', valor: 1488 },
          { ref: '1.3', descricao: 'Candeeiro de pousar bege', valor: 240 },
          { ref: '1.4', descricao: 'Sofá reto 1,50m GAVINHO', valor: 3117.60 },
          { ref: '1.5', descricao: 'Mesa de apoio GAVINHO', valor: 1224 },
          { ref: '1.6', descricao: 'Mesa jantar redonda À˜80cm travertino', valor: 3740 },
          { ref: '1.7', descricao: 'Cadeira estofada DEDAR Libera (x2)', valor: 1788.60 },
          { ref: '1.8', descricao: 'Tapete pelo 2 alturas bege', valor: 1078 },
          { ref: '1.9', descricao: 'Calha + cortina Blackout bege (x2)', valor: 1724.80 },
          { ref: '1.10', descricao: 'Calha + cortina EVO Circulação P0', valor: 3102 }
        ]
      }
    ],
    orcamento: {
      valor_total: 22547.00,
      moeda: 'EUR',
      iva: true,
      taxa_iva: 23
    },
    pagamentos: [
      { prestacao: 1, descricao: 'Adjudicação (50%)', data: null, valor: 11273.50, estado: 'pendente' },
      { prestacao: 2, descricao: 'Contra-Entrega (50%)', data: null, valor: 11273.50, estado: 'pendente' }
    ],
    financeiro: {
      total_contratado: 22547,
      total_faturado: 0,
      total_pago: 0,
      total_pendente: 22547
    },
    faturas: [],
    documentos: [
      { tipo: 'Proposta', nome: 'POP_016_2025_Maids_Quarters.pdf', data: '2025-08-01', estado: 'pendente' }
    ],
    equipa: {
      project_manager: 'Maria Gavinho',
      designer: 'Carolina Cipriano',
      arquiteto: null
    }
  },

  // ========== PROJETO 4: AS HOUSE - MORADIA RESTELO THAIS ==========
  'GA00489': {
    codigo: 'GA00489',
    codigo_nome: 'AS HOUSE',
    referencia_proposta: 'POP.008.2025',
    nome: 'Moradia Restelo - António Saldanha',
    tipologia: 'Residencial',
    subtipo: 'Moradia',
    tipo_moradia: 'T4',
    localizacao: {
      morada: 'Rua António Saldanha, nº 63',
      cidade: 'Lisboa',
      zona: 'Restelo',
      codigo_postal: '1400-020',
      pais: 'Portugal'
    },
    caracteristicas: {
      area_terreno: 843,
      area_implantacao: 300.40,
      abc: 681,
      pisos_acima_soleira: 3,
      sotao: 1,
      cave: 1,
      lugares_garagem: 3
    },
    datas: {
      data_proposta: '2025-03',
      data_assinatura: '2025-03-03',
      data_inicio: '2025-03-03',
      data_prevista: '2026-06-03'
    },
    fase: 'Projeto',
    status: 'on_track',
    progresso: 15,
    cliente: {
      codigo: 'CLI_00143',
      nome: 'Thais Roberta Jacoia Manso',
      titulo: 'Sra.',
      tipo: 'Particular',
      documento: 'NIF: 289165091',
      email: 'thais@email.com',
      telefone: '+351 912 345 678',
      morada: 'Avenida Dom João II, 14, 3º Dto, 1990-091 Lisboa',
      segmento: 'Internacional',
      idioma: 'Português'
    },
    servicos: [
      {
        tipo: 'Design de Interiores Completo',
        descricao: 'Projeto de Assinatura GAVINHO',
        fases: [
          { numero: 1, nome: 'Estudo Prévio / Alterações Projeto', prazo: '40 dias úteis', status: 'em_progresso',
            entregaveis: ['Plantas dos pisos', 'Cortes e alçados interiores', 'Imagens 3D estudo (15)', 'Moodboard materiais'] },
          { numero: 2, nome: 'Projeto Base', prazo: '60 dias úteis', status: 'pendente',
            entregaveis: ['Plantas completas', 'Implantação mobiliário', 'Mapas Gerais', '15 Imagens 3D Finais'] },
          { numero: 3, nome: 'Apoio ao Projeto de Execução', prazo: '60 dias úteis', status: 'pendente',
            entregaveis: ['Desenhos Gerais 1:50', 'Mapas de Pormenor 1:20 a 1:5', 'Mapa de Acabamentos'] },
          { numero: 4, nome: 'Projeto Execução Design Interiores', prazo: '60 dias úteis', status: 'pendente',
            entregaveis: ['Desenhos técnicos peças decorativas', 'Seleção peças autorais', 'Tecidos e cortinas', 'Iluminação decorativa', 'Mapa quantidades'] }
        ]
      }
    ],
    orcamento: {
      valor_total: 40500.00,
      moeda: 'EUR',
      iva: true,
      taxa_iva: 23
    },
    pagamentos: [
      { prestacao: 1, descricao: 'Adjudicação (30%)', data: '2025-03-03', valor: 12150, estado: 'pendente' },
      { prestacao: 2, descricao: 'Aprovação Estudo Prévio (10%)', data: null, valor: 4050, estado: 'pendente' },
      { prestacao: 3, descricao: 'Entrega Projeto Base (20%)', data: null, valor: 8100, estado: 'pendente' },
      { prestacao: 4, descricao: 'Entrega Apoio Execução (15%)', data: null, valor: 6075, estado: 'pendente' },
      { prestacao: 5, descricao: 'Entrega Design Interiores (23%)', data: null, valor: 9315, estado: 'pendente' },
      { prestacao: 6, descricao: 'Conclusão Assistência (2%)', data: null, valor: 810, estado: 'pendente' }
    ],
    financeiro: {
      total_contratado: 40500,
      total_faturado: 0,
      total_pago: 0,
      total_pendente: 40500
    },
    faturas: [],
    documentos: [
      { tipo: 'Proposta', nome: 'POP_008_2025_THAIS_MANSO_ASSINADO.pdf', data: '2025-03-03', estado: 'assinado' }
    ],
    equipa: {
      project_manager: 'Maria Gavinho',
      designer: 'Ana Miranda',
      arquiteto: 'Leonardo Ribeiro'
    },
    imagens_3d: { estudo: 15, finais: 15, total: 30 },
    assistencia_tecnica: { visitas_maximas: 24, frequencia: 'quinzenal', valor_por_visita: 250 }
  },

  // ========== PROJETO 5: PRÀ‰DIO JOSÀ‰ ESTÀŠVÀƒO ==========
  'GA00491': {
    codigo: 'GA00491',
    referencia_proposta: 'POP.011.2025',
    nome: 'Prédio Urbano - Rua José Estêvão',
    tipologia: 'Residencial',
    subtipo: 'Prédio Urbano',
    numero_pisos: 5,
    numero_fogos: 5,
    composicao: 'R/C + 3 Pisos + ÀƒÆ’À‚guas-Furtadas',
    localizacao: {
      morada: 'Rua José Estêvão, Nº29',
      cidade: 'Lisboa',
      freguesia: 'Arroios',
      codigo_postal: '1150-200',
      pais: 'Portugal'
    },
    areas: {
      area_total_parcela: 321,
      area_coberta: 180,
      area_bruta_existente: 843.60,
      abc_proposta: 1080
    },
    datas: {
      data_proposta: '2025-07',
      data_assinatura: '2025-07-30',
      data_inicio: '2025-07-30',
      data_prevista: '2026-06-30'
    },
    fase: 'Projeto',
    status: 'on_track',
    progresso: 15,
    cliente: {
      codigo: 'CLI_00144',
      nome: 'Parâmetros e Memórias, Lda',
      tipo: 'Empresa',
      documento: 'NIF: 517460416',
      email: 'geral@parametros.pt',
      telefone: '+351 214 XXX XXX',
      morada: 'Rua Raul Chorão Ramalho, 52, 2790-254 Carnaxide',
      segmento: 'Nacional',
      idioma: 'Português'
    },
    servicos: [
      {
        tipo: 'Levantamentos',
        descricao: 'Levantamento Fotográfico, Topográfico, Arquitetónico + Modelo BIM',
        valor: 7500,
        fases: [
          { numero: 1, nome: 'Levantamentos + Modelo BIM', prazo: '10 dias úteis', status: 'concluida',
            entregaveis: ['Levantamento Fotográfico', 'Levantamento Topográfico 1/200', 'Levantamento Arquitetónico 1/100', 'Modelo BIM do existente', 'Modelo BIMx'] }
        ]
      },
      {
        tipo: 'Projeto de Arquitetura',
        descricao: 'Estudo Prévio, Projeto Base e Licenciamento',
        valor: 62670,
        fases: [
          { numero: 2, nome: 'Estudo Prévio', prazo: '20 dias úteis', status: 'em_progresso',
            entregaveis: ['Plantas dos pisos 1/100', 'Cortes e alçados', 'Moodboard materiais'] },
          { numero: 3, nome: 'Projeto Base', prazo: '30 dias úteis', status: 'pendente',
            entregaveis: ['Plantas existente/proposta 1/50', 'Tetos Refletidos', 'Pontos Elétricos', 'Iluminação', 'Revestimentos', '5 Imagens 3D finais'] },
          { numero: 4, nome: 'Licenciamento de Arquitetura', prazo: '60 dias úteis', status: 'pendente',
            entregaveis: ['Desenhos Gerais Existente', 'Desenhos Gerais Proposta', 'Cores Convencionais', 'Acessibilidades', 'Pormenores', 'Memória Descritiva', 'Quadro Sinótico'] }
        ]
      },
      {
        tipo: 'Especialidades',
        descricao: 'Projeto de Licenciamento de 16 Especialidades',
        valor: 30500,
        fases: [
          { numero: 5, nome: 'Especialidades', prazo: '60 dias úteis', status: 'pendente',
            entregaveis: ['Demolição', 'Estabilidade', 'ÀƒÆ’À‚guas', 'Esgotos', 'Gás', 'Eletricidade/Domótica', 'ITED', 'Térmico+PCE', 'AVAC/AQS', 'SCIE', 'Acústico', 'Eletromecânico', 'Intrusão/Videoporteiro', 'PSS'] }
        ]
      }
    ],
    orcamento: {
      valor_total: 92000.00,
      moeda: 'EUR',
      iva: true,
      taxa_iva: 23,
      desconto_comercial: 8670,
      subtotal_bruto: 100670
    },
    pagamentos: [
      { prestacao: 1, descricao: 'Adjudicação (35%)', data: '2025-07-30', valor: 32200, estado: 'pago' },
      { prestacao: 2, descricao: 'Entrega Estudo Prévio (10%)', data: '2025-08-30', valor: 9200, estado: 'pago' },
      { prestacao: 3, descricao: 'Entrega Projeto Base (15%)', data: null, valor: 13800, estado: 'pendente' },
      { prestacao: 4, descricao: 'Entrega Licenciamento Arq. (30%)', data: null, valor: 27600, estado: 'pendente' },
      { prestacao: 5, descricao: 'Aprovação + Licença Construção (10%)', data: null, valor: 9200, estado: 'pendente' }
    ],
    financeiro: {
      total_contratado: 92000,
      total_faturado: 41400,
      total_pago: 41400,
      total_pendente: 50600
    },
    faturas: [
      { numero: 'FAC 1/XXX', data: '2025-07-30', valor: 32200, estado: 'pago', descricao: '1ª Prestação - Adjudicação (35%)' },
      { numero: 'FAC 1/XXX', data: '2025-08-30', valor: 9200, estado: 'pago', descricao: '2ª Prestação - Estudo Prévio (10%)' }
    ],
    documentos: [
      { tipo: 'Proposta', nome: 'POP_011_2025_RUA_JOSE_ESTEVAO_ASSINADO.pdf', data: '2025-07-30', estado: 'assinado' }
    ],
    equipa: {
      project_manager: 'Maria Gavinho',
      designer: null,
      arquiteto: 'Leonardo Ribeiro'
    },
    imagens_3d: { total: 5 }
  }
}

// Adicionar dados para os projetos existentes
const projectsMap = {
  1: 'GA00402', 2: 'GA00413', 3: 'GA00414', 4: 'GA00425',
  5: 'GA00433', 6: 'GA00461', 7: 'GA00462', 8: 'GA00464',
  9: 'GA00466', 10: 'GA00469', 11: 'GA00473', 12: 'GA00484',
  13: 'GA00485', 14: 'GA00489', 15: 'GA00491', 16: 'GA00492'
}

// ============================================
// COMPONENTE ARCHVIZ TAB
// ============================================
function ArchVizTab({ projetoId }) {
  const [renders, setRenders] = useState([])
  const [compartimentos, setCompartimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState(null)
  const [expandedCompartimentos, setExpandedCompartimentos] = useState({})
  const [uploading, setUploading] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState('')
  const [useCustomCompartimento, setUseCustomCompartimento] = useState(false)
  const [editingRender, setEditingRender] = useState(null)
  
  const [form, setForm] = useState({
    compartimento: '',
    compartimentoCustom: '',
    versao: '',
    nome: '',
    notas: ''
  })

  // Adicionar render rápido (com compartimento pré-preenchido)
  const quickAddRender = (compartimento) => {
    setForm({
      compartimento: compartimento,
      compartimentoCustom: '',
      versao: '',
      nome: '',
      notas: ''
    })
    setTempImageUrl('')
    setUseCustomCompartimento(false)
    setEditingRender(null)
    setShowModal(true)
  }

  // Download render
  const downloadRender = async (render) => {
    try {
      const response = await fetch(render.imagem_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${render.compartimento}_v${render.versao}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao descarregar:', err)
      // Fallback: abrir em nova tab
      window.open(render.imagem_url, '_blank')
    }
  }

  // Carregar dados
  useEffect(() => {
    if (projetoId) loadData()
  }, [projetoId])

  const loadData = async () => {
    try {
      const [rendersRes, compartimentosRes] = await Promise.all([
        supabase.from('projeto_archviz').select('*').eq('projeto_id', projetoId).order('compartimento').order('versao', { ascending: false }),
        supabase.from('archviz_compartimentos').select('*').order('ordem')
      ])
      
      if (rendersRes.data) setRenders(rendersRes.data)
      if (compartimentosRes.data) setCompartimentos(compartimentosRes.data)
      
      // Expandir todos os compartimentos por defeito
      const expanded = {}
      const uniqueComps = [...new Set(rendersRes.data?.map(r => r.compartimento) || [])]
      uniqueComps.forEach(c => expanded[c] = true)
      setExpandedCompartimentos(expanded)
    } catch (err) {
      console.error('Erro ao carregar ArchViz:', err)
    } finally {
      setLoading(false)
    }
  }

  // Agrupar renders por compartimento
  const rendersByCompartimento = renders.reduce((acc, render) => {
    if (!acc[render.compartimento]) acc[render.compartimento] = []
    acc[render.compartimento].push(render)
    return acc
  }, {})

  // Obter última versão de cada compartimento (para mostrar no card principal)
  const getLatestVersion = (compartimentoRenders) => {
    return compartimentoRenders.reduce((latest, r) => r.versao > latest.versao ? r : latest, compartimentoRenders[0])
  }

  // Obter versão final
  const getFinalVersion = (compartimentoRenders) => {
    return compartimentoRenders.find(r => r.is_versao_final)
  }

  // Upload de imagem
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${projetoId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('projeto-archviz')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('projeto-archviz').getPublicUrl(fileName)
      setTempImageUrl(urlData.publicUrl)
    } catch (err) {
      console.error('Erro upload:', err)
      alert('Erro ao fazer upload. Verifica se o bucket "projeto-archviz" existe.')
    } finally {
      setUploading(false)
    }
  }

  // Guardar render (novo ou edição)
  const handleSave = async () => {
    const compartimentoFinal = useCustomCompartimento ? form.compartimentoCustom : form.compartimento
    
    if (!compartimentoFinal || !tempImageUrl) {
      alert('Preenche o compartimento e faz upload da imagem')
      return
    }

    try {
      // Usar versão manual se fornecida, senão calcular próxima
      let versaoFinal = form.versao ? parseInt(form.versao) : null
      if (!versaoFinal && !editingRender) {
        const existingVersions = renders.filter(r => r.compartimento === compartimentoFinal)
        versaoFinal = existingVersions.length > 0 
          ? Math.max(...existingVersions.map(r => r.versao)) + 1 
          : 1
      }

      if (editingRender) {
        // Editar existente
        const { error } = await supabase.from('projeto_archviz')
          .update({
            compartimento: compartimentoFinal,
            nome: form.nome || null,
            versao: versaoFinal || editingRender.versao,
            imagem_url: tempImageUrl,
            notas: form.notas || null
          })
          .eq('id', editingRender.id)

        if (error) throw error
      } else {
        // Criar novo
        const { error } = await supabase.from('projeto_archviz').insert([{
          projeto_id: projetoId,
          compartimento: compartimentoFinal,
          nome: form.nome || null,
          versao: versaoFinal,
          imagem_url: tempImageUrl,
          notas: form.notas || null
        }])

        if (error) throw error
      }

      closeModal()
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar render')
    }
  }

  // Fechar modal
  const closeModal = () => {
    setShowModal(false)
    setEditingRender(null)
    setForm({ compartimento: '', compartimentoCustom: '', versao: '', nome: '', notas: '' })
    setTempImageUrl('')
    setUseCustomCompartimento(false)
  }

  // Marcar como versão final
  const toggleVersaoFinal = async (render) => {
    try {
      // Primeiro remove versão final de outros do mesmo compartimento
      await supabase.from('projeto_archviz')
        .update({ is_versao_final: false })
        .eq('projeto_id', projetoId)
        .eq('compartimento', render.compartimento)

      // Depois marca este como final (se não era)
      if (!render.is_versao_final) {
        await supabase.from('projeto_archviz')
          .update({ is_versao_final: true })
          .eq('id', render.id)
      }

      loadData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  // Editar render
  const openEditRender = (render) => {
    setEditingRender(render)
    setForm({
      compartimento: render.compartimento,
      compartimentoCustom: '',
      versao: render.versao.toString(),
      nome: render.nome || '',
      notas: render.notas || ''
    })
    setTempImageUrl(render.imagem_url)
    setUseCustomCompartimento(!compartimentos.find(c => c.nome === render.compartimento))
    setShowModal(true)
  }

  // Eliminar render
  const handleDeleteRender = async (renderId) => {
    if (!confirm('Tens a certeza que queres eliminar este render?')) return
    
    try {
      const { error } = await supabase
        .from('projeto_archviz')
        .delete()
        .eq('id', renderId)
      
      if (error) throw error
      loadData()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar render')
    }
  }

  // Formatar data
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><div className="loading-spinner" /></div>
  }

  const compartimentosComRenders = Object.keys(rendersByCompartimento)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            Visualizações 3D / Renders
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
            {renders.length} {renders.length === 1 ? 'imagem' : 'imagens'} em {compartimentosComRenders.length} {compartimentosComRenders.length === 1 ? 'compartimento' : 'compartimentos'}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Upload size={16} /> Adicionar Render
        </button>
      </div>

      {/* Empty State */}
      {compartimentosComRenders.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>ðŸ–¼ï¸</div>
          <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>
            Ainda não há renders para este projeto
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Upload size={16} /> Adicionar Primeiro Render
          </button>
        </div>
      ) : (
        /* Grid por Compartimento */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {compartimentosComRenders.map(compartimento => {
            const compRenders = rendersByCompartimento[compartimento]
            const latest = getLatestVersion(compRenders)
            const final = getFinalVersion(compRenders)
            const isExpanded = expandedCompartimentos[compartimento]
            const displayRender = final || latest

            return (
              <div key={compartimento} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header do Compartimento */}
                <div 
                  onClick={() => setExpandedCompartimentos(prev => ({ ...prev, [compartimento]: !prev[compartimento] }))}
                  style={{ 
                    padding: '16px 20px', 
                    background: 'var(--cream)', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ChevronDown 
                      size={18} 
                      style={{ 
                        transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s'
                      }} 
                    />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{compartimento}</span>
                    <span style={{ 
                      background: 'var(--stone)', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      fontSize: '11px',
                      color: 'var(--brown-light)'
                    }}>
                      {compRenders.length} {compRenders.length === 1 ? 'versão' : 'versões'}
                    </span>
                    {final && (
                      <span style={{ 
                        background: 'var(--success)', 
                        color: 'white',
                        padding: '2px 8px', 
                        borderRadius: '10px', 
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Star size={10} fill="white" /> Final
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); quickAddRender(compartimento); }}
                      title="Adicionar render a este compartimento"
                      style={{
                        background: 'var(--brown)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 300
                      }}
                    >
                      +
                    </button>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      Última: v{latest.versao}  –  {formatDate(latest.created_at)}
                    </div>
                  </div>
                </div>

                {/* Conteúdo Expandido - Grid de Versões */}
                {isExpanded && (
                  <div style={{ padding: '20px' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                      gap: '16px' 
                    }}>
                      {compRenders.map(render => (
                        <div 
                          key={render.id}
                          style={{
                            border: render.is_versao_final ? '2px solid var(--success)' : '1px solid var(--stone)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: 'white',
                            position: 'relative',
                            boxShadow: render.is_versao_final ? '0 4px 12px rgba(122, 158, 122, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          className="render-card"
                        >
                          {/* Imagem */}
                          <div 
                            onClick={() => setShowPreview(render)}
                            style={{
                              height: '160px',
                              background: `url(${render.imagem_url}) center/cover`,
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                          >
                            {/* Badge Versão */}
                            <div style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: render.is_versao_final ? 'var(--success)' : 'rgba(0,0,0,0.6)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backdropFilter: 'blur(4px)'
                            }}>
                              {render.is_versao_final && <Star size={10} fill="white" />}
                              v{render.versao}
                            </div>
                            
                            {/* Hover overlay */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.5)',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }} className="render-overlay">
                              <button style={{ 
                                background: 'white', 
                                border: 'none', 
                                borderRadius: '50%', 
                                width: '40px', 
                                height: '40px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                              }}>
                                <Eye size={18} style={{ color: 'var(--brown)' }} />
                              </button>
                            </div>
                          </div>

                          {/* Info */}
                          <div style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <div>
                                <div style={{ 
                                  fontWeight: 600, 
                                  fontSize: '14px',
                                  color: render.is_versao_final ? 'var(--success)' : 'var(--brown)',
                                  marginBottom: '2px'
                                }}>
                                  {render.is_versao_final ? '★ ' : ''}Versão {render.versao}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                                  {formatDate(render.created_at)}
                                </div>
                              </div>
                              {/* Botões de ação */}
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); downloadRender(render); }}
                                  title="Descarregar"
                                  style={{
                                    background: 'var(--cream)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Download size={14} style={{ color: 'var(--brown-light)' }} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleVersaoFinal(render); }}
                                  title={render.is_versao_final ? 'Remover como final' : 'Marcar como versão final'}
                                  style={{
                                    background: render.is_versao_final ? 'var(--warning)' : 'var(--cream)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Star 
                                    size={14} 
                                    fill={render.is_versao_final ? 'white' : 'none'}
                                    style={{ color: render.is_versao_final ? 'white' : 'var(--brown-light)' }}
                                  />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditRender(render); }}
                                  title="Editar"
                                  style={{
                                    background: 'var(--cream)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Edit size={14} style={{ color: 'var(--brown-light)' }} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteRender(render.id); }}
                                  title="Eliminar"
                                  style={{
                                    background: 'var(--cream)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Adicionar/Editar - Design Melhorado */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '16px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--stone)', padding: '20px 24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingRender ? 'Editar Render' : 'Adicionar Render'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Upload Imagem - Mais compacto */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                  Imagem do Render *
                </label>
                <div style={{
                  border: tempImageUrl ? '2px solid var(--success)' : '2px dashed var(--stone)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                  background: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  position: 'relative',
                  minHeight: '80px'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    disabled={uploading}
                  />
                  {tempImageUrl ? (
                    <>
                      <img src={tempImageUrl} alt="Preview" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '13px' }}>âœ“ Imagem carregada</div>
                        <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Clica para substituir</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Upload size={24} style={{ color: 'var(--brown-light)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                        {uploading ? 'A carregar...' : 'Clica ou arrasta para fazer upload'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 2 colunas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {/* Compartimento */}
                <div style={{ gridColumn: useCustomCompartimento ? '1' : '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                    Compartimento *
                  </label>
                  {!useCustomCompartimento ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        value={form.compartimento} 
                        onChange={e => setForm({ ...form, compartimento: e.target.value })}
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                      >
                        <option value="">Selecionar...</option>
                        {compartimentos.map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => setUseCustomCompartimento(true)}
                        style={{ padding: '10px 12px', background: 'var(--stone)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                        title="Escrever nome personalizado"
                      >
                        + Outro
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={form.compartimentoCustom}
                        onChange={e => setForm({ ...form, compartimentoCustom: e.target.value })}
                        placeholder="Ex: Suite Principal, WC 2..."
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                      />
                      <button 
                        type="button"
                        onClick={() => { setUseCustomCompartimento(false); setForm({ ...form, compartimentoCustom: '' }) }}
                        style={{ padding: '10px 12px', background: 'var(--stone)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Lista
                      </button>
                    </div>
                  )}
                </div>

                {/* Versão */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                    Nº Versão
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.versao}
                    onChange={e => setForm({ ...form, versao: e.target.value })}
                    placeholder="Auto"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--brown-light)', marginTop: '4px', display: 'block' }}>
                    Deixa vazio para auto
                  </span>
                </div>
              </div>

              {/* Nome / Descrição */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                  Nome / Descrição <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Vista da janela, Opção sofá cinza..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              {/* Notas */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                  Notas <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(opcional)</span>
                </label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  placeholder="Notas ou observações sobre esta versão..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--stone)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { setShowModal(false); setUseCustomCompartimento(false); setTempImageUrl(''); setForm({ compartimento: '', compartimentoCustom: '', versao: '', nome: '', notas: '' }) }} style={{ padding: '10px 20px', background: 'var(--stone)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={(!form.compartimento && !form.compartimentoCustom) || !tempImageUrl || uploading}
                style={{ 
                  padding: '10px 24px', 
                  background: ((!form.compartimento && !form.compartimentoCustom) || !tempImageUrl) ? 'var(--stone)' : 'var(--brown)', 
                  color: ((!form.compartimento && !form.compartimentoCustom) || !tempImageUrl) ? 'var(--brown-light)' : 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: ((!form.compartimento && !form.compartimentoCustom) || !tempImageUrl) ? 'not-allowed' : 'pointer', 
                  fontWeight: 600 
                }}
              >
                Adicionar Render
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(null)} style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              onClick={() => setShowPreview(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}
            >
              <X size={24} />
            </button>
            <img 
              src={showPreview.imagem_url} 
              alt={showPreview.nome || showPreview.compartimento}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <div style={{ color: 'white', textAlign: 'center', marginTop: '12px' }}>
              <div style={{ fontWeight: 600 }}>{showPreview.compartimento} - Versão {showPreview.versao}</div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>{formatDate(showPreview.created_at)}</div>
              {showPreview.is_versao_final && (
                <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--success)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
                  <Star size={12} fill="white" /> Versão Final
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS para hover */}
      <style>{`
        .render-overlay:hover { opacity: 1 !important; }
        div:hover > .render-overlay { opacity: 1 !important; }
        .render-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important; }
      `}</style>
    </div>
  )
}

// ============================================
// COMPONENTE GALERIA TAB - Imagens para Apresentações
// ============================================
function GaleriaTab({ projetoId }) {
  const [imagens, setImagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPreview, setShowPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [editingImage, setEditingImage] = useState(null)
  
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: ''
  })
  const [tempImageUrl, setTempImageUrl] = useState('')

  const CATEGORIAS = ['Conceito', 'Projeto', 'Execução', 'Final', 'Antes/Depois', 'Detalhes', 'Exterior', 'Outro']

  useEffect(() => {
    if (projetoId) loadData()
  }, [projetoId])

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('projeto_galeria')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('ordem')
        .order('created_at', { ascending: false })
      
      if (data) setImagens(data)
    } catch (err) {
      console.error('Erro ao carregar galeria:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `galeria/${projetoId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('projeto-archviz')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('projeto-archviz').getPublicUrl(fileName)
      setTempImageUrl(urlData.publicUrl)
    } catch (err) {
      console.error('Erro upload:', err)
      alert('Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!tempImageUrl && !editingImage) return

    try {
      if (editingImage) {
        // Update
        await supabase.from('projeto_galeria').update({
          titulo: form.titulo,
          descricao: form.descricao,
          categoria: form.categoria,
          imagem_url: tempImageUrl || editingImage.imagem_url
        }).eq('id', editingImage.id)
      } else {
        // Insert
        await supabase.from('projeto_galeria').insert([{
          projeto_id: projetoId,
          titulo: form.titulo,
          descricao: form.descricao,
          categoria: form.categoria,
          imagem_url: tempImageUrl,
          usar_em_apresentacao: true
        }])
      }

      closeModal()
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar imagem')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingImage(null)
    setForm({ titulo: '', descricao: '', categoria: '' })
    setTempImageUrl('')
  }

  const openEditModal = (img) => {
    setEditingImage(img)
    setForm({
      titulo: img.titulo || '',
      descricao: img.descricao || '',
      categoria: img.categoria || ''
    })
    setTempImageUrl('')
    setShowModal(true)
  }

  const toggleApresentacao = async (img) => {
    try {
      await supabase.from('projeto_galeria')
        .update({ usar_em_apresentacao: !img.usar_em_apresentacao })
        .eq('id', img.id)
      loadData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const deleteImage = async (img) => {
    if (!confirm('Eliminar esta imagem?')) return
    try {
      await supabase.from('projeto_galeria').delete().eq('id', img.id)
      loadData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const toggleSelect = (id) => {
    setSelectedImages(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const imagensParaApresentacao = imagens.filter(i => i.usar_em_apresentacao)

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><div className="loading-spinner" /></div>
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            Galeria do Projeto
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
            {imagens.length} {imagens.length === 1 ? 'imagem' : 'imagens'}  –  {imagensParaApresentacao.length} para apresentação
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedImages.length > 0 && (
            <button 
              onClick={() => setSelectedImages([])}
              style={{ padding: '8px 16px', background: 'var(--stone)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
            >
              Limpar ({selectedImages.length})
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={16} /> Adicionar Imagem
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--cream) 0%, var(--blush-light) 100%)', 
        padding: '16px 20px', 
        borderRadius: '12px', 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--blush)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image size={20} style={{ color: 'white' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)', marginBottom: '2px' }}>Imagens para Apresentação</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
            Clica na estrela para incluir/excluir imagens da apresentação do projeto
          </div>
        </div>
      </div>

      {/* Empty State */}
      {imagens.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>ðŸ“·</div>
          <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>
            Ainda não há imagens na galeria
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Upload size={16} /> Adicionar Primeira Imagem
          </button>
        </div>
      ) : (
        /* Grid de Imagens */
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '16px' 
        }}>
          {imagens.map(img => (
            <div 
              key={img.id}
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'white',
                border: selectedImages.includes(img.id) ? '2px solid var(--blush)' : '1px solid var(--stone)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
              className="galeria-card"
            >
              {/* Imagem */}
              <div 
                onClick={() => setShowPreview(img)}
                style={{
                  height: '180px',
                  background: `url(${img.imagem_url}) center/cover`,
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {/* Checkbox seleção */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(img.id) }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: selectedImages.includes(img.id) ? 'none' : '2px solid white',
                    background: selectedImages.includes(img.id) ? 'var(--blush)' : 'rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {selectedImages.includes(img.id) && <Check size={14} style={{ color: 'white' }} />}
                </button>

                {/* Badge Categoria */}
                {img.categoria && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 500,
                    backdropFilter: 'blur(4px)'
                  }}>
                    {img.categoria}
                  </div>
                )}

                {/* Indicador Apresentação */}
                {img.usar_em_apresentacao && (
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'var(--success)',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Star size={10} fill="white" /> APRESENTAÀ‡ÀƒO
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {img.titulo ? (
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brown)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {img.titulo}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', fontStyle: 'italic' }}>Sem título</div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                      {formatDate(img.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => toggleApresentacao(img)}
                      title={img.usar_em_apresentacao ? 'Remover da apresentação' : 'Incluir na apresentação'}
                      style={{
                        background: img.usar_em_apresentacao ? 'var(--warning)' : 'var(--cream)',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px'
                      }}
                    >
                      <Star size={14} fill={img.usar_em_apresentacao ? 'white' : 'none'} style={{ color: img.usar_em_apresentacao ? 'white' : 'var(--brown-light)' }} />
                    </button>
                    <button
                      onClick={() => openEditModal(img)}
                      style={{ background: 'var(--cream)', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                    >
                      <Edit size={14} style={{ color: 'var(--brown-light)' }} />
                    </button>
                    <button
                      onClick={() => deleteImage(img)}
                      style={{ background: 'var(--cream)', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                    >
                      <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                </div>
                {img.descricao && (
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.descricao}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', borderRadius: '16px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--stone)', padding: '20px 24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingImage ? 'Editar Imagem' : 'Adicionar Imagem'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
                  Imagem {!editingImage && '*'}
                </label>
                <div style={{
                  border: (tempImageUrl || editingImage?.imagem_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
                  borderRadius: '12px',
                  padding: '16px',
                  background: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  position: 'relative',
                  minHeight: '80px'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    disabled={uploading}
                  />
                  {(tempImageUrl || editingImage?.imagem_url) ? (
                    <>
                      <img src={tempImageUrl || editingImage?.imagem_url} alt="Preview" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '13px' }}>âœ“ Imagem carregada</div>
                        <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Clica para substituir</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Upload size={24} style={{ color: 'var(--brown-light)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                        {uploading ? 'A carregar...' : 'Clica ou arrasta'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Título */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Título</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Vista da sala..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              {/* Categoria */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Categoria</label>
                <select
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                >
                  <option value="">Selecionar...</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  placeholder="Notas sobre a imagem..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--stone)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={closeModal} style={{ padding: '10px 20px', background: 'var(--stone)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={!tempImageUrl && !editingImage?.imagem_url}
                style={{ 
                  padding: '10px 24px', 
                  background: (!tempImageUrl && !editingImage?.imagem_url) ? 'var(--stone)' : 'var(--brown)', 
                  color: (!tempImageUrl && !editingImage?.imagem_url) ? 'var(--brown-light)' : 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: (!tempImageUrl && !editingImage?.imagem_url) ? 'not-allowed' : 'pointer', 
                  fontWeight: 600 
                }}
              >
                {editingImage ? 'Guardar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(null)} style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              onClick={() => setShowPreview(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}
            >
              <X size={24} />
            </button>
            <img 
              src={showPreview.imagem_url} 
              alt={showPreview.titulo || 'Imagem'}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <div style={{ color: 'white', textAlign: 'center', marginTop: '12px' }}>
              {showPreview.titulo && <div style={{ fontWeight: 600 }}>{showPreview.titulo}</div>}
              {showPreview.categoria && <div style={{ fontSize: '13px', opacity: 0.8 }}>{showPreview.categoria}</div>}
            </div>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .galeria-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  )
}

// ============================================
// COMPONENTE ENTREGAS TAB - Registo de Entregas
// ============================================
function EntregasTab({ projetoId, projetoCodigo }) {
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEntrega, setEditingEntrega] = useState(null)
  const [expandedEntregas, setExpandedEntregas] = useState({})
  
  const [form, setForm] = useState({
    data_entrega: new Date().toISOString().split('T')[0],
    numero_entrega: '',
    titulo: '',
    conteudo: '',
    link: '',
    notas: ''
  })

  useEffect(() => {
    if (projetoId) loadData()
  }, [projetoId])

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('projeto_entregas')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('data_entrega', { ascending: false })
      
      if (data) {
        setEntregas(data)
        // Expandir todas por defeito
        const expanded = {}
        data.forEach(e => expanded[e.id] = true)
        setExpandedEntregas(expanded)
      }
    } catch (err) {
      console.error('Erro ao carregar entregas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.data_entrega || !form.titulo) {
      alert('Preenche a data e o título')
      return
    }

    try {
      if (editingEntrega) {
        await supabase.from('projeto_entregas').update({
          data_entrega: form.data_entrega,
          numero_entrega: form.numero_entrega,
          titulo: form.titulo,
          conteudo: form.conteudo,
          link: form.link,
          notas: form.notas
        }).eq('id', editingEntrega.id)
      } else {
        await supabase.from('projeto_entregas').insert([{
          projeto_id: projetoId,
          data_entrega: form.data_entrega,
          numero_entrega: form.numero_entrega,
          titulo: form.titulo,
          conteudo: form.conteudo,
          link: form.link,
          notas: form.notas
        }])
      }

      closeModal()
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar entrega')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEntrega(null)
    setForm({
      data_entrega: new Date().toISOString().split('T')[0],
      numero_entrega: '',
      titulo: '',
      conteudo: '',
      link: '',
      notas: ''
    })
  }

  const openEditModal = (entrega) => {
    setEditingEntrega(entrega)
    setForm({
      data_entrega: entrega.data_entrega || '',
      numero_entrega: entrega.numero_entrega || '',
      titulo: entrega.titulo || '',
      conteudo: entrega.conteudo || '',
      link: entrega.link || '',
      notas: entrega.notas || ''
    })
    setShowModal(true)
  }

  const deleteEntrega = async (entrega) => {
    if (!confirm('Eliminar este registo de entrega?')) return
    try {
      await supabase.from('projeto_entregas').delete().eq('id', entrega.id)
      loadData()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getNextEntregaNumber = () => {
    const numbered = entregas.filter(e => e.numero_entrega && e.numero_entrega.match(/Entrega \d+/))
    if (numbered.length === 0) return 'Entrega 01'
    const numbers = numbered.map(e => parseInt(e.numero_entrega.match(/\d+/)?.[0] || '0'))
    const max = Math.max(...numbers)
    return `Entrega ${String(max + 1).padStart(2, '0')}`
  }

  const toggleExpand = (id) => {
    setExpandedEntregas(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><div className="loading-spinner" /></div>
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '4px' }}>
            Registo de Entregas
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
            {entregas.length} {entregas.length === 1 ? 'entrega registada' : 'entregas registadas'}
          </p>
        </div>
        <button 
          onClick={() => {
            setForm({ ...form, numero_entrega: getNextEntregaNumber() })
            setShowModal(true)
          }} 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Nova Entrega
        </button>
      </div>

      {/* Empty State */}
      {entregas.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>ðŸ“¦</div>
          <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>
            Ainda não há entregas registadas
          </p>
          <button 
            onClick={() => {
              setForm({ ...form, numero_entrega: 'Entrega 01' })
              setShowModal(true)
            }} 
            className="btn btn-primary"
          >
            <Plus size={16} /> Registar Primeira Entrega
          </button>
        </div>
      ) : (
        /* Timeline de Entregas */
        <div style={{ position: 'relative' }}>
          {/* Linha vertical */}
          <div style={{
            position: 'absolute',
            left: '24px',
            top: '20px',
            bottom: '20px',
            width: '2px',
            background: 'var(--stone)',
            zIndex: 0
          }} />

          {/* Cards de Entregas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {entregas.map((entrega, idx) => {
              const isExpanded = expandedEntregas[entrega.id]
              const isMail = entrega.numero_entrega?.toLowerCase().includes('mail')
              
              return (
                <div key={entrega.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                  {/* Ponto na timeline */}
                  <div style={{
                    width: '50px',
                    display: 'flex',
                    justifyContent: 'center',
                    paddingTop: '16px',
                    zIndex: 1
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: isMail ? 'var(--blush)' : 'var(--brown)',
                      border: '3px solid white',
                      boxShadow: '0 0 0 2px var(--stone)'
                    }} />
                  </div>

                  {/* Card */}
                  <div 
                    style={{
                      flex: 1,
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid var(--stone)',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                    className="entrega-card"
                  >
                    {/* Header do Card */}
                    <div 
                      onClick={() => toggleExpand(entrega.id)}
                      style={{
                        padding: '14px 16px',
                        background: isMail ? 'var(--blush-light)' : 'var(--cream)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          background: isMail ? 'var(--blush)' : 'var(--brown)', 
                          color: 'white', 
                          padding: '4px 10px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: 600 
                        }}>
                          {formatDate(entrega.data_entrega)}
                        </div>
                        {entrega.numero_entrega && (
                          <span style={{ 
                            background: 'white', 
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: 600,
                            color: 'var(--brown)'
                          }}>
                            {entrega.numero_entrega}
                          </span>
                        )}
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                          {entrega.titulo}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {entrega.link && (
                          <a 
                            href={entrega.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ 
                              background: 'var(--brown)', 
                              color: 'white', 
                              padding: '4px 10px', 
                              borderRadius: '6px', 
                              fontSize: '11px',
                              fontWeight: 500,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ExternalLink size={12} /> LINK
                          </a>
                        )}
                        <ChevronDown 
                          size={18} 
                          style={{ 
                            color: 'var(--brown-light)',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }} 
                        />
                      </div>
                    </div>

                    {/* Conteúdo Expandido */}
                    {isExpanded && (
                      <div style={{ padding: '16px', borderTop: '1px solid var(--stone)' }}>
                        {entrega.conteudo ? (
                          <div style={{ marginBottom: entrega.notas ? '12px' : '0' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '8px', textTransform: 'uppercase' }}>
                              Elementos Enviados
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: 'var(--brown)', 
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {entrega.conteudo.split('\n').map((line, i) => (
                                <div key={i} style={{ 
                                  padding: '4px 0',
                                  borderBottom: i < entrega.conteudo.split('\n').length - 1 ? '1px dashed var(--stone)' : 'none'
                                }}>
                                  {line.startsWith('-') || line.startsWith(' – ') ? line : ` –  ${line}`}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', color: 'var(--brown-light)', fontStyle: 'italic' }}>
                            Sem descrição de elementos
                          </div>
                        )}

                        {entrega.notas && (
                          <div style={{ 
                            background: 'var(--cream)', 
                            padding: '10px 12px', 
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'var(--brown-light)'
                          }}>
                            <strong>Notas:</strong> {entrega.notas}
                          </div>
                        )}

                        {/* Ações */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--stone)' }}>
                          <button
                            onClick={() => openEditModal(entrega)}
                            style={{ background: 'var(--cream)', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Edit size={12} /> Editar
                          </button>
                          <button
                            onClick={() => deleteEntrega(entrega)}
                            style={{ background: 'var(--cream)', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', borderRadius: '16px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--stone)', padding: '20px 24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingEntrega ? 'Editar Entrega' : 'Registar Nova Entrega'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Data e Número */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Data da Entrega *</label>
                  <input
                    type="date"
                    value={form.data_entrega}
                    onChange={e => setForm({ ...form, data_entrega: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Número/Tipo</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={form.numero_entrega}
                      onChange={e => setForm({ ...form, numero_entrega: e.target.value })}
                      placeholder="Ex: Entrega 01"
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, numero_entrega: 'Entrega Mail' })}
                      style={{ padding: '10px', background: form.numero_entrega === 'Entrega Mail' ? 'var(--blush)' : 'var(--stone)', color: form.numero_entrega === 'Entrega Mail' ? 'white' : 'var(--brown)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}
                      title="Marcar como email"
                    >
                      Mail
                    </button>
                  </div>
                </div>
              </div>

              {/* Título */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Título / Descrição Breve *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Projeto Execução Arquitetura Suite 1909"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              {/* Conteúdo/Elementos */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
                  Elementos Enviados <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(um por linha)</span>
                </label>
                <textarea
                  value={form.conteudo}
                  onChange={e => setForm({ ...form, conteudo: e.target.value })}
                  rows={5}
                  placeholder="Projeto Suite 1909 - PDF + DWG&#10;MQT Suite 1909 - PDF&#10;Layout Elétrico - PDF"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
                />
              </div>

              {/* Link */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
                  Link <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(pasta ou ficheiros)</span>
                </label>
                <input
                  type="url"
                  value={form.link}
                  onChange={e => setForm({ ...form, link: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              {/* Notas */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Notas Adicionais</label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  placeholder="Ex: Piso 19 - Quarto 1910 - Suite 1909"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--stone)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={closeModal} style={{ padding: '10px 20px', background: 'var(--stone)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={!form.data_entrega || !form.titulo}
                style={{ 
                  padding: '10px 24px', 
                  background: (!form.data_entrega || !form.titulo) ? 'var(--stone)' : 'var(--brown)', 
                  color: (!form.data_entrega || !form.titulo) ? 'var(--brown-light)' : 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: (!form.data_entrega || !form.titulo) ? 'not-allowed' : 'pointer', 
                  fontWeight: 600 
                }}
              >
                {editingEntrega ? 'Guardar' : 'Registar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .entrega-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  )
}

export default function ProjetoDetalhe() {
  const { id, tab: urlTab } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState(urlTab || 'geral')
  const [showActions, setShowActions] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [documents, setDocuments] = useState(null)
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  
  // Estados para edição de cliente e equipa
  const [clientes, setClientes] = useState([])
  const [utilizadores, setUtilizadores] = useState([])
  const [equipaProjeto, setEquipaProjeto] = useState([])
  const [showEquipaModal, setShowEquipaModal] = useState(false)

  // Opções para selects
  const TIPOLOGIAS = ['Residencial', 'Comercial', 'Hospitality', 'Misto']
  const SUBTIPOS = ['Moradia', 'Apartamento', 'Edifício', 'Loja', 'Escritório', 'Hotel', 'Restaurante']
  const FASES = ['Proposta', 'Conceito', 'Projeto Base', 'Projeto Execução', 'Licenciamento', 'Concluído']
  const STATUS_OPTIONS = [
    { value: 'on_track', label: 'No Prazo' },
    { value: 'at_risk', label: 'Em Risco' },
    { value: 'delayed', label: 'Atrasado' },
    { value: 'on_hold', label: 'Em Espera' },
    { value: 'completed', label: 'Concluído' }
  ]

  // Abrir modal de edição
  const openEditModal = () => {
    if (!project) return
    setEditForm({
      nome: project.nome || '',
      tipologia: project.tipologia || 'Residencial',
      subtipo: project.subtipo || '',
      fase: project.fase || 'Conceito',
      status: project.status || 'on_track',
      progresso: project.progresso || 0,
      cliente_id: project.cliente_id || '',
      localizacao: typeof project.localizacao === 'string' 
        ? project.localizacao 
        : (project.localizacao?.morada || project.morada || ''),
      cidade: project.localizacao?.cidade || project.cidade || '',
      pais: project.localizacao?.pais || project.pais || 'Portugal',
      area_bruta: project.area_bruta || '',
      area_exterior: project.area_exterior || '',
      data_inicio: project.datas?.data_inicio || project.data_inicio || '',
      data_prevista: project.datas?.data_prevista || project.data_prevista || '',
      orcamento_atual: project.orcamento?.valor_total || project.orcamento_atual || '',
      notas: project.notas || ''
    })
    if (project.id) fetchEquipaProjeto(project.id)
    setShowEditModal(true)
  }

  // Guardar alterações
  const handleSaveProject = async () => {
    if (!project) return
    setSaving(true)
    
    try {
      const updateData = {
        nome: editForm.nome,
        tipologia: editForm.tipologia,
        subtipo: editForm.subtipo,
        fase: editForm.fase,
        status: editForm.status,
        cliente_id: editForm.cliente_id || null,
        morada: editForm.localizacao || null,
        cidade: editForm.cidade || null,
        pais: editForm.pais || null,
        area_bruta: parseFloat(editForm.area_bruta) || null,
        area_exterior: parseFloat(editForm.area_exterior) || null,
        data_inicio: editForm.data_inicio || null,
        data_prevista: editForm.data_prevista || null,
        orcamento_atual: parseFloat(editForm.orcamento_atual) || null,
        notas: editForm.notas || null
      }

      const { error } = await supabase
        .from('projetos')
        .update(updateData)
        .eq('codigo', project.codigo)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Buscar dados do novo cliente se mudou
      let clienteAtualizado = project.cliente
      if (editForm.cliente_id && editForm.cliente_id !== project.cliente_id) {
        const clienteSelecionado = clientes.find(c => c.id === editForm.cliente_id)
        if (clienteSelecionado) {
          clienteAtualizado = {
            codigo: clienteSelecionado.codigo,
            nome: clienteSelecionado.nome
          }
        }
      }

      // Atualizar estado local
      setProject(prev => ({
        ...prev,
        ...updateData,
        cliente_id: editForm.cliente_id,
        cliente: clienteAtualizado,
        localizacao: {
          ...prev.localizacao,
          morada: editForm.localizacao,
          cidade: editForm.cidade,
          pais: editForm.pais
        },
        datas: {
          ...prev.datas,
          data_inicio: editForm.data_inicio,
          data_prevista: editForm.data_prevista
        }
      }))

      setShowEditModal(false)
      alert('Projeto atualizado com sucesso!')
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert(`Erro ao guardar: ${err.message || JSON.stringify(err)}`)
    }
    
    setSaving(false)
  }

  // Sincronizar tab da URL com estado
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [urlTab])

  // Carregar clientes e utilizadores para edição
  useEffect(() => {
    const fetchClientesUtilizadores = async () => {
      try {
        const [clientesRes, utilizadoresRes] = await Promise.all([
          supabase.from('clientes').select('id, nome, codigo').order('nome'),
          supabase.from('utilizadores').select('id, nome, cargo, departamento, avatar_url').eq('ativo', true).order('nome')
        ])
        setClientes(clientesRes.data || [])
        setUtilizadores(utilizadoresRes.data || [])
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      }
    }
    fetchClientesUtilizadores()
  }, [])

  // Carregar equipa do projeto
  const fetchEquipaProjeto = async (projetoId) => {
    try {
      const { data } = await supabase
        .from('projeto_equipa')
        .select('*, utilizadores(id, nome, cargo, departamento, avatar_url)')
        .eq('projeto_id', projetoId)
      setEquipaProjeto(data || [])
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    }
  }

  // Adicionar membro À  equipa
  const handleAddMembro = async (utilizadorId, funcao) => {
    if (!project?.id) return
    try {
      const { error } = await supabase
        .from('projeto_equipa')
        .insert({
          projeto_id: project.id,
          utilizador_id: utilizadorId,
          funcao: funcao || 'Membro'
        })
      if (error) throw error
      fetchEquipaProjeto(project.id)
    } catch (err) {
      console.error('Erro ao adicionar membro:', err)
      alert(`Erro: ${err.message}`)
    }
  }

  // Remover membro da equipa
  const handleRemoveMembro = async (membroId) => {
    if (!confirm('Remover este membro da equipa?')) return
    try {
      const { error } = await supabase
        .from('projeto_equipa')
        .delete()
        .eq('id', membroId)
      if (error) throw error
      fetchEquipaProjeto(project.id)
    } catch (err) {
      console.error('Erro ao remover:', err)
    }
  }

  // Navegar para tab
  const handleTabChange = (tabId) => {
    navigate(`/projetos/${id}/${tabId}`, { replace: true })
    setActiveTab(tabId)
  }

  // Buscar projeto do Supabase com dados relacionados
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true)
        
        // Determinar código do projeto
        const projectCode = projectsMap[id] || id
        
        // Buscar projeto do Supabase
        const { data: projetoData, error: projetoError } = await supabase
          .from('projetos')
          .select('*')
          .eq('codigo', projectCode)
          .single()
        
        if (projetoError || !projetoData) {
          // Fallback para dados locais
          const localProject = sampleProjectData[projectCode] || sampleProjectData['GA00492']
          setProject(localProject)
          setLoading(false)
          return
        }
        
        // Buscar cliente
        let clienteData = null
        if (projetoData.cliente_id) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', projetoData.cliente_id)
            .single()
          clienteData = cliente
        }
        
        // Buscar serviços do projeto
        const { data: servicosData } = await supabase
          .from('projeto_servicos')
          .select('*')
          .eq('projeto_id', projetoData.id)
          .order('ordem')
        
        // Buscar fases para cada serviço
        let fasesData = []
        if (servicosData && servicosData.length > 0) {
          const servicoIds = servicosData.map(s => s.id)
          const { data: fases } = await supabase
            .from('servico_fases')
            .select('*')
            .in('servico_id', servicoIds)
            .order('ordem')
          fasesData = fases || []
          
          // Buscar entregáveis para cada fase
          if (fasesData.length > 0) {
            const faseIds = fasesData.map(f => f.id)
            const { data: entregaveis } = await supabase
              .from('fase_entregaveis')
              .select('*')
              .in('fase_id', faseIds)
              .order('ordem')
            
            // Anexar entregáveis ÀƒÆ’À‚ s fases
            fasesData = fasesData.map(fase => ({
              ...fase,
              entregaveis: (entregaveis || []).filter(e => e.fase_id === fase.id)
            }))
          }
          
          // Anexar fases aos serviços
          servicosData.forEach(servico => {
            servico.fases = fasesData.filter(f => f.servico_id === servico.id)
          })
        }
        
        // Buscar pagamentos
        const { data: pagamentosData } = await supabase
          .from('projeto_pagamentos')
          .select('*')
          .eq('projeto_id', projetoData.id)
          .order('prestacao_numero')
        
        // Buscar faturas
        const { data: faturasData } = await supabase
          .from('faturas')
          .select('*')
          .eq('projeto_id', projetoData.id)
          .order('data_emissao')
        
        // Buscar entregáveis do projeto para calcular progresso
        const { data: projetoEntregaveis } = await supabase
          .from('projeto_entregaveis')
          .select('status')
          .eq('projeto_id', projetoData.id)
        
        // Calcular progresso baseado nos entregáveis
        let progressoCalculado = projetoData.progresso || 0
        if (projetoEntregaveis && projetoEntregaveis.length > 0) {
          const total = projetoEntregaveis.length
          const concluidos = projetoEntregaveis.filter(e => 
            e.status === 'concluido' || e.status === 'aprovado'
          ).length
          progressoCalculado = Math.round((concluidos / total) * 100)
        }
        
        // Calcular financeiro
        const totalContratado = parseFloat(projetoData.orcamento_atual) || 0
        const totalPago = (pagamentosData || [])
          .filter(p => p.estado === 'pago')
          .reduce((sum, p) => sum + parseFloat(p.valor), 0)
        const totalFaturado = (faturasData || [])
          .filter(f => f.estado !== 'anulada')
          .reduce((sum, f) => sum + parseFloat(f.total), 0)
        const totalPendente = totalContratado - totalPago
        
        // Verificar se temos dados locais para complementar
        const localData = sampleProjectData[projectCode]
        
        // Construir objeto do projeto
        const fullProject = {
          // Dados base do Supabase
          ...projetoData,
          codigo: projetoData.codigo,
          nome: projetoData.nome,
          tipologia: projetoData.tipologia || 'Residencial',
          subtipo: projetoData.subtipo || 'Apartamento',
          tipo_apartamento: projetoData.tipo_apartamento,
          area_bruta: projetoData.area_bruta,
          area_exterior: projetoData.area_exterior,
          unidade_area: projetoData.unidade_area || 'm²',
          fase: projetoData.fase || 'Conceito',
          status: projetoData.status || 'on_track',
          progresso: progressoCalculado,
          
          // Localização
          localizacao: {
            morada: projetoData.morada || projetoData.localizacao,
            cidade: projetoData.localizacao,
            estado: projetoData.estado,
            codigo_postal: projetoData.codigo_postal,
            pais: projetoData.pais || 'Portugal'
          },
          
          // Datas
          datas: {
            data_proposta: projetoData.data_proposta,
            data_assinatura: projetoData.data_assinatura_contrato,
            data_inicio: projetoData.data_inicio,
            data_prevista: projetoData.data_prevista
          },
          
          // Cliente
          cliente: clienteData ? {
            codigo: clienteData.codigo,
            nome: clienteData.nome,
            titulo: '',
            tipo: clienteData.tipo || 'Particular',
            documento: clienteData.nif ? `NIF: ${clienteData.nif}` : '',
            email: clienteData.email,
            telefone: clienteData.telefone,
            morada: `${clienteData.morada || ''}, ${clienteData.codigo_postal || ''} ${clienteData.cidade || ''}`,
            segmento: clienteData.segmento || 'Nacional',
            idioma: clienteData.idioma || 'Português'
          } : {
            codigo: 'N/D',
            nome: projetoData.cliente_nome || 'Cliente',
            tipo: 'Particular'
          },
          
          // Serviços com fases (do Supabase ou fallback local)
          servicos: servicosData && servicosData.length > 0 ? servicosData : (localData?.servicos || []),
          
          // Pagamentos (do Supabase ou fallback local)
          pagamentos: (pagamentosData && pagamentosData.length > 0 ? pagamentosData : (localData?.pagamentos || [])).map(p => ({
            prestacao: p.prestacao_numero || p.prestacao,
            descricao: p.descricao,
            data: p.data_limite || p.data,
            valor: parseFloat(p.valor),
            estado: p.estado,
            data_pagamento: p.data_pagamento
          })),
          
          // Faturas (do Supabase ou fallback local)
          faturas: (faturasData && faturasData.length > 0 ? faturasData : (localData?.faturas || [])).map(f => ({
            numero: f.codigo || f.numero,
            descricao: f.descricao || f.referencia_cliente,
            data: f.data_emissao || f.data,
            valor_base: parseFloat(f.subtotal) || parseFloat(f.valor_base),
            iva: parseFloat(f.iva_valor) || parseFloat(f.iva),
            total: parseFloat(f.total),
            estado: f.estado
          })),
          
          // Financeiro calculado
          financeiro: {
            total_contratado: totalContratado,
            total_faturado: totalFaturado,
            total_pago: totalPago,
            total_pendente: totalPendente
          },
          
          // Orçamento
          orcamento: {
            valor_total: totalContratado,
            moeda: projetoData.orcamento_moeda || 'EUR',
            iva: !projetoData.orcamento_iva_isento,
            taxa_iva: 23
          },
          
          // Documentos (fallback local por agora)
          documentos: localData?.documentos || [],
          
          // Equipa (fallback local por agora)
          equipa: localData?.equipa || {
            project_manager: 'Maria Gavinho',
            designer: null,
            arquiteto: null
          }
        }
        
        setProject(fullProject)
        
      } catch (err) {
        console.error('Erro ao buscar projeto:', err)
        // Fallback para dados locais
        const projectCode = projectsMap[id] || id
        setProject(sampleProjectData[projectCode] || sampleProjectData['GA00492'])
      } finally {
        setLoading(false)
      }
    }
    
    fetchProject()
  }, [id])

  // Loading state
  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '3px solid var(--stone)', 
            borderTopColor: 'var(--gold)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>A carregar projeto...</p>
        </div>
      </div>
    )
  }
  
  // Projeto não encontrado
  if (!project) {
    return (
      <div className="fade-in" style={{ padding: '48px', textAlign: 'center' }}>
        <h2>Projeto não encontrado</h2>
        <button className="btn btn-secondary mt-lg" onClick={() => navigate('/projetos')}>
          Voltar aos Projetos
        </button>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track': return 'var(--success)'
      case 'at_risk': return 'var(--warning)'
      case 'blocked': return 'var(--error)'
      case 'pago': return 'var(--success)'
      case 'pendente': return 'var(--warning)'
      case 'em_progresso': return 'var(--info)'
      default: return 'var(--brown-light)'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'on_track': return 'No Prazo'
      case 'at_risk': return 'Em Risco'
      case 'blocked': return 'Bloqueado'
      case 'pago': return 'Pago'
      case 'pendente': return 'Pendente'
      case 'em_progresso': return 'Em Progresso'
      default: return status
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '"”'
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Inicializar documentos com os do projeto se ainda não foram carregados
  const projectDocs = documents || project.documentos

  // Função para abrir modal de upload (novo documento ou anexar versão assinada)
  const openUploadModal = (doc = null) => {
    setUploadingDoc(doc) // se doc != null, é para anexar versão assinada
    setShowUploadModal(true)
  }

  // Função para processar upload de ficheiro
  const handleFileUpload = (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Por favor selecione um ficheiro PDF.')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    
    if (uploadingDoc) {
      // Anexar versão assinada a documento existente
      const updatedDocs = projectDocs.map(doc => {
        if (doc.nome === uploadingDoc.nome) {
          return {
            ...doc,
            estado: 'assinado',
            ficheiro_assinado: file.name,
            data_assinatura: today
          }
        }
        return doc
      })
      setDocuments(updatedDocs)
    } else {
      // Novo documento
      const newDoc = {
        tipo: 'Documento',
        nome: file.name,
        data: today,
        estado: 'emitido',
        tamanho: file.size
      }
      setDocuments([...projectDocs, newDoc])
    }

    setShowUploadModal(false)
    setUploadingDoc(null)
    setDragOver(false)
  }

  // Handlers de drag & drop
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    handleFileUpload(file)
  }

  // Tabs - Contratos e Financeiro apenas visíveis para administração
  const allTabs = [
    { id: 'geral', label: 'Geral', icon: Layers },
    { id: 'entregaveis', label: 'Entregáveis', icon: ListChecks },
    { id: 'entregas', label: 'Entregas', icon: Package },
    { id: 'contratos', label: 'Contratos', icon: FileCheck, adminOnly: true },
    { id: 'fases', label: 'Fases & Entregas', icon: Target },
    { id: 'archviz', label: 'ArchViz', icon: Image },
    { id: 'galeria', label: 'Galeria', icon: Image },
    { id: 'financeiro', label: 'Financeiro', icon: Euro, adminOnly: true },
    { id: 'documentos', label: 'Documentos', icon: FileText }
  ]
  
  const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin())

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button 
          onClick={() => navigate('/projetos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--brown-light)',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '16px',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          Voltar aos Projetos
        </button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-md mb-sm">
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 700, 
                color: 'var(--blush-dark)',
                letterSpacing: '0.5px'
              }}>
                {project.codigo}
              </span>
              <span className="badge badge-gold">{project.fase}</span>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: `${getStatusColor(project.status)}15`,
                  color: getStatusColor(project.status),
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: getStatusColor(project.status)
                }} />
                {getStatusLabel(project.status)}
              </div>
            </div>
            <h1 className="page-title" style={{ marginBottom: '8px' }}>{project.nome}</h1>
            <div className="flex items-center gap-lg text-muted" style={{ fontSize: '13px' }}>
              <span className="flex items-center gap-xs">
                <Building2 size={14} />
                {project.tipologia}  –  {project.subtipo} {project.tipo_apartamento}
              </span>
              <span className="flex items-center gap-xs">
                <MapPin size={14} />
                {project.localizacao.cidade}, {project.localizacao.pais}
              </span>
              <span className="flex items-center gap-xs">
                <Layers size={14} />
                {project.area_bruta} {project.unidade_area}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            <button className="btn btn-secondary" onClick={openEditModal}>
              <Edit size={16} />
              Editar
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowActions(!showActions)}
                style={{ padding: '10px' }}
              >
                <MoreVertical size={18} />
              </button>
              {showActions && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--white)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--stone)',
                    minWidth: '180px',
                    zIndex: 100,
                    overflow: 'hidden'
                  }}
                >
                  {[
                    { icon: Copy, label: 'Duplicar Projeto' },
                    { icon: Share, label: 'Partilhar' },
                    { icon: Download, label: 'Exportar PDF' },
                    { icon: Trash2, label: 'Eliminar', danger: true }
                  ].map((action, i) => (
                    <button
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        fontSize: '13px',
                        color: action.danger ? 'var(--error)' : 'var(--brown)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <action.icon size={16} />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card mb-lg">
        <div className="flex items-center justify-between mb-md">
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brown)' }}>
            Progresso Global
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brown)' }}>
            {project.progresso}%
          </span>
        </div>
        <div className="progress-bar" style={{ height: '8px' }}>
          <div className="progress-fill" style={{ width: `${project.progresso}%` }} />
        </div>
        <div className="flex items-center justify-between mt-md text-muted" style={{ fontSize: '12px' }}>
          <span>Início: {formatDate(project.datas.data_inicio)}</span>
          <span>Previsão: {formatDate(project.datas.data_prevista)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div 
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          background: 'var(--cream)',
          padding: '4px',
          borderRadius: '12px',
          width: 'fit-content'
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--white)' : 'transparent',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
              color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'geral' && (
        <div className="grid grid-2" style={{ gap: '24px' }}>
          {/* Cliente */}
          <div className="card">
            <div className="flex items-center justify-between mb-lg">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Cliente
              </h3>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Ver Ficha
              </button>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              padding: '16px',
              background: 'var(--cream)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--blush), var(--blush-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--white)',
                fontWeight: 600,
                fontSize: '16px'
              }}>
                {project.cliente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                  {project.cliente.titulo} {project.cliente.nome}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  {project.cliente.codigo}  –  {project.cliente.tipo}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {project.cliente.email && (
                <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
                  <Mail size={14} />
                  {project.cliente.email}
                </div>
              )}
              {project.cliente.telefone && (
                <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
                  <Phone size={14} />
                  {project.cliente.telefone}
                </div>
              )}
              {(project.cliente.segmento || project.cliente.idioma) && (
                <div className="flex items-center gap-sm text-muted" style={{ fontSize: '13px' }}>
                  <Globe size={14} />
                  {project.cliente.segmento || 'Nacional'}  –  {project.cliente.idioma || 'Português'}
                </div>
              )}
              {!project.cliente.email && !project.cliente.telefone && (
                <div style={{ fontSize: '13px', color: 'var(--brown-light)', fontStyle: 'italic' }}>
                  Sem contactos registados
                </div>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
              Localização
            </h3>
            
            <div style={{
              padding: '16px',
              background: 'var(--cream)',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brown)', marginBottom: '8px' }}>
                {project.localizacao.morada}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                {project.localizacao.codigo_postal} {project.localizacao.cidade}
                {project.localizacao.estado && `, ${project.localizacao.estado}`}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                {project.localizacao.pais}
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                  Àrea Bruta
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                  {project.area_bruta} {project.unidade_area}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                  Àrea Exterior
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                  {project.area_exterior} {project.unidade_area}
                </div>
              </div>
            </div>
          </div>

          {/* Serviços Contratados */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
              Serviços Contratados
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {project.servicos.map((servico, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '20px',
                    background: 'var(--cream)',
                    borderRadius: '12px'
                  }}
                >
                  <div className="flex items-center justify-between mb-sm">
                    <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                      {servico.tipo}
                    </div>
                    {servico.data_fim && (
                      <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                        Até {formatDate(servico.data_fim)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '12px' }}>
                    {servico.descricao}
                  </div>
                  
                  {servico.inclui && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {servico.inclui.map((item, i) => (
                        <span 
                          key={i}
                          style={{
                            padding: '4px 10px',
                            background: 'var(--white)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: 'var(--brown)'
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Equipa */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
              Equipa do Projeto
            </h3>
            
            {equipaProjeto.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {equipaProjeto.map((membro, idx) => (
                  <div 
                    key={membro.id || idx}
                    style={{
                      padding: '16px',
                      background: 'var(--cream)',
                      borderRadius: '12px',
                      minWidth: '180px',
                      flex: '1 1 180px',
                      maxWidth: '280px'
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '8px' }}>
                      {membro.funcao}
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--brown)' }}>
                      {membro.utilizadores?.nome || 'Utilizador'}
                    </div>
                    {membro.utilizadores?.cargo && (
                      <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
                        {membro.utilizadores.cargo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-3" style={{ gap: '16px' }}>
                {[
                  { role: 'Project Manager', name: null },
                  { role: 'Designer de Interiores', name: null },
                  { role: 'Arquiteto', name: null }
                ].map((member, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '16px',
                      background: 'var(--cream)',
                      borderRadius: '12px',
                      opacity: 0.5
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '8px' }}>
                      {member.role}
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--brown)' }}>
                      Não atribuído
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Entregáveis */}
      {activeTab === 'entregaveis' && (
        <ProjetoEntregaveis projeto={project} />
      )}

      {/* Tab Contratos - Apenas Administração */}
      {activeTab === 'contratos' && isAdmin() && (
        <ProjetoDocumentos projeto={project} />
      )}

      {activeTab === 'fases' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '24px' }}>
            Fases do Design de Interiores
          </h3>
          
          {project.servicos[1]?.fases?.map((fase, idx) => (
            <div 
              key={idx}
              style={{
                padding: '24px',
                background: fase.status === 'em_progresso' ? 'var(--cream)' : 'transparent',
                borderRadius: '16px',
                marginBottom: '16px',
                border: fase.status === 'em_progresso' ? '2px solid var(--blush)' : '1px solid var(--stone)'
              }}
            >
              <div className="flex items-center justify-between mb-lg">
                <div className="flex items-center gap-md">
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: fase.status === 'em_progresso' ? 'var(--blush)' : 
                                fase.status === 'concluido' ? 'var(--success)' : 'var(--stone)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: fase.status === 'pendente' ? 'var(--brown-light)' : 'var(--white)',
                    fontWeight: 700,
                    fontSize: '14px'
                  }}>
                    {fase.status === 'concluido' ? <CheckCircle size={18} /> : fase.numero}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                      Fase {fase.numero}: {fase.nome}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      Prazo: {fase.prazo}
                    </div>
                  </div>
                </div>
                <div 
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: `${getStatusColor(fase.status)}15`,
                    color: getStatusColor(fase.status),
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {getStatusLabel(fase.status)}
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '10px',
                marginLeft: '52px'
              }}>
                {fase.entregaveis.map((item, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-sm"
                    style={{ fontSize: '13px', color: 'var(--brown-light)' }}
                  >
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--stone-dark)'
                    }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab ArchViz - Renders e Visualizações */}
      {activeTab === 'archviz' && (
        <ArchVizTab projetoId={project.id} />
      )}

      {/* Tab Galeria - Imagens para Apresentações */}
      {activeTab === 'galeria' && (
        <GaleriaTab projetoId={project.id} />
      )}

      {/* Tab Entregas - Registo de Entregas ao Cliente */}
      {activeTab === 'entregas' && (
        <EntregasTab projetoId={project.id} projetoCodigo={project.codigo} />
      )}

      {/* Tab Financeiro - Apenas Administração */}
      {activeTab === 'financeiro' && isAdmin() && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPIs Financeiros */}
          <div className="grid grid-4" style={{ gap: '16px' }}>
            {[
              { label: 'Total Contratado', value: project.financeiro.total_contratado, color: 'var(--brown)' },
              { label: 'Total Faturado', value: project.financeiro.total_faturado, color: 'var(--info)' },
              { label: 'Total Pago', value: project.financeiro.total_pago, color: 'var(--success)' },
              { label: 'Total Pendente', value: project.financeiro.total_pendente, color: 'var(--warning)' }
            ].map((kpi, idx) => (
              <div key={idx} className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '8px' }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color }}>
                  {formatCurrency(kpi.value)}
                </div>
              </div>
            ))}
          </div>

          {/* Plano de Pagamentos */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '20px' }}>
              Plano de Pagamentos
            </h3>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--stone)', fontSize: '12px', color: 'var(--brown-light)', fontWeight: 600 }}>Prestação</th>
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--stone)', fontSize: '12px', color: 'var(--brown-light)', fontWeight: 600 }}>Descrição</th>
                  <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--stone)', fontSize: '12px', color: 'var(--brown-light)', fontWeight: 600 }}>Data Limite</th>
                  <th style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--stone)', fontSize: '12px', color: 'var(--brown-light)', fontWeight: 600 }}>Valor</th>
                  <th style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid var(--stone)', fontSize: '12px', color: 'var(--brown-light)', fontWeight: 600 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {project.pagamentos.map((pag, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--stone)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--brown)' }}>
                      #{pag.prestacao}
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--brown)' }}>
                      {pag.descricao}
                    </td>
                    <td style={{ padding: '14px 12px', color: 'var(--brown-light)', fontSize: '13px' }}>
                      {formatDate(pag.data)}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--brown)' }}>
                      {formatCurrency(pag.valor)}
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: `${getStatusColor(pag.estado)}15`,
                        color: getStatusColor(pag.estado),
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {pag.estado === 'pago' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {getStatusLabel(pag.estado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Faturas */}
          <div className="card">
            <div className="flex items-center justify-between mb-lg">
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
                Faturas Emitidas
              </h3>
              <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                <Receipt size={14} />
                Nova Fatura
              </button>
            </div>
            
            {project.faturas.map((fatura, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--cream)',
                  borderRadius: '12px'
                }}
              >
                <div className="flex items-center gap-md">
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Receipt size={18} style={{ color: 'var(--brown-light)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                      {fatura.numero}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      {fatura.descricao}  –  {formatDate(fatura.data)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-lg">
                  <div style={{ fontWeight: 600, color: 'var(--brown)' }}>
                    {formatCurrency(fatura.valor)}
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: `${getStatusColor(fatura.estado)}15`,
                    color: getStatusColor(fatura.estado),
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {getStatusLabel(fatura.estado)}
                  </span>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brown-light)',
                    cursor: 'pointer'
                  }}>
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="card">
          <div className="flex items-center justify-between mb-lg">
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
              Documentos do Projeto
            </h3>
            <button 
              className="btn btn-primary" 
              style={{ padding: '8px 14px', fontSize: '12px' }}
              onClick={() => openUploadModal()}
            >
              <Plus size={14} />
              Novo Documento
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projectDocs.map((doc, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--cream)',
                  borderRadius: '12px',
                  border: doc.estado === 'assinado' ? '1px solid var(--success)' : '1px solid transparent'
                }}
              >
                <div className="flex items-center gap-md">
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: doc.tipo === 'Proposta' ? 'rgba(138, 158, 184, 0.15)' : 
                                doc.estado === 'assinado' ? 'rgba(122, 158, 122, 0.15)' : 'var(--stone)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {doc.estado === 'assinado' ? (
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                    ) : (
                      <FileText size={18} style={{ color: doc.tipo === 'Proposta' ? 'var(--info)' : 'var(--brown-light)' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--brown)', fontSize: '14px' }}>
                      {doc.nome}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      {doc.tipo}  –  {formatDate(doc.data)}
                      {doc.ficheiro_assinado && (
                        <span style={{ color: 'var(--success)', marginLeft: '8px' }}>
                           –  Assinado: {doc.ficheiro_assinado}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  {/* Botão de anexar versão assinada - só aparece para documentos pendentes do tipo Proposta */}
                  {(doc.estado === 'pendente' || doc.estado === 'emitido') && doc.tipo === 'Proposta' && (
                    <button 
                      onClick={() => openUploadModal(doc)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--blush)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'var(--brown-dark)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Upload size={12} />
                      Anexar Assinada
                    </button>
                  )}
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: doc.estado === 'assinado' ? 'rgba(122, 158, 122, 0.15)' : 
                                doc.estado === 'pendente' ? 'rgba(201, 168, 130, 0.15)' : 'var(--stone)',
                    color: doc.estado === 'assinado' ? 'var(--success)' : 
                           doc.estado === 'pendente' ? 'var(--warning)' : 'var(--brown-light)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                    {doc.estado}
                  </span>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brown-light)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}>
                    <Download size={16} />
                  </button>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brown-light)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}>
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Àrea de upload rápido via drag & drop */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('doc-file-input')?.click()}
            style={{
              position: 'relative',
              marginTop: '24px',
              padding: '32px',
              border: `2px dashed ${dragOver ? 'var(--blush)' : 'var(--stone)'}`,
              borderRadius: '16px',
              background: dragOver ? 'rgba(195, 186, 175, 0.1)' : 'transparent',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            <Upload size={32} style={{ color: 'var(--brown-light)', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', color: 'var(--brown)', marginBottom: '4px' }}>
              Arraste um PDF aqui para adicionar
            </div>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
              ou clique para selecionar ficheiro
            </div>
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setShowUploadModal(false)
            setUploadingDoc(null)
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--white)',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div className="flex items-center justify-between mb-lg">
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
                {uploadingDoc ? 'Anexar Proposta Assinada' : 'Adicionar Documento'}
              </h3>
              <button 
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadingDoc(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brown-light)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {uploadingDoc && (
              <div style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>
                  Documento original:
                </div>
                <div style={{ fontWeight: 500, color: 'var(--brown)' }}>
                  {uploadingDoc.nome}
                </div>
              </div>
            )}

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                padding: '48px 32px',
                border: `2px dashed ${dragOver ? 'var(--blush)' : 'var(--stone)'}`,
                borderRadius: '16px',
                background: dragOver ? 'rgba(195, 186, 175, 0.1)' : 'var(--cream)',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--white)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <File size={28} style={{ color: 'var(--blush-dark)' }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--brown)', marginBottom: '8px' }}>
                {uploadingDoc ? 'Selecione o PDF assinado' : 'Selecione um ficheiro PDF'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                Arraste o ficheiro para aqui ou clique para selecionar
              </div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '8px' }}>
                Apenas ficheiros PDF
              </div>
            </div>

            <div className="flex items-center justify-end gap-sm" style={{ marginTop: '24px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadingDoc(null)
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Projeto */}
      {showEditModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div 
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflow: 'auto',
              margin: '20px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '20px 24px', 
              borderBottom: '1px solid var(--stone)' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Editar Projeto</h2>
              <button 
                onClick={() => setShowEditModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {/* Nome */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Nome do Projeto *
                </label>
                <input 
                  type="text" 
                  value={editForm.nome || ''} 
                  onChange={e => setEditForm({...editForm, nome: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              {/* Cliente */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Cliente
                </label>
                <select 
                  value={editForm.cliente_id || ''} 
                  onChange={e => setEditForm({...editForm, cliente_id: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                >
                  <option value="">Selecionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} {c.codigo ? `(${c.codigo})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Tipologia e Subtipo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Tipologia
                  </label>
                  <select 
                    value={editForm.tipologia || ''} 
                    onChange={e => setEditForm({...editForm, tipologia: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Subtipo
                  </label>
                  <select 
                    value={editForm.subtipo || ''} 
                    onChange={e => setEditForm({...editForm, subtipo: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    <option value="">Selecionar...</option>
                    {SUBTIPOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Fase e Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Fase
                  </label>
                  <select 
                    value={editForm.fase || ''} 
                    onChange={e => setEditForm({...editForm, fase: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    {FASES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Status
                  </label>
                  <select 
                    value={editForm.status || ''} 
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px'
                    }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Progresso */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Progresso: {editForm.progresso || 0}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={editForm.progresso || 0} 
                  onChange={e => setEditForm({...editForm, progresso: e.target.value})}
                  style={{ width: '100%' }} 
                />
              </div>

              {/* Localização */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Morada
                  </label>
                  <input 
                    type="text" 
                    value={editForm.localizacao || ''} 
                    onChange={e => setEditForm({...editForm, localizacao: e.target.value})}
                    placeholder="Rua, número..."
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Cidade
                  </label>
                  <input 
                    type="text" 
                    value={editForm.cidade || ''} 
                    onChange={e => setEditForm({...editForm, cidade: e.target.value})}
                    placeholder="Lisboa"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    País
                  </label>
                  <input 
                    type="text" 
                    value={editForm.pais || ''} 
                    onChange={e => setEditForm({...editForm, pais: e.target.value})}
                    placeholder="Portugal"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              {/* Àreas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Àrea Bruta (m²)
                  </label>
                  <input 
                    type="number" 
                    value={editForm.area_bruta || ''} 
                    onChange={e => setEditForm({...editForm, area_bruta: e.target.value})}
                    placeholder="0"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Àrea Exterior (m²)
                  </label>
                  <input 
                    type="number" 
                    value={editForm.area_exterior || ''} 
                    onChange={e => setEditForm({...editForm, area_exterior: e.target.value})}
                    placeholder="0"
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              {/* Datas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Data de Início
                  </label>
                  <input 
                    type="date" 
                    value={editForm.data_inicio || ''} 
                    onChange={e => setEditForm({...editForm, data_inicio: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    Data Prevista de Conclusão
                  </label>
                  <input 
                    type="date" 
                    value={editForm.data_prevista || ''} 
                    onChange={e => setEditForm({...editForm, data_prevista: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '1px solid var(--stone)', 
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }} 
                  />
                </div>
              </div>

              {/* Orçamento */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Orçamento (â‚¬)
                </label>
                <input 
                  type="number" 
                  value={editForm.orcamento_atual || ''} 
                  onChange={e => setEditForm({...editForm, orcamento_atual: e.target.value})}
                  placeholder="0"
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>

              {/* Notas */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                  Notas
                </label>
                <textarea 
                  value={editForm.notas || ''} 
                  onChange={e => setEditForm({...editForm, notas: e.target.value})}
                  rows={3}
                  placeholder="Notas adicionais sobre o projeto..."
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid var(--stone)', 
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }} 
                />
              </div>

              {/* Equipa do Projeto */}
              <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid var(--stone)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500 }}>
                    Equipa do Projeto
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowEquipaModal(true)}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--brown)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                
                {equipaProjeto.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--brown-light)', textAlign: 'center', padding: '16px', background: 'var(--cream)', borderRadius: '8px' }}>
                    Sem membros atribuídos
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {equipaProjeto.map(m => (
                      <div key={m.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'var(--cream)',
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'var(--brown)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          {m.utilizadores?.nome?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{m.utilizadores?.nome}</div>
                          <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>{m.funcao}</div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveMembro(m.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '4px',
                            color: 'var(--brown-light)'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              padding: '16px 24px', 
              borderTop: '1px solid var(--stone)', 
              background: 'var(--cream)' 
            }}>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="btn btn-outline"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveProject} 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Membro À  Equipa */}
      {showEquipaModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
          onClick={() => setShowEquipaModal(false)}
        >
          <div 
            style={{
              background: 'var(--white)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto',
              margin: '20px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '20px 24px', 
              borderBottom: '1px solid var(--stone)' 
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Adicionar À  Equipa</h2>
              <button 
                onClick={() => setShowEquipaModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '16px 24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '16px' }}>
                Selecione um colaborador para adicionar ao projeto
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
                {utilizadores
                  .filter(u => !equipaProjeto.some(e => e.utilizador_id === u.id))
                  .map(u => (
                    <div 
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'var(--cream)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--brown)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {u.nome?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>{u.nome}</div>
                          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                            {u.cargo || 'Sem cargo'}  –  {u.departamento || 'Sem departamento'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const funcao = prompt('Função no projeto:', u.cargo || 'Membro')
                          if (funcao !== null) {
                            handleAddMembro(u.id, funcao || 'Membro')
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--brown)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
                  
                {utilizadores.filter(u => !equipaProjeto.some(e => e.utilizador_id === u.id)).length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--brown-light)', padding: '24px' }}>
                    Todos os colaboradores já estão na equipa
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
