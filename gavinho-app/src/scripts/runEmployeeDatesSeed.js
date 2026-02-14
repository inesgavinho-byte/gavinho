// Script para atualizar datas de entrada dos colaboradores
// Execute com: node --experimental-modules src/scripts/runEmployeeDatesSeed.js

import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase (usar variáveis de ambiente em produção)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function updateEmployeeDates() {

  let updated = 0
  let notFound = 0

  for (const employee of employeeDates) {
    const { data, error } = await supabase
      .from('utilizadores')
      .update({ data_entrada: employee.data_entrada })
      .ilike('nome', `%${employee.nome}%`)
      .select('id, nome')

    if (error) {
    } else if (data && data.length > 0) {
      updated++
    } else {
      notFound++
    }
  }

}

updateEmployeeDates()
