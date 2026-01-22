-- ============================================================================
-- GAVINHO Platform — Bíblia de Licenciamentos
-- Seed Data: Concelho de Sintra
-- ============================================================================
-- Este ficheiro contém todos os dados necessários para o módulo de
-- licenciamento urbanístico do concelho de Sintra.
--
-- Executar após criar as tabelas definidas na arquitectura técnica.
-- ============================================================================

-- ============================================================================
-- 1. CONCELHO
-- ============================================================================

INSERT INTO concelhos (id, codigo, nome, activo, data_referencia_normativa, versao_pdm, config, notas)
VALUES (
    'concelho_sintra_001',
    'sintra',
    'Sintra',
    true,
    '2024-01-01',
    'PDM 1999 (com alterações)',
    '{
        "instrumentos_aplicaveis": [
            "Plano Diretor Municipal de Sintra",
            "Regulamento Municipal de Urbanização e Edificação",
            "RJUE",
            "RJIGT"
        ],
        "entidades_externas": [
            {"codigo": "ICNF", "nome": "Instituto da Conservação da Natureza e das Florestas"},
            {"codigo": "APA", "nome": "Agência Portuguesa do Ambiente"},
            {"codigo": "DGADR", "nome": "Direção-Geral de Agricultura e Desenvolvimento Rural"},
            {"codigo": "DGPC", "nome": "Direção-Geral do Património Cultural"}
        ],
        "regimes_especificos": ["PNSC", "REN", "RAN", "Natura2000"]
    }',
    'Dados carregados a partir da Bíblia de Licenciamento GAVINHO v1.0'
);

