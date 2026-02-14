// Script para atualizar as datas de entrada dos colaboradores
// Execute no console do navegador ou via Node.js com Supabase configurado

import { supabase } from '../lib/supabase'

const employeeDates = [
  { nome: 'Luciana Ortega', data_entrada: '2025-02-14' },
  { nome: 'Leonardo Ribeiro', data_entrada: '2025-03-10' },
  { nome: 'Caroline Roda', data_entrada: '2025-03-24' },
  { nome: 'Giovana Martins', data_entrada: '2025-04-01' },
  { nome: 'Carolina Cipriano', data_entrada: '2025-06-23' },
  { nome: 'Laís Silva', data_entrada: '2025-07-14' },
  { nome: 'Alana Oliveira', data_entrada: '2025-09-22' },
  { nome: 'Ana Miranda', data_entrada: '2025-11-10' },
  { nome: 'Patrícia Morais', data_entrada: '2025-11-17' }
]

export async function updateEmployeeDates() {

  for (const employee of employeeDates) {
    try {
      const { data, error } = await supabase
        .from('utilizadores')
        .update({ data_entrada: employee.data_entrada })
        .ilike('nome', `%${employee.nome}%`)
        .select()

      if (error) {
        console.error(`Erro ao atualizar ${employee.nome}:`, error)
      } else if (data && data.length > 0) {
      } else {
        console.warn(`⚠ ${employee.nome} não encontrado`)
      }
    } catch (err) {
      console.error(`Erro ao processar ${employee.nome}:`, err)
    }
  }

}

// Para executar diretamente
// updateEmployeeDates()
