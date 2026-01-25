// supabase/functions/projeto-chat/context-builder.ts

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Skill {
  id: string
  codigo: string
  nome: string
  prompt_sistema: string
}

interface ContextoItem {
  id: string
  tipo: string
  titulo: string
  conteudo: string
}

export interface BuildContextResult {
  skills: Skill[]
  contextoItems: ContextoItem[]
}

export async function buildContext(
  supabase: SupabaseClient,
  projetoId: string,
  skillsOverride?: string[]
): Promise<BuildContextResult> {

  // 1. Buscar contexto do projecto
  const { data: contextoItems } = await supabase
    .from('projeto_contexto')
    .select('id, tipo, titulo, conteudo')
    .eq('projeto_id', projetoId)
    .eq('activo', true)
    .eq('incluir_sempre', true)
    .order('ordem')

  // 2. Buscar skills activas
  let skills: Skill[] = []

  if (skillsOverride && skillsOverride.length > 0) {
    // Usar skills especificas do chat
    const { data } = await supabase
      .from('skills')
      .select('id, codigo, nome, prompt_sistema')
      .in('id', skillsOverride)
      .eq('activo', true)

    skills = data || []
  } else {
    // Usar skills do projecto
    const { data } = await supabase
      .from('projeto_skills')
      .select(`
        skill:skills(
          id,
          codigo,
          nome,
          prompt_sistema
        )
      `)
      .eq('projeto_id', projetoId)
      .eq('activo', true)

    skills = (data || [])
      .map(ps => ps.skill)
      .filter(Boolean) as Skill[]
  }

  return {
    skills,
    contextoItems: contextoItems || []
  }
}