-- ============================================================================
-- 2. MATRIZES DE DECISÃO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1. Matriz Solo × Uso — Solo Urbano (Matriz 3.1.A)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_solo_uso_urbano',
    'concelho_sintra_001',
    'solo_uso_urbano',
    'Matriz Solo × Uso — Solo Urbano',
    'Admissibilidade de usos por categoria de espaço urbano. Baseada no PDM de Sintra e interpretação técnica GAVINHO.',
    '{
        "espacos_centrais": {
            "uso_dominante": "misto",
            "habitacao": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "turismo": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "atividades_economicas": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "equipamentos": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            }
        },
        "espacos_habitacionais": {
            "uso_dominante": "habitacao",
            "habitacao": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional, tráfego, ruído e inserção urbana"
            },
            "atividades_economicas": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional, tráfego, ruído e inserção urbana"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional"
            }
        },
        "espacos_baixa_densidade": {
            "uso_dominante": "habitacao",
            "habitacao": {
                "admissibilidade": "condicionado",
                "notas": "Forte controlo volumétrico e sensibilidade paisagística"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Forte controlo volumétrico e sensibilidade paisagística"
            },
            "atividades_economicas": {
                "admissibilidade": "inviavel",
                "notas": "Regra geral não admissível. Apenas exceções fundamentadas e interesse público"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Forte controlo volumétrico e sensibilidade paisagística"
            }
        },
        "espacos_atividades_economicas": {
            "uso_dominante": "economico",
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Regra geral não admissível. Apenas exceções fundamentadas e interesse público"
            },
            "turismo": {
                "admissibilidade": "excecional",
                "notas": "Enquadramento excecional apenas"
            },
            "atividades_economicas": {
                "admissibilidade": "admissivel",
                "notas": "Sujeito a parâmetros urbanísticos e RUES"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige demonstração de compatibilidade funcional"
            }
        }
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.2. Matriz Solo × Uso — Solo Rústico (Matriz 3.1.B)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_solo_uso_rustico',
    'concelho_sintra_001',
    'solo_uso_rustico',
    'Matriz Solo × Uso — Solo Rústico',
    'Admissibilidade de usos por categoria de espaço rústico. Edificação funcional = estritamente ligada ao uso dominante.',
    '{
        "espacos_naturais": {
            "uso_dominante": "conservacao_ecologica",
            "edificacao_nova": {
                "admissibilidade": "inviavel",
                "notas": "Regra geral proibida"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "equipamentos": {
                "admissibilidade": "excecional",
                "notas": "Apenas infraestruturas essenciais e valorização ambiental"
            }
        },
        "espacos_florestais": {
            "uso_dominante": "producao_florestal",
            "edificacao_nova": {
                "admissibilidade": "funcional",
                "notas": "Apenas funcional e justificada para exploração florestal"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Apenas turismo compatível com função florestal"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige justificação funcional"
            }
        },
        "espacos_agricolas": {
            "uso_dominante": "producao_agricola",
            "edificacao_nova": {
                "admissibilidade": "funcional",
                "notas": "Estritamente associada à exploração agrícola"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Associado à exploração agrícola (agroturismo)"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Exige justificação funcional"
            }
        },
        "espacos_ocupacao_turistica": {
            "uso_dominante": "turismo",
            "edificacao_nova": {
                "admissibilidade": "condicionado",
                "notas": "Forte justificação territorial e ambiental exigida"
            },
            "habitacao": {
                "admissibilidade": "inviavel",
                "notas": "Não admissível"
            },
            "turismo": {
                "admissibilidade": "admissivel",
                "notas": "Regime próprio aplicável"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "Complementares ao uso turístico"
            }
        },
        "aglomerados_rurais": {
            "uso_dominante": "misto_limitado",
            "edificacao_nova": {
                "admissibilidade": "limitado",
                "notas": "Escala muito controlada"
            },
            "habitacao": {
                "admissibilidade": "condicionado",
                "notas": "Escala controlada, integração no aglomerado"
            },
            "turismo": {
                "admissibilidade": "condicionado",
                "notas": "Escala controlada"
            },
            "equipamentos": {
                "admissibilidade": "condicionado",
                "notas": "De proximidade apenas"
            }
        }
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.3. Matriz Pareceres Externos (Matriz 3.2)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_pareceres',
    'concelho_sintra_001',
    'pareceres_externos',
    'Matriz Solo × Uso × Necessidade de Parecer Externo',
    'Identificação de pareceres vinculativos e técnicos por regime aplicável.',
    '{
        "regimes": {
            "pnsc": {
                "ICNF": {"necessario": true, "natureza": "vinculativo"},
                "APA": {"necessario": "possivel", "natureza": "tecnico"},
                "DGPC": {"necessario": "se_patrimonio", "natureza": "vinculativo"}
            },
            "natura2000": {
                "ICNF": {"necessario": true, "natureza": "vinculativo"},
                "APA": {"necessario": "possivel", "natureza": "tecnico"},
                "DGPC": {"necessario": "se_patrimonio", "natureza": "vinculativo"}
            },
            "ren": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": true, "natureza": "vinculativo"},
                "DGPC": {"necessario": false}
            },
            "ran": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": false},
                "DGADR": {"necessario": true, "natureza": "vinculativo"},
                "DGPC": {"necessario": false}
            },
            "patrimonio_classificado": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": false},
                "DGPC": {"necessario": true, "natureza": "vinculativo"}
            },
            "arqueologia": {
                "ICNF": {"necessario": false},
                "APA": {"necessario": false},
                "DGPC": {"necessario": true, "natureza": "tecnico"}
            },
            "cheias": {
                "APA": {"necessario": true, "natureza": "tecnico"},
                "CMS": {"necessario": true, "natureza": "tecnico"}
            },
            "incendio": {
                "ICNF": {"necessario": true, "natureza": "tecnico"},
                "ANEPC": {"necessario": true, "natureza": "tecnico"}
            }
        }
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.4. Matriz Preexistências × Ampliação × Legalização (Matriz 3.4)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_preexistencias',
    'concelho_sintra_001',
    'preexistencias',
    'Matriz Preexistências × Ampliação × Legalização',
    'Regras para ampliação e legalização de edificações existentes. CRÍTICO: tema mais sensível do licenciamento em Sintra.',
    '{
        "definicao_preexistencia_valida": {
            "criterios": [
                "Edificação anterior à entrada em vigor do PDM de Sintra (1999)",
                "Possui título válido (licença, autorização, comunicação prévia eficaz)",
                "Dispõe de direito ou expectativa juridicamente protegida (PIP favorável, projeto aprovado)"
            ],
            "nota_critica": "Edificações ilegais posteriores a 1999 NÃO geram direitos"
        },
        "ampliacao": {
            "solo_urbano": {
                "admissibilidade": "admissivel",
                "limite": "20% da área de construção existente",
                "condicoes": ["Integração urbana", "Respeito pelos parâmetros aplicáveis"]
            },
            "solo_rustico_fora_pnsc_natura": {
                "admissibilidade": "condicionado",
                "limite": "20% da área de construção existente",
                "condicoes": ["Não agravar desconformidades existentes"]
            },
            "pnsc_natura2000": {
                "admissibilidade": "inviavel",
                "notas": "Ampliação não admitida como regra geral"
            },
            "orla_costeira_sensivel": {
                "admissibilidade": "inviavel",
                "notas": "Apenas obras de segurança"
            },
            "espacos_naturais": {
                "admissibilidade": "inviavel",
                "notas": "Sem exceções"
            }
        },
        "legalizacao": {
            "construcao_anterior_1999": {
                "admissibilidade": "admissivel",
                "notas": "Sujeita a requisitos técnicos específicos"
            },
            "construcao_ilegal_pos_1999": {
                "admissibilidade": "inviavel",
                "notas": "Sem regime excecional aplicável"
            },
            "regime_dl_165_2014": {
                "admissibilidade": "condicionado",
                "notas": "Apenas nos termos exatos da decisão administrativa"
            },
            "em_ren_ran": {
                "admissibilidade": "condicionado",
                "notas": "Parecer vinculativo obrigatório"
            },
            "em_pnsc_natura": {
                "admissibilidade": "inviavel",
                "notas": "Exceções muito restritas"
            }
        },
        "notas_criticas": [
            "A ampliação nunca pode exaurir edificabilidade futura",
            "Anexos não são ampliáveis",
            "Não somar ampliações sucessivas",
            "Não usar anexos como ampliação encapotada",
            "O que sempre existiu não é automaticamente legal"
        ],
        "erros_recorrentes": [
            "Confundir tolerância administrativa com direito legal",
            "Somar ampliações sucessivas além do limite",
            "Usar anexos como ampliação encapotada",
            "Assumir que o que sempre existiu é automaticamente legal"
        ]
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.5. Matriz Turismo (Matriz 3.5)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_turismo',
    'concelho_sintra_001',
    'turismo',
    'Matriz Turismo — Urbano vs Solo Rústico',
    'ALTO RISCO: Uso turístico é um dos mais fiscalizados e condicionados no concelho de Sintra.',
    '{
        "tipologias": [
            "Estabelecimentos hoteleiros",
            "Turismo de habitação",
            "Turismo em espaço rural",
            "Empreendimentos turísticos complementares"
        ],
        "solo_urbano": {
            "espacos_centrais": {
                "admissibilidade": "admissivel",
                "condicoes_criticas": ["Integração urbana", "Tráfego", "Ruído"]
            },
            "espacos_habitacionais": {
                "admissibilidade": "condicionado",
                "condicoes_criticas": ["Compatibilidade funcional demonstrada"]
            },
            "espacos_baixa_densidade": {
                "admissibilidade": "condicionado",
                "condicoes_criticas": ["Volumetria adequada", "Integração paisagística"]
            },
            "espacos_atividades_economicas": {
                "admissibilidade": "condicionado",
                "condicoes_criticas": ["Enquadramento excecional necessário"]
            }
        },
        "solo_rustico": {
            "espacos_naturais": {
                "admissibilidade": "inviavel",
                "regra_base": "Não admissível"
            },
            "espacos_florestais": {
                "admissibilidade": "condicionado",
                "regra_base": "Apenas turismo compatível com função florestal"
            },
            "espacos_agricolas": {
                "admissibilidade": "condicionado",
                "regra_base": "Associado à exploração agrícola (agroturismo)"
            },
            "espacos_ocupacao_turistica": {
                "admissibilidade": "admissivel",
                "regra_base": "Regime próprio aplicável"
            },
            "aglomerados_rurais": {
                "admissibilidade": "condicionado",
                "regra_base": "Escala controlada"
            }
        },
        "areas_sensiveis": {
            "pnsc": {
                "admissibilidade": "inviavel",
                "observacoes": "Exceções raríssimas"
            },
            "natura2000": {
                "admissibilidade": "condicionado",
                "observacoes": "Avaliação de incidências ambientais obrigatória"
            },
            "ren": {
                "admissibilidade": "condicionado",
                "observacoes": "Apenas usos compatíveis"
            },
            "orla_costeira": {
                "admissibilidade": "inviavel",
                "observacoes": "Forte restrição aplicável"
            }
        },
        "regra_chave": "Turismo em solo rústico NUNCA é automático. Exige sempre demonstração de compatibilidade territorial."
    }',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 2.6. Matriz Regimes Ambientais Cumulativos (Matriz 3.6)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_matrizes (id, concelho_id, tipo, nome, descricao, regras, activo, versao)
