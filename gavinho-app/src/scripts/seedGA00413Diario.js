// Script para inserir entradas do Diário de Bordo - GA00413 (Oeiras House S+K)
// Execute este script através da página AdminSeed
// Dados extraídos das reuniões de coordenação de obra

// Categorias por especialidade (serão criadas se não existirem)
export const especialidadeCategorias = [
  { nome: 'Estruturas', cor: '#8B7355', icone: 'Building2', ordem: 10 },
  { nome: 'Arquitetura', cor: '#6B8E9B', icone: 'Home', ordem: 11 },
  { nome: 'AVAC', cor: '#7A9E7A', icone: 'Wind', ordem: 12 },
  { nome: 'Segurança', cor: '#B88A8A', icone: 'Shield', ordem: 13 },
  { nome: 'Elevador', cor: '#9B8AB8', icone: 'ArrowUpDown', ordem: 14 },
  { nome: 'Energia', cor: '#C9A882', icone: 'Zap', ordem: 15 },
  { nome: 'Piso Radiante', cor: '#D4A574', icone: 'Thermometer', ordem: 16 },
  { nome: 'Hidráulica', cor: '#5F8A8B', icone: 'Droplets', ordem: 17 },
  { nome: 'Paisagismo', cor: '#7A9E7A', icone: 'TreePine', ordem: 18 },
  { nome: 'Infraestrutura', cor: '#8A9EB8', icone: 'Network', ordem: 19 },
  { nome: 'Acústica', cor: '#A08090', icone: 'Volume2', ordem: 20 },
  { nome: 'Caixilharia', cor: '#8B8A7A', icone: 'Square', ordem: 21 },
  { nome: 'Cozinha', cor: '#C9A882', icone: 'UtensilsCrossed', ordem: 22 },
]

// Tags para estados (serão criadas se não existirem)
export const estadoTags = [
  { nome: 'Informação', cor: '#8A9EB8' },
  { nome: 'Pendente', cor: '#C9A882' },
  { nome: 'Decisão', cor: '#7A9E7A' },
  { nome: 'Bloqueio', cor: '#B88A8A' },
  { nome: 'Em Execução', cor: '#6B8E9B' },
  { nome: 'Em Estudo', cor: '#9B8AB8' },
]