VALUES (
    'matriz_sintra_regimes_ambientais',
    'concelho_sintra_001',
    'regimes_ambientais',
    'Matriz Cumulativa de Regimes Ambientais',
    'CRÍTICO: Todos os regimes são CUMULATIVOS e nenhum pode ser analisado isoladamente.',
    '{
        "regimes_considerados": [
            "Reserva Ecológica Nacional (REN)",
            "Reserva Agrícola Nacional (RAN)",
            "Rede Natura 2000",
            "Parque Natural de Sintra-Cascais (PNSC)",
            "Zonas ameaçadas por cheias",
            "Perigosidade de incêndio rural"
        ],
        "matriz_operacao": {
            "ren": {
                "construcao_nova": {"admissibilidade": "inviavel", "notas": "Regra geral"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            },
            "ran": {
                "construcao_nova": {"admissibilidade": "inviavel", "notas": "Regra geral"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            },
            "natura2000": {
                "construcao_nova": {"admissibilidade": "condicionado"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            },
            "pnsc": {
                "construcao_nova": {"admissibilidade": "inviavel"},
                "ampliacao": {"admissibilidade": "inviavel"},
                "legalizacao": {"admissibilidade": "inviavel"},
                "turismo": {"admissibilidade": "inviavel"}
            },
            "zonas_cheias": {
                "construcao_nova": {"admissibilidade": "inviavel"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "inviavel"}
            },
            "incendio_elevado": {
                "construcao_nova": {"admissibilidade": "condicionado"},
                "ampliacao": {"admissibilidade": "condicionado"},
                "legalizacao": {"admissibilidade": "condicionado"},
                "turismo": {"admissibilidade": "condicionado"}
            }
        },
        "pareceres_obrigatorios": {
            "ren": {"entidade": "APA", "natureza": "vinculativo"},
            "ran": {"entidade": "DGADR", "natureza": "vinculativo"},
            "natura2000": {"entidade": "ICNF", "natureza": "vinculativo"},
            "pnsc": {"entidade": "ICNF", "natureza": "vinculativo"},
            "cheias": {"entidades": ["APA", "CMS"], "natureza": "tecnico"},
            "incendio": {"entidades": ["ICNF", "ANEPC"], "natureza": "tecnico"}
        },
        "principios_inferencia": [
            "A ausência de proibição explícita NÃO equivale a permissão",
            "Índices máximos NÃO são direitos adquiridos",
            "TODOS os regimes são cumulativos",
            "O contexto territorial prevalece sobre a conveniência programática"
        ],
        "erros_criticos_evitar": [
            "Analisar REN, RAN ou Natura isoladamente",
            "Assumir que parecer favorável elimina outros regimes",
            "Tratar zonas de cheias como mera condicionante técnica"
        ]
    }',
    true,
    1
);

-- ============================================================================
-- 3. FLUXO GLOBAL DE DECISÃO (Volume IV)
-- ============================================================================

INSERT INTO concelho_fluxo_decisao (id, concelho_id, fluxo, activo, versao)
VALUES (
    'fluxo_sintra_001',
    'concelho_sintra_001',
    '{
        "versao": "1.0",
        "descricao": "Fluxo Global de Decisão — Árvore Lógica para análise de viabilidade urbanística em Sintra",
        "inicio": "n1",
        "nodes": [
            {
                "id": "n1",
                "titulo": "NÓ 1 — Identificação do solo",
                "tipo": "decisao",
                "pergunta": "O terreno está classificado como solo urbano?",
                "opcoes": [
                    {"resposta": "sim", "proximo": "n2a"},
                    {"resposta": "nao", "proximo": "n2b"}
                ]
            },
            {
                "id": "n2a",
                "titulo": "NÓ 2A — Qualificação do solo urbano",
                "tipo": "decisao",
                "pergunta": "Qual a categoria de espaço urbano?",
                "opcoes": [
                    {"resposta": "espacos_centrais", "proximo": "n3"},
                    {"resposta": "espacos_habitacionais", "proximo": "n3"},
                    {"resposta": "espacos_baixa_densidade", "proximo": "n3", "notas": "Aplicar restrições volumétricas"},
                    {"resposta": "espacos_atividades_economicas", "proximo": "n3", "notas": "Uso habitacional condicionado"}
                ]
            },
            {
                "id": "n2b",
                "titulo": "NÓ 2B — Qualificação do solo rústico",
                "tipo": "decisao_com_resultado",
                "pergunta": "Qual a categoria de solo rústico?",
                "opcoes": [
                    {
                        "resposta": "espacos_naturais",
                        "resultado": {
                            "classificacao": "inviavel",
                            "fundamentacao": "Espaços naturais não admitem edificação como regra geral",
                            "matriz_aplicada": "3.1.B"
                        }
                    },
                    {"resposta": "espacos_florestais", "proximo": "n3", "notas": "Uso funcional apenas"},
                    {"resposta": "espacos_agricolas", "proximo": "n3", "notas": "Uso funcional apenas"},
                    {"resposta": "espacos_ocupacao_turistica", "proximo": "n3"},
                    {"resposta": "aglomerados_rurais", "proximo": "n3", "notas": "Escala limitada"}
                ]
            },
            {
                "id": "n3",
                "titulo": "NÓ 3 — Regimes ambientais cumulativos",
                "tipo": "verificacao_multipla",
                "pergunta": "O local está abrangido por algum regime ambiental?",
                "verificacoes": [
                    {"regime": "pnsc", "se_sim": {"resultado": {"classificacao": "inviavel", "fundamentacao": "PNSC não admite edificação nova", "matriz_aplicada": "3.6"}}},
                    {"regime": "ren", "se_sim": {"proximo": "n3_ren"}},
                    {"regime": "ran", "se_sim": {"proximo": "n3_ran"}},
                    {"regime": "natura2000", "se_sim": {"proximo": "n3_natura"}},
                    {"regime": "cheias", "se_sim": {"proximo": "n3_cheias"}},
                    {"regime": "incendio", "se_sim": {"flag": "incendio_elevado"}}
                ],
                "se_nenhum": {"proximo": "n4"}
            },
            {
                "id": "n3_ren",
                "titulo": "NÓ 3 (REN) — Avaliação REN",
                "tipo": "verificacao",
                "condicao": "operacao.tipo == construcao_nova",
                "verdadeiro": {
                    "resultado": {
                        "classificacao": "inviavel",
                        "fundamentacao": "Construção nova em REN não admissível",
                        "matriz_aplicada": "3.6"
                    }
                },
                "falso": {
                    "proximo": "n4",
                    "flags": ["parecer_apa_obrigatorio"]
                }
            },
            {
                "id": "n3_ran",
                "titulo": "NÓ 3 (RAN) — Avaliação RAN",
                "tipo": "verificacao",
                "condicao": "operacao.tipo == construcao_nova",
                "verdadeiro": {
                    "resultado": {
                        "classificacao": "inviavel",
                        "fundamentacao": "Construção nova em RAN não admissível",
                        "matriz_aplicada": "3.6"
                    }
                },
                "falso": {
                    "proximo": "n4",
                    "flags": ["parecer_dgadr_obrigatorio"]
                }
            },
            {
                "id": "n3_natura",
                "titulo": "NÓ 3 (Natura) — Avaliação Natura 2000",
                "tipo": "passagem",
                "proximo": "n4",
                "flags": ["parecer_icnf_obrigatorio", "avaliacao_incidencias_obrigatoria"]
            },
            {
                "id": "n3_cheias",
                "titulo": "NÓ 3 (Cheias) — Avaliação Zonas de Cheias",
                "tipo": "verificacao",
                "condicao": "operacao.tipo == construcao_nova OR operacao.uso == turismo",
                "verdadeiro": {
                    "resultado": {
                        "classificacao": "inviavel",
                        "fundamentacao": "Construção nova ou turismo em zonas de cheias não admissível",
                        "matriz_aplicada": "3.6"
                    }
                },
                "falso": {
                    "proximo": "n4",
                    "flags": ["parecer_apa_tecnico"]
                }
            },
            {
                "id": "n4",
                "titulo": "NÓ 4 — Existência de preexistência válida",
                "tipo": "decisao",
                "pergunta": "Existe edificação legal ou juridicamente protegida?",
                "opcoes": [
                    {"resposta": "nao", "proximo": "n5"},
                    {"resposta": "sim", "proximo": "n6"}
                ]
            },
            {
                "id": "n5",
                "titulo": "NÓ 5 — Construção nova",
                "tipo": "avaliacao_matrizes",
                "descricao": "Verificar cumulativamente matrizes aplicáveis",
                "matrizes_aplicar": [
                    {"matriz": "solo_uso_urbano", "condicao": "solo.classificacao == urbano"},
                    {"matriz": "solo_uso_rustico", "condicao": "solo.classificacao == rustico"},
                    {"matriz": "turismo", "condicao": "operacao.uso == turismo"},
                    {"matriz": "regimes_ambientais", "sempre": true}
                ],
                "regra": "SE algum resultado == inviavel ENTÃO classificacao = inviavel",
                "proximo": "n7"
            },
            {
                "id": "n6",
                "titulo": "NÓ 6 — Preexistências",
                "tipo": "decisao",
                "pergunta": "Tipo de intervenção pretendida?",
                "opcoes": [
                    {
                        "resposta": "ampliacao",
                        "proximo": "n6_ampliacao"
                    },
                    {
                        "resposta": "legalizacao",
                        "proximo": "n6_legalizacao"
                    }
                ]
            },
            {
                "id": "n6_ampliacao",
                "titulo": "NÓ 6 (Ampliação) — Avaliação de Ampliação",
                "tipo": "avaliacao_matriz",
                "matriz": "preexistencias",
                "campo": "ampliacao",
                "verificacoes": [
                    {"condicao": "localizacao IN [pnsc, natura2000, orla_costeira, espacos_naturais]", "resultado": {"classificacao": "inviavel"}},
                    {"condicao": "ampliacao > 20%", "resultado": {"classificacao": "inviavel", "fundamentacao": "Ampliação excede limite de 20%"}},
                    {"default": {"classificacao": "viavel_condicionado", "condicoes": ["Não agravar desconformidades", "Respeitar limite de 20% Ac"]}}
                ],
                "proximo": "n7"
            },
            {
                "id": "n6_legalizacao",
                "titulo": "NÓ 6 (Legalização) — Avaliação de Legalização",
                "tipo": "avaliacao_matriz",
                "matriz": "preexistencias",
                "campo": "legalizacao",
                "verificacoes": [
                    {"condicao": "preexistencia.ano_construcao >= 1999 AND NOT preexistencia.titulo_valido", "resultado": {"classificacao": "inviavel", "fundamentacao": "Construção ilegal posterior a 1999 não admite legalização"}},
                    {"condicao": "localizacao IN [pnsc, natura2000]", "resultado": {"classificacao": "inviavel", "fundamentacao": "Legalização em PNSC/Natura não admissível"}},
                    {"condicao": "preexistencia.ano_construcao < 1999", "resultado": {"classificacao": "viavel_condicionado", "condicoes": ["Requisitos técnicos específicos"]}},
                    {"default": {"classificacao": "viavel_condicionado"}}
                ],
                "proximo": "n7"
            },
            {
                "id": "n7",
                "titulo": "NÓ 7 — Uso turístico",
                "tipo": "verificacao",
                "condicao": "operacao.uso == turismo",
                "verdadeiro": {
                    "descricao": "Aplicar integralmente Matriz de Turismo",
                    "matriz": "turismo",
                    "proximo": "n8"
                },
                "falso": {
                    "proximo": "n8"
                }
            },
            {
                "id": "n8",
                "titulo": "NÓ 8 — Pareceres vinculativos",
                "tipo": "verificacao_pareceres",
                "descricao": "Verificar necessidade e sentido dos pareceres",
                "pareceres_possiveis": ["APA", "ICNF", "DGADR", "DGPC"],
                "regra": "SE algum parecer vinculativo == desfavorável ENTÃO classificacao = inviavel",
                "proximo": "n9"
            },
            {
                "id": "n9",
                "titulo": "NÓ 9 — DECISÃO FINAL",
                "tipo": "resultado_final",
                "descricao": "Classificação obrigatória com fundamentação",
                "classificacoes_possiveis": [
                    {"valor": "viavel", "simbolo": "✔️", "descricao": "VIÁVEL"},
                    {"valor": "viavel_condicionado", "simbolo": "⚠️", "descricao": "VIÁVEL CONDICIONADO"},
                    {"valor": "inviavel", "simbolo": "❌", "descricao": "INVIÁVEL"}
                ],
                "obrigatorios": [
                    "fundamentacao_normativa",
                    "matrizes_aplicadas",
                    "regimes_identificados",
                    "pareceres_necessarios"
                ]
            }
        ]
    }',
    true,
    1
);

-- ============================================================================
-- 4. PROMPTS BASE — ANÁLISE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1. Viabilidade Geral — Modo Interno
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_viabilidade_interno',
    'concelho_sintra_001',
    'viabilidade_geral_interno',
    'Viabilidade Geral (Interno)',
    'interno',
    'analise',
    'Analisa a viabilidade urbanística do imóvel com os seguintes dados:

{{INPUT_NORMALIZADO}}

Segue obrigatoriamente o Fluxo Global de Decisão da GAVINHO e as Matrizes aplicáveis.

Indica:
- classificação final (viável / viável condicionado / inviável)
- fundamentação normativa (com referência às matrizes aplicadas)
- regimes determinantes
- riscos críticos identificados
- pareceres externos necessários

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.2. Viabilidade Geral — Modo Cliente
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_viabilidade_cliente',
    'concelho_sintra_001',
    'viabilidade_geral_cliente',
    'Viabilidade Geral (Cliente)',
    'cliente',
    'analise',
    'Avalia a viabilidade do imóvel descrito abaixo e apresenta uma conclusão clara para cliente final.

{{INPUT_NORMALIZADO}}

Indica apenas:
- se é viável, viável condicionado ou inviável
- principais condicionantes (em linguagem clara)
- próximos passos recomendados

Utiliza linguagem clara, profissional e prudente.
Não utilizes referências internas (matrizes, nós, regras) nem linguagem jurídica excessiva.

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.3. Posso Construir Aqui?
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_construir',
    'concelho_sintra_001',
    'posso_construir',
    'Posso Construir Aqui?',
    'interno',
    'analise',
    'Com base no PDM de Sintra, indica se o uso pretendido é admissível no local descrito.

{{INPUT_NORMALIZADO}}

Aplica a Matriz Solo × Uso (3.1.A ou 3.1.B conforme classificação) e identifica exclusões imediatas.

Responde de forma directa:
- O uso é admissível, condicionado ou não admissível?
- Qual a fundamentação normativa?
- Existem exclusões imediatas (ex: espaços naturais)?

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.4. Uso Turístico
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_turismo',
    'concelho_sintra_001',
    'uso_turistico',
    'Avaliação de Uso Turístico',
    'interno',
    'analise',
    'Avalia a admissibilidade do uso turístico no local descrito.

{{INPUT_NORMALIZADO}}

Aplica integralmente a Matriz de Turismo (3.5) e os regimes ambientais cumulativos (3.6).

ATENÇÃO: O uso turístico é um dos mais fiscalizados e condicionados no concelho de Sintra.

Indica:
- se o turismo é admissível, condicionado ou não admissível
- tipologia turística mais adequada (se aplicável)
- condicionantes territoriais específicas
- pareceres obrigatórios

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.5. Posso Ampliar?
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_ampliar',
    'concelho_sintra_001',
    'posso_ampliar',
    'Posso Ampliar?',
    'interno',
    'analise',
    'Verifica se a edificação existente pode ser ampliada.

{{INPUT_NORMALIZADO}}

Aplica a Matriz de Preexistências × Ampliação (3.4).

Verifica obrigatoriamente:
1. A preexistência é válida? (anterior a 1999 OU com título válido)
2. A localização permite ampliação? (excluir PNSC, Natura, orla costeira, espaços naturais)
3. Qual o limite máximo de ampliação? (regra geral: 20% Ac)

Indica:
- se a ampliação é admissível
- limite máximo aplicável
- condições obrigatórias (ex: não agravar desconformidades)

NOTAS CRÍTICAS:
- Anexos não são ampliáveis
- Não somar ampliações sucessivas
- A ampliação nunca pode exaurir edificabilidade futura

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.6. Posso Legalizar?
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_legalizar',
    'concelho_sintra_001',
    'posso_legalizar',
    'Posso Legalizar?',
    'interno',
    'analise',
    'Avalia a possibilidade de legalização da edificação existente.

{{INPUT_NORMALIZADO}}

Aplica a Matriz de Preexistências × Legalização (3.4).

Considera obrigatoriamente:
1. Data de construção (anterior ou posterior a 1999)
2. Existência de título ou regime excecional (DL 165/2014)
3. Regimes aplicáveis (REN, RAN, PNSC, Natura)
4. Exclusões absolutas

REGRAS CRÍTICAS:
- Construção ilegal posterior a 1999 = NÃO LEGALIZÁVEL
- PNSC/Natura = exceções muito restritas
- REN/RAN = parecer vinculativo obrigatório

Indica:
- se a legalização é possível
- regime aplicável
- requisitos específicos
- pareceres necessários

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.7. Impacto Ambiental
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_impacto_ambiental',
    'concelho_sintra_001',
    'impacto_ambiental',
    'Impacto dos Regimes Ambientais',
    'interno',
    'analise',
    'Identifica todos os regimes ambientais aplicáveis ao local.

{{INPUT_NORMALIZADO}}

Aplica cumulativamente a Matriz de Regimes Ambientais (3.6).

REGIMES A VERIFICAR:
- REN (Reserva Ecológica Nacional)
- RAN (Reserva Agrícola Nacional)
- Natura 2000
- PNSC (Parque Natural Sintra-Cascais)
- Zonas ameaçadas por cheias
- Perigosidade de incêndio rural

Para cada regime aplicável, indica:
- Impacto na operação pretendida (impede / condiciona / permite)
- Pareceres obrigatórios (entidade + natureza: vinculativo/técnico)

PRINCÍPIOS OBRIGATÓRIOS:
- Todos os regimes são CUMULATIVOS
- Ausência de proibição ≠ permissão
- Parecer favorável de um não elimina outros regimes

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 4.8. Texto para Relatório
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_texto_relatorio',
    'concelho_sintra_001',
    'texto_relatorio',
    'Texto para Relatório de Viabilidade',
    'cliente',
    'geracao',
    'Redige o texto da conclusão de um Relatório de Viabilidade Urbanística para cliente, com base na análise abaixo:

{{ANALISE_INTERNA}}

Utiliza linguagem clara, profissional e prudente.

REGRAS:
- Não utilizes referências internas (matrizes, nós, regras)
- Não utilizes linguagem jurídica excessiva
- Privilegia frases como:
  - "À luz do enquadramento urbanístico aplicável em Sintra…"
  - "A viabilidade encontra-se condicionada a…"
  - "O enquadramento territorial não permite…"

Estrutura o texto em:
1. Síntese da conclusão (viável / viável condicionado / inviável)
2. Principais condicionantes
3. Próximos passos recomendados

{{INPUT_ADICIONAL}}',
    true,
    1
);

-- ============================================================================
-- 5. PROMPTS DE VALIDAÇÃO CRUZADA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1. Auditoria Técnica Completa (VC-1)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc1_auditoria',
    'concelho_sintra_001',
    'vc1_auditoria_completa',
    'Auditoria Técnica Completa',
    'interno',
    'validacao',
    'Audita criticamente a seguinte análise urbanística:

{{RESPOSTA_IA}}

Verifica obrigatoriamente:
- se o Fluxo Global de Decisão foi seguido sem saltos
- se existem regimes ambientais ou patrimoniais não considerados
- se a classificação do solo está corretamente aplicada
- se a conclusão é excessivamente otimista

Identifica:
- erros
- omissões
- pontos de risco
- aspetos que exigem validação humana

A IA não pode confirmar a resposta sem a questionar.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.2. Validação de Solo e Uso (VC-2)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc2_solo_uso',
    'concelho_sintra_001',
    'vc2_validacao_solo_uso',
    'Validação de Solo e Uso',
    'interno',
    'validacao',
    'Reavalia a compatibilidade entre solo e uso na análise seguinte:

{{RESPOSTA_IA}}

Confirma:
- correta identificação da classificação e qualificação do solo
- aplicação da Matriz Solo × Uso correta (3.1.A ou 3.1.B)
- inexistência de exceções indevidamente assumidas