// Entradas do diário extraídas das reuniões de coordenação
export const entradasDiarioGA00413 = [
  // Estruturas
  { data: '2025-12-04', especialidade: 'Estruturas', descricao: 'Rampa pedonal tem base em betão (forma de U fechado). IMPACTO: Não é permeável.', responsavel: 'GAPRES', estado: 'Informação' },
  { data: '2025-12-04', especialidade: 'Estruturas', descricao: 'Verificar com Eng. Filipe o que já está construído antes de propor alterações.', responsavel: 'AZIBUILD', estado: 'Pendente' },
  { data: '2025-12-18', especialidade: 'Estruturas', descricao: 'DECISÃO: Área técnica reduzida — muro alterado de 1.30m para 1.50m entre faces.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Estruturas', descricao: 'Rampa pedonal: fundação do muro já executada com cotas elevadas.', responsavel: 'Empreiteiro', estado: 'Informação' },
  { data: '2025-12-18', especialidade: 'Estruturas', descricao: 'Canteiro junto ao muro pode provocar impulso de terra — necessário recalcular.', responsavel: 'GAPRES', estado: 'Pendente' },
  { data: '2026-01-08', especialidade: 'Estruturas', descricao: 'Sapata MS5 tem cotas diferentes (61 vs 58.80) — ERRO DE PROJETO.', responsavel: 'GAPRES', estado: 'Bloqueio' },
  { data: '2026-01-08', especialidade: 'Estruturas', descricao: 'Muro de suporte zona S5 (P18-P19-P20) — talude exposto, aguarda solução.', responsavel: 'GAPRES', estado: 'Bloqueio' },
  { data: '2026-01-08', especialidade: 'Estruturas', descricao: 'Empreiteiro executou estacas para segunda fundação (à conta dele) para cota original.', responsavel: 'Empreiteiro', estado: 'Informação' },
  { data: '2026-01-08', especialidade: 'Estruturas', descricao: 'Estacas terão de ser picadas para levar fundação mais abaixo.', responsavel: 'GAPRES', estado: 'Pendente' },
  { data: '2026-01-08', especialidade: 'Estruturas', descricao: 'DECISÃO: Vão da escada muda de RETANGULAR para CIRCULAR nos pisos 0 e 1.', responsavel: 'Cliente + GAVINHO', estado: 'Decisão' },
  { data: '2026-01-08', especialidade: 'Estruturas', descricao: 'DECISÃO: Pilares existentes NÃO serão alterados — apenas negativo da laje.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-09', especialidade: 'Estruturas', descricao: 'Sonangil enviou levantamento elementos executados: estacas Ø600, maciços, lintéis, muros.', responsavel: 'Sonangil', estado: 'Informação' },
  { data: '2026-01-09', especialidade: 'Estruturas', descricao: 'Projeto teve 7 REVISÕES sem coerência entre peças desenhadas.', responsavel: 'GAPRES', estado: 'Bloqueio' },
  { data: '2026-01-09', especialidade: 'Estruturas', descricao: 'Projeto só incluiu estacas moldadas e caves em 18/12 — NÃO existiam no projeto original.', responsavel: 'GAPRES', estado: 'Informação' },
  { data: '2026-01-09', especialidade: 'Estruturas', descricao: 'Empreiteiro seguiu cotas do terreno existente (discrepâncias com levantamento antigo).', responsavel: 'Sonangil', estado: 'Informação' },
  { data: '2026-01-12', especialidade: 'Estruturas', descricao: 'DECISÃO GAPRES: Zona técnica piso -2 fica à cota 58,95 (NÃO rebaixada).', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-12', especialidade: 'Estruturas', descricao: 'DECISÃO GAPRES: Entrada zona técnica por porta no muro MS5 (1.20×2.10m).', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-12', especialidade: 'Estruturas', descricao: 'DECISÃO GAPRES: Porta eixo 1 (entre J-K) DEIXA DE EXISTIR — passa para K-L.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-12', especialidade: 'Estruturas', descricao: 'DECISÃO GAPRES: Parede Pb2 ocupa TODO o tramo J-K (toda a altura da moradia).', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-12', especialidade: 'Estruturas', descricao: 'DECISÃO GAPRES: Muro MS3 (eixo 7) prolongado até eixo M.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-12', especialidade: 'Estruturas', descricao: 'Pátio inglês: necessária ESTACA ADICIONAL no cruzamento H/5.', responsavel: 'GAPRES', estado: 'Pendente' },
  { data: '2026-01-12', especialidade: 'Estruturas', descricao: 'ALERTA: Estacas zona SUL muro poente NÃO asseguram estabilidade — reforço necessário.', responsavel: 'GAPRES', estado: 'Bloqueio' },
  { data: '2026-01-14', especialidade: 'Estruturas', descricao: 'Vigas consola (eixos 1 e 7) devem ALINHAR com vigas de empena da moradia.', responsavel: 'GAPRES', estado: 'Pendente' },
  { data: '2026-01-14', especialidade: 'Estruturas', descricao: 'DECISÃO: Parede eixo M (fundo piscina → piso 0) TEM QUE SER EM BETÃO.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-14', especialidade: 'Estruturas', descricao: 'Contrafortes no corte B NÃO estão de acordo com os executados.', responsavel: 'GAPRES', estado: 'Informação' },
  { data: '2026-01-14', especialidade: 'Estruturas', descricao: 'Fosso elevador moradia B: cota 61,45 (profundidade 0,55m) — aguarda confirmação.', responsavel: 'GAVINHO', estado: 'Pendente' },
  { data: '2026-01-15', especialidade: 'Estruturas', descricao: 'GAPRES com prazo 24h para solução muro S5. Cota fundo laje piso -2: 58.80.', responsavel: 'GAPRES', estado: 'Bloqueio' },
  { data: '2026-01-15', especialidade: 'Estruturas', descricao: 'ALERTA: Trabalhos a avançar SEM projeto final de estruturas.', responsavel: 'GAPRES', estado: 'Bloqueio' },
  { data: '2026-01-15', especialidade: 'Estruturas', descricao: 'Cofragem e ferro de fundações e muros sobre eixos K, J e H.', responsavel: 'Sonangil', estado: 'Em Execução' },
  { data: '2026-01-15', especialidade: 'Estruturas', descricao: 'DECISÃO: Eixo 1 — união pilar P2 à parede Pb2 com elemento único de betão.', responsavel: 'Sonangil + GAPRES', estado: 'Decisão' },
  { data: '2026-01-15', especialidade: 'Estruturas', descricao: 'Sonangil sugere levantamento topográfico por conta AZIBUILD.', responsavel: 'AZIBUILD', estado: 'Pendente' },
  { data: '2026-01-19', especialidade: 'Estruturas', descricao: 'Levantamento cotas muro POENTE recebido: variam de 57.15 a 62.90 (metro a metro).', responsavel: 'AZIBUILD', estado: 'Informação' },
  { data: '2026-01-19', especialidade: 'Estruturas', descricao: 'Levantamento cotas muro NASCENTE ainda em curso.', responsavel: 'AZIBUILD', estado: 'Em Execução' },
  { data: '2026-01-22', especialidade: 'Estruturas', descricao: 'DECISÃO: Sapata base a 80cm abaixo do terreno natural; topo a 40cm.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Estruturas', descricao: 'Estruturas podem adaptar-se ao perfil do paisagismo na moradia de cima.', responsavel: 'GAPRES', estado: 'Informação' },
  { data: '2026-01-22', especialidade: 'Estruturas', descricao: 'DECISÃO: Contrafortes vão ser CORRIGIDOS (documento assinado por Eng. Cansado Carvalho).', responsavel: 'GAPRES + Empreiteiro', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Estruturas', descricao: 'Parede do piso -2 já construída em betão — limita opções de ventilação.', responsavel: 'Empreiteiro', estado: 'Informação' },
  { data: '2026-01-22', especialidade: 'Estruturas', descricao: 'Elementos não conformes VÃO SER DEMOLIDOS — aguarda aprovação final da Shazia.', responsavel: 'Cliente', estado: 'Pendente' },

  // Arquitetura
  { data: '2026-01-07', especialidade: 'Arquitetura', descricao: 'Corredores piso 1 muito estreitos junto à escada.', responsavel: 'GAVINHO', estado: 'Informação' },
  { data: '2026-01-07', especialidade: 'Arquitetura', descricao: 'DECISÃO: Vão da escada CIRCULAR — permite passagem pelos dois lados do pilar.', responsavel: 'Cliente + GAVINHO', estado: 'Decisão' },
  { data: '2026-01-07', especialidade: 'Arquitetura', descricao: 'DECISÃO: Claraboia mantém-se RETANGULAR no topo.', responsavel: 'Cliente + GAVINHO', estado: 'Decisão' },
  { data: '2026-01-07', especialidade: 'Arquitetura', descricao: 'DECISÃO: Porta do quarto muda para ENTRADA DE FRENTE.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2026-01-07', especialidade: 'Arquitetura', descricao: 'Escada emergência: estudar passagem perimetral para eliminar segunda escada.', responsavel: 'GAVINHO', estado: 'Em Estudo' },
  { data: '2026-01-07', especialidade: 'Arquitetura', descricao: 'Verificar se área de construção ainda é viável após alterações.', responsavel: 'GAVINHO', estado: 'Pendente' },
  { data: '2026-01-12', especialidade: 'Arquitetura', descricao: 'GAVINHO analisará propostas GAPRES e verificará compatibilização com arquitetura.', responsavel: 'GAVINHO', estado: 'Pendente' },
  { data: '2026-01-13', especialidade: 'Arquitetura', descricao: 'Enviadas peças desenhadas (planta piso -2, cortes B e B4) para compatibilização.', responsavel: 'GAVINHO', estado: 'Informação' },
  { data: '2026-01-14', especialidade: 'Arquitetura', descricao: 'Enviadas plantas pisos -1 e 0 em formato DWG para GAPRES.', responsavel: 'GAVINHO', estado: 'Informação' },
  { data: '2026-01-22', especialidade: 'Arquitetura', descricao: 'Porta de acesso à zona técnica mudou de localização — impacta desenho das rampas.', responsavel: 'GAVINHO', estado: 'Informação' },
  { data: '2026-01-22', especialidade: 'Arquitetura', descricao: 'DECISÃO: GAVINHO criará selo \'BOM PARA CONSTRUÇÃO\' — empreiteiro só executa com este selo.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Arquitetura', descricao: 'DECISÃO: Qualquer alteração só válida se registada POR ESCRITO pela coordenação.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Arquitetura', descricao: 'Ines vai explicar situação à Shazia PESSOALMENTE até início próxima semana.', responsavel: 'GAVINHO + Cliente', estado: 'Pendente' },
  { data: '2026-01-22', especialidade: 'Arquitetura', descricao: 'COMPROMISSO: GAVINHO + GAPRES fornecem instruções ao Eng. Filipe nos próximos 2 DIAS.', responsavel: 'GAVINHO + GAPRES', estado: 'Pendente' },

  // AVAC
  { data: '2025-12-02', especialidade: 'AVAC', descricao: 'DECISÃO: Desumidificação piso -1 — solução INTEGRADA no sistema AVAC + VMC.', responsavel: 'AVAC', estado: 'Decisão' },
  { data: '2025-12-04', especialidade: 'AVAC', descricao: 'DECISÃO: Wine Cellar terá sistema de arrefecimento INDEPENDENTE.', responsavel: 'João Madeira', estado: 'Decisão' },
  { data: '2025-12-04', especialidade: 'AVAC', descricao: 'Ginásio (sauna + icebath): verificar se precisam ligações trifásicas.', responsavel: 'João Madeira', estado: 'Pendente' },
  { data: '2025-12-18', especialidade: 'AVAC', descricao: 'DECISÃO: Desumidificação zona elevador — extração a NÍVEL BAIXO.', responsavel: 'João Madeira', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'AVAC', descricao: 'DECISÃO: Condutas alteradas de REDONDAS para RETANGULARES.', responsavel: 'João Madeira', estado: 'Decisão' },
  { data: '2026-01-08', especialidade: 'AVAC', descricao: 'Conflito piso -1: viga + pé-direito baixo impede passagem de conduta.', responsavel: 'GAVINHO + AVAC', estado: 'Bloqueio' },
  { data: '2026-01-08', especialidade: 'AVAC', descricao: 'Solução proposta: subir conduta do -2 para -1 pelo lado do ginásio.', responsavel: 'João Madeira', estado: 'Em Estudo' },
  { data: '2026-01-22', especialidade: 'AVAC', descricao: 'VRF + bomba de calor precisam de FRENTE TOTALMENTE GRELHADA (~3.6m).', responsavel: 'João Madeira', estado: 'Informação' },
  { data: '2026-01-22', especialidade: 'AVAC', descricao: 'Recuperador de calor e monobloco: 2 condutas cada, distanciadas 5m.', responsavel: 'João Madeira', estado: 'Informação' },
  { data: '2026-01-22', especialidade: 'AVAC', descricao: 'Compatibilização de condutas nos pisos superiores em curso.', responsavel: 'GAVINHO', estado: 'Pendente' },

  // Segurança
  { data: '2025-12-04', especialidade: 'Segurança', descricao: 'Inclinação máxima rampas: bombeiros não acedem acima de ~25%.', responsavel: 'GAVINHO', estado: 'Informação' },
  { data: '2025-12-04', especialidade: 'Segurança', descricao: 'DECISÃO (licenciamento): Entradas de água no TOPO + saídas junto à CASA DE BAIXO.', responsavel: 'Especialidades', estado: 'Decisão' },
  { data: '2025-12-04', especialidade: 'Segurança', descricao: 'Verificar projeto aprovado ANPC.', responsavel: 'GAVINHO', estado: 'Pendente' },

  // Elevador
  { data: '2025-12-18', especialidade: 'Elevador', descricao: 'Elevador até rooftop: opção mantida em aberto. Decisão depende dos custos.', responsavel: 'Cliente + GAVINHO', estado: 'Em Estudo' },
  { data: '2025-12-18', especialidade: 'Elevador', descricao: 'DECISÃO CLIENTE: Se custos elevados, ABANDONA elevador. Alternativa: monta-pratos.', responsavel: 'Cliente', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Elevador', descricao: 'DECISÃO: Negativo estrutural MANTIDO para preservar opção.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Elevador', descricao: 'Caixa em vidro no rooftop: câmara NÃO aprovaria.', responsavel: 'GAVINHO', estado: 'Informação' },
  { data: '2026-01-14', especialidade: 'Elevador', descricao: 'Fosso elevador moradia B: cota tosco 61,45 (profundidade 0,55m) — confirmar.', responsavel: 'GAPRES', estado: 'Pendente' },

  // Energia
  { data: '2025-12-04', especialidade: 'Energia', descricao: 'Baterias: ainda falta dimensionar.', responsavel: 'João Madeira', estado: 'Pendente' },
  { data: '2026-01-07', especialidade: 'Energia', descricao: 'Painéis solares: risco de ultrapassar limite de altura.', responsavel: 'Especialidades', estado: 'Bloqueio' },
  { data: '2026-01-07', especialidade: 'Energia', descricao: 'DECISÃO CLIENTE: Se altura não permitida, alternativa é BOMBA DE CALOR.', responsavel: 'Cliente', estado: 'Decisão' },
  { data: '2026-01-07', especialidade: 'Energia', descricao: 'DECISÃO CLIENTE: NÃO aceita perder pé-direito para acomodar solar.', responsavel: 'Cliente', estado: 'Decisão' },

  // Piso Radiante
  { data: '2026-01-08', especialidade: 'Piso Radiante', descricao: 'Questão de altura do sistema.', responsavel: 'AVAC + Eng. Bessa', estado: 'Em Estudo' },
  { data: '2026-01-08', especialidade: 'Piso Radiante', descricao: 'DECISÃO CLIENTE: Prioridade é NÃO perder pé-direito.', responsavel: 'Cliente', estado: 'Decisão' },
  { data: '2026-01-08', especialidade: 'Piso Radiante', descricao: 'João Madeira a verificar custos com fornecedor Inherbes.', responsavel: 'João Madeira', estado: 'Pendente' },
  { data: '2026-01-08', especialidade: 'Piso Radiante', descricao: 'DECISÃO: Critério = solução que ROUBE MENOS ALTURA.', responsavel: 'Cliente', estado: 'Decisão' },

  // Hidráulica
  { data: '2025-11-27', especialidade: 'Hidráulica', descricao: 'Reunião Paisagismo + Hidráulica NÃO SE CONCRETIZOU — Arq. Manuel não compareceu.', responsavel: 'PROAP', estado: 'Informação' },
  { data: '2025-12-04', especialidade: 'Hidráulica', descricao: 'Consumos de rega enviados para GET dimensionar reservatório.', responsavel: 'PROAP', estado: 'Informação' },
  { data: '2026-01-12', especialidade: 'Hidráulica', descricao: 'DECISÃO GAPRES: Na zona da piscina (eixos M-N) manter solução de projeto.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-14', especialidade: 'Hidráulica', descricao: 'Tanque compensação: parede não centrada com eixo 1 — GAPRES sugere centrar.', responsavel: 'GAPRES', estado: 'Pendente' },
  { data: '2026-01-14', especialidade: 'Hidráulica', descricao: 'GAPRES vai incluir tanque de compensação nos desenhos.', responsavel: 'GAPRES', estado: 'Informação' },
  { data: '2025-12-18', especialidade: 'Hidráulica', descricao: 'DECISÃO: Zona plana entrada garagens fica 5cm ABAIXO da soleira.', responsavel: 'PROAP', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Hidráulica', descricao: 'Recolha de águas na base das rampas: a confirmar.', responsavel: 'João Madeira', estado: 'Pendente' },
  { data: '2026-01-07', especialidade: 'Hidráulica', descricao: 'PREOCUPAÇÃO CRÍTICA CLIENTE: Drenagem — risco de inundação garagens.', responsavel: 'Hidráulica', estado: 'Bloqueio' },
  { data: '2026-01-15', especialidade: 'Hidráulica', descricao: 'PISCINA FOGO B: fundo e paredes em execução — verificar infraestruturas no betão.', responsavel: 'Especialidades', estado: 'Bloqueio' },
  { data: '2026-01-22', especialidade: 'Hidráulica', descricao: 'Tanque de compensação: dimensões elevadas, pode não caber na área técnica.', responsavel: 'GET + GAVINHO', estado: 'Pendente' },
  { data: '2026-01-22', especialidade: 'Hidráulica', descricao: 'PISCINA: Eng. Filipe mandou PARAR armação de ferro do muro lateral.', responsavel: 'AZIBUILD', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Hidráulica', descricao: 'PISCINA: Definir pontos de iluminação, passa-muros, tratamento ANTES de betonar.', responsavel: 'Especialidades', estado: 'Bloqueio' },
  { data: '2026-01-22', especialidade: 'Hidráulica', descricao: 'GAVINHO a consultar empresas de piscinas para acompanhamento técnico.', responsavel: 'GAVINHO', estado: 'Em Estudo' },

  // Paisagismo
  { data: '2025-12-04', especialidade: 'Paisagismo', descricao: 'Rampas pedonais: inclinação 16-20% — necessário escadas intercaladas.', responsavel: 'PROAP', estado: 'Informação' },
  { data: '2025-12-04', especialidade: 'Paisagismo', descricao: 'Ferrari do cliente tem 11-12cm ao solo — concordâncias críticas.', responsavel: 'PROAP', estado: 'Informação' },
  { data: '2025-12-04', especialidade: 'Paisagismo', descricao: 'Permeabilidade: projeto no limite.', responsavel: 'GAVINHO', estado: 'Pendente' },
  { data: '2026-01-12', especialidade: 'Paisagismo', descricao: 'GAPRES aguarda definição final da rampa viária com base no que está executado.', responsavel: 'GAPRES', estado: 'Pendente' },
  { data: '2026-01-13', especialidade: 'Paisagismo', descricao: 'PROAP precisa cortes tipológicos dos muros para aferir altura de terra disponível.', responsavel: 'PROAP', estado: 'Pendente' },
  { data: '2026-01-14', especialidade: 'Paisagismo', descricao: 'DECISÃO: Zona sob escada exterior (eixos M-L) SEM FLOREIRA — laje ao nível 61,85.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2026-01-12', especialidade: 'Paisagismo', descricao: 'DECISÃO GAPRES: Floreira piso -1 (sobre zona técnica) máximo 0,60m de terra.', responsavel: 'GAPRES', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Paisagismo', descricao: 'DECISÃO: Canteiro junto ao muro pedonal NÃO É VIÁVEL.', responsavel: 'PROAP', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Paisagismo', descricao: 'DECISÃO: Solução alternativa APROVADA — murete-guarda com canteiro sobreelevado.', responsavel: 'PROAP + Cliente', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Paisagismo', descricao: 'DECISÃO: Profundidade mínima para árvores = 1 METRO. Espécies VERTICAIS.', responsavel: 'PROAP', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Paisagismo', descricao: 'Concordâncias rampas automóveis: Raio 10 — aguarda validação.', responsavel: 'PROAP', estado: 'Pendente' },
  { data: '2026-01-08', especialidade: 'Paisagismo', descricao: 'PROAP aguarda levantamento de cotas da obra para fechar inclinações.', responsavel: 'PROAP + Obra', estado: 'Pendente' },
  { data: '2026-01-22', especialidade: 'Paisagismo', descricao: 'Discrepância de cotas na casa de baixo: 61.80 vs 61.65.', responsavel: 'PROAP', estado: 'Pendente' },
  { data: '2026-01-22', especialidade: 'Paisagismo', descricao: 'DECISÃO: Aumentar lanços de ESCADAS e diminuir área de RAMPA.', responsavel: 'PROAP + Cliente', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Paisagismo', descricao: 'Banquetas vegetação (moradia cima): PROAP pode desenhar com sapata a 80cm.', responsavel: 'PROAP', estado: 'Pendente' },
  { data: '2026-01-22', especialidade: 'Paisagismo', descricao: 'DECISÃO: Carros de referência = PORSCHE 911 ou FERRARI F8.', responsavel: 'Cliente', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Paisagismo', descricao: 'Simulação de rampas: Eng. Filipe vai fazer com base nas dimensões dos carros.', responsavel: 'AZIBUILD', estado: 'Pendente' },
  { data: '2026-01-22', especialidade: 'Paisagismo', descricao: 'Verificar iluminação embutida nos muros ANTES de fechar topo.', responsavel: 'GAVINHO', estado: 'Pendente' },

  // Infraestrutura
  { data: '2025-12-02', especialidade: 'Infraestrutura', descricao: 'DECISÃO: Bastidores técnicos OBRIGATÓRIOS com UPS.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2025-12-02', especialidade: 'Infraestrutura', descricao: 'DECISÃO: Zonas técnicas OCULTAS em todos os pisos.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2025-12-18', especialidade: 'Infraestrutura', descricao: 'DECISÃO: Conduta para cabos Wi-Fi em TODOS OS PISOS.', responsavel: 'João Madeira', estado: 'Decisão' },
  { data: '2026-01-15', especialidade: 'Infraestrutura', descricao: 'Zona técnica (cota 58.80): avaliar subida da laje do pátio.', responsavel: 'GAVINHO', estado: 'Em Estudo' },
  { data: '2026-01-22', especialidade: 'Infraestrutura', descricao: 'Localização área técnica: DISCUSSÃO sobre corredor lateral vs todo o piso -2.', responsavel: 'GAVINHO + GET', estado: 'Bloqueio' },
  { data: '2026-01-22', especialidade: 'Infraestrutura', descricao: 'João Madeira: equipamentos podem ficar no corredor lateral, MAS VRF precisa frente grelhada.', responsavel: 'João Madeira', estado: 'Informação' },
  { data: '2026-01-22', especialidade: 'Infraestrutura', descricao: 'DECISÃO: Área técnica concentrada no retângulo superior; resto do piso -2 limpo.', responsavel: 'Cliente', estado: 'Decisão' },
  { data: '2026-01-22', especialidade: 'Infraestrutura', descricao: 'Laje térrea do piso -2: NÃO está licenciada. Decidir timing.', responsavel: 'Cliente + GAVINHO', estado: 'Pendente' },

  // Acústica
  { data: '2025-12-02', especialidade: 'Acústica', descricao: 'DECISÃO: Isolamento Studio/Lavandaria REJEITADO — não são adjacentes.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2025-12-02', especialidade: 'Acústica', descricao: 'DECISÃO: Vidro acústico Studio/Garage ACEITE.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2025-12-02', especialidade: 'Acústica', descricao: 'DECISÃO: Isolamento Master Suite/Quartos Crianças ACEITE.', responsavel: 'Especialidades', estado: 'Decisão' },

  // Caixilharia
  { data: '2025-12-02', especialidade: 'Caixilharia', descricao: 'DECISÃO: Portas Wine Cellar com VEDAÇÃO tipo caixilharia exterior.', responsavel: 'GAVINHO', estado: 'Decisão' },
  { data: '2025-12-02', especialidade: 'Caixilharia', descricao: 'DECISÃO: Janela acrílica piscina (Gym) — acessível pelo interior.', responsavel: 'GAVINHO', estado: 'Decisão' },

  // Cozinha
  { data: '2025-12-02', especialidade: 'Cozinha', descricao: 'DECISÃO: Exaustão DOWNDRAFT com filtro carvão ativado (SEM HOTTE).', responsavel: 'GAVINHO', estado: 'Decisão' },
]

// Função para inserir as categorias de especialidade
async function ensureEspecialidadeCategorias(supabase, addLog) {
  addLog('📂 Verificando categorias de especialidade...', 'info')

  for (const cat of especialidadeCategorias) {
    const { data: existing } = await supabase
      .from('diario_categorias')
      .select('id')
      .eq('nome', cat.nome)
      .single()

    if (!existing) {
      const { error } = await supabase
        .from('diario_categorias')
        .insert(cat)

      if (error) {
        addLog(`⚠️ Erro ao criar categoria ${cat.nome}: ${error.message}`, 'warning')
      } else {
        addLog(`✅ Categoria criada: ${cat.nome}`, 'success')
      }
    }
  }

  // Retornar mapa de categorias
  const { data: categorias } = await supabase
    .from('diario_categorias')
    .select('id, nome')

  return Object.fromEntries(categorias.map(c => [c.nome, c.id]))
}

// Função para inserir as tags de estado
async function ensureEstadoTags(supabase, addLog) {
  addLog('🏷️ Verificando tags de estado...', 'info')

  for (const tag of estadoTags) {
    const { data: existing } = await supabase
      .from('diario_tags')
      .select('id')
      .eq('nome', tag.nome)
      .single()

    if (!existing) {
      const { error } = await supabase
        .from('diario_tags')
        .insert(tag)

      if (error) {
        addLog(`⚠️ Erro ao criar tag ${tag.nome}: ${error.message}`, 'warning')
      } else {
        addLog(`✅ Tag criada: ${tag.nome}`, 'success')
      }
    }
  }

  // Retornar mapa de tags
  const { data: tags } = await supabase
    .from('diario_tags')
    .select('id, nome')

  return Object.fromEntries(tags.map(t => [t.nome, t.id]))
}

// Função principal para inserir as entradas do diário
export async function seedGA00413Diario(supabase, addLog = console.log) {
  addLog('🚀 Iniciando importação do Diário de Bordo GA00413...', 'info')

  // 1. Encontrar o projeto GA00413
  addLog('🔍 Procurando projeto GA00413...', 'info')

  const { data: projeto, error: projetoError } = await supabase
    .from('projetos')
    .select('id, codigo, nome')
    .eq('codigo', 'GA00413')
    .single()

  if (projetoError || !projeto) {
    addLog('❌ Projeto GA00413 não encontrado!', 'error')
    throw new Error('Projeto GA00413 não encontrado')
  }

  addLog(`✅ Projeto encontrado: ${projeto.nome} (ID: ${projeto.id})`, 'success')

  // 2. Garantir que as categorias existem
  const categoriasMap = await ensureEspecialidadeCategorias(supabase, addLog)

  // 3. Garantir que as tags existem
  const tagsMap = await ensureEstadoTags(supabase, addLog)

  // 4. Inserir as entradas do diário
  addLog(`📝 Inserindo ${entradasDiarioGA00413.length} entradas no diário...`, 'info')

  let inserted = 0
  let errors = 0

  for (const entrada of entradasDiarioGA00413) {
    // Criar título a partir da especialidade e estado
    const titulo = entrada.estado === 'Decisão'
      ? `[${entrada.especialidade}] ${entrada.descricao.substring(0, 100)}`
      : `[${entrada.especialidade}] ${entrada.descricao.substring(0, 100)}`

    const categoriaId = categoriasMap[entrada.especialidade]
    const tagId = tagsMap[entrada.estado]

    // Inserir entrada
    const { data: diarioEntry, error: insertError } = await supabase
      .from('projeto_diario')
      .insert({
        projeto_id: projeto.id,
        categoria_id: categoriaId,
        titulo: titulo,
        descricao: `${entrada.descricao}\n\nResponsável: ${entrada.responsavel}`,
        tipo: 'manual',
        fonte: 'reuniao_coordenacao',
        data_evento: new Date(entrada.data).toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Erro ao inserir:', entrada.descricao.substring(0, 50), insertError)
      errors++
      continue
    }

    // Associar tag
    if (diarioEntry && tagId) {
      await supabase
        .from('projeto_diario_tags')
        .insert({
          diario_id: diarioEntry.id,
          tag_id: tagId
        })
    }

    inserted++
  }

  addLog(`✅ ${inserted} entradas inseridas com sucesso!`, 'success')
  if (errors > 0) {
    addLog(`⚠️ ${errors} erros durante a inserção`, 'warning')
  }

  // 5. Resumo por especialidade
  addLog('📊 Resumo por especialidade:', 'info')
  const resumo = {}
  for (const entrada of entradasDiarioGA00413) {
    resumo[entrada.especialidade] = (resumo[entrada.especialidade] || 0) + 1
  }
  for (const [esp, count] of Object.entries(resumo).sort((a, b) => b[1] - a[1])) {
    addLog(`   ${esp}: ${count} entradas`, 'info')
  }

  return { inserted, errors, total: entradasDiarioGA00413.length }
}