Indica se a análise está correcta ou se existem erros/omissões.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.3. Validação de Regimes Ambientais (VC-3)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc3_regimes',
    'concelho_sintra_001',
    'vc3_validacao_regimes',
    'Validação de Regimes Ambientais',
    'interno',
    'validacao',
    'Analisa se todos os regimes ambientais aplicáveis foram considerados na resposta seguinte:

{{RESPOSTA_IA}}

Verifica cumulatividade de:
- REN
- RAN
- Natura 2000
- PNSC
- cheias
- incêndio

Indica se algum regime deveria conduzir a inviabilidade ou maior condicionamento do que o indicado na análise.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.4. Validação de Preexistências (VC-4)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc4_preexistencias',
    'concelho_sintra_001',
    'vc4_validacao_preexistencias',
    'Validação de Preexistências',
    'interno',
    'validacao',
    'Audita a análise relativa a preexistências e ampliações:

{{RESPOSTA_IA}}

Confirma:
- validade temporal e legal da preexistência
- respeito pelo limite máximo de ampliação (20% Ac)
- inexistência de anexos considerados como ampliação
- não agravamento de desconformidades

Indica se a análise está correcta ou se existem erros/omissões.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.5. Validação de Turismo (VC-5)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc5_turismo',
    'concelho_sintra_001',
    'vc5_validacao_turismo',
    'Validação de Turismo',
    'interno',
    'validacao',
    'Reavalia criticamente a admissibilidade do uso turístico indicada abaixo:

{{RESPOSTA_IA}}

Confirma:
- compatibilidade com a categoria de solo
- respeito pelos regimes ambientais (especialmente PNSC)
- inexistência de pressupostos não garantidos

LEMBRETE: O uso turístico é um dos mais fiscalizados em Sintra.

Indica se a análise está correcta ou se é demasiado optimista.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.6. Nível de Confiança (VC-6)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc6_confianca',
    'concelho_sintra_001',
    'vc6_nivel_confianca',
    'Classificação de Nível de Confiança',
    'interno',
    'validacao',
    'Classifica o nível de confiança da conclusão seguinte:

{{RESPOSTA_IA}}

Utiliza exclusivamente uma das categorias:
- ALTA — decisão clara e pouco controvertida
- MÉDIA — decisão plausível mas dependente de pareceres
- BAIXA — decisão frágil ou altamente condicionada

Justifica brevemente a classificação.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.7. Reforço de Prudência (VC-7)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_vc7_prudencia',
    'concelho_sintra_001',
    'vc7_reforco_prudencia',
    'Reforço de Prudência',
    'interno',
    'validacao',
    'Reformula a conclusão seguinte de forma mais conservadora e defensável:

{{RESPOSTA_IA}}

Objectivos:
- Reduzir afirmações categóricas
- Reforçar condicionantes
- Enfatizar dependência de validação administrativa
- Usar linguagem mais prudente

A reformulação deve ser utilizável em contexto de relatório para cliente.',
    true,
    1
);

-- ----------------------------------------------------------------------------
-- 5.8. Extracção de Dados (Chat Conversacional)
-- ----------------------------------------------------------------------------

INSERT INTO concelho_prompts (id, concelho_id, codigo, nome, modo, categoria, template, activo, versao)
VALUES (
    'prompt_sintra_extracao_dados',
    'concelho_sintra_001',
    'extracao_dados_chat',
    'Extracção de Dados do Chat',
    'interno',
    'analise',
    'O utilizador descreveu o seguinte caso:

"{{DESCRICAO_LIVRE}}"

Extrai os dados no formato INPUT normalizado:

localizacao:
  concelho: Sintra (confirmar)
  freguesia: (identificar ou perguntar)
  morada: (identificar ou perguntar)

solo:
  classificacao: urbano | rustico (identificar ou perguntar)
  qualificacao: (identificar ou perguntar)
  categoria_espaco: (identificar ou perguntar)

regimes:
  REN: sim | nao | desconhecido
  RAN: sim | nao | desconhecido
  Natura2000: sim | nao | desconhecido
  PNSC: sim | nao | desconhecido
  cheias: sim | nao | desconhecido
  incendio: sim | nao | desconhecido

preexistencia:
  existe: sim | nao
  valida: sim | nao | desconhecido
  ano_construcao: (se aplicável)
  area_construcao: (se conhecida)

operacao:
  tipo: construcao_nova | ampliacao | legalizacao
  uso: habitacao | turismo | equipamento | atividades_economicas
  programa: (descrição breve)

Para campos marcados como "desconhecido" ou que não conseguiste identificar,
formula perguntas claras e específicas para obter a informação em falta.

Responde em formato estruturado indicando:
1. Dados extraídos
2. Perguntas necessárias para completar o INPUT',
    true,
    1
);

-- ============================================================================
-- 6. ÍNDICES ADICIONAIS (Performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_matrizes_concelho_tipo_activo
ON concelho_matrizes(concelho_id, tipo) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_prompts_concelho_codigo_activo
ON concelho_prompts(concelho_id, codigo) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_fluxo_concelho_activo
ON concelho_fluxo_decisao(concelho_id) WHERE activo = true;

-- ============================================================================
-- FIM DO FICHEIRO
-- ============================================================================
