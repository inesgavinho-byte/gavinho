import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Users, UserPlus, Search, Phone, Key, Building2,
  Edit, Trash2, X, Check, Loader2, HardHat, Plus,
  ChevronDown, ChevronUp
} from 'lucide-react'

export default function Trabalhadores() {
  const { profile } = useAuth()
  const [trabalhadores, setTrabalhadores] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState(null)
  const [expandedWorker, setExpandedWorker] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    pin: '',
    cargo: '',
    ativo: true,
    obras: []
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: workersData, error: workersError } = await supabase
        .from('trabalhadores')
        .select(`
          *,
          trabalhador_obras(
            obra_id,
            obras(id, codigo, nome)
          )
        `)
        .order('nome')

      if (workersError) throw workersError

      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .order('codigo', { ascending: false })

      if (obrasError) throw obrasError

      setTrabalhadores(workersData || [])
      setObras(obrasData || [])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    setForm({ ...form, pin })
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    let cleaned = phone.replace(/\D/g, '')
    if (!cleaned.startsWith('351') && cleaned.length === 9) {
      cleaned = '351' + cleaned
    }
    return '+' + cleaned
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const phoneFormatted = formatPhone(form.telefone)

      if (editingWorker) {
        const { error: updateError } = await supabase
          .from('trabalhadores')
          .update({
            nome: form.nome,
            telefone: phoneFormatted,
            pin: form.pin,
            cargo: form.cargo,
            ativo: form.ativo
          })
          .eq('id', editingWorker.id)

        if (updateError) throw updateError

        await supabase
          .from('trabalhador_obras')
          .delete()
          .eq('trabalhador_id', editingWorker.id)

        if (form.obras.length > 0) {
          const assignments = form.obras.map(obraId => ({
            trabalhador_id: editingWorker.id,
            obra_id: obraId
          }))

          const { error: assignError } = await supabase
            .from('trabalhador_obras')
            .insert(assignments)

          if (assignError) throw assignError
        }
      } else {
        const { data: newWorker, error: insertError } = await supabase
          .from('trabalhadores')
          .insert({
            nome: form.nome,
            telefone: phoneFormatted,
            pin: form.pin,
            cargo: form.cargo,
            ativo: form.ativo
          })
          .select()
          .single()

        if (insertError) throw insertError

        if (form.obras.length > 0) {
          const assignments = form.obras.map(obraId => ({
            trabalhador_id: newWorker.id,
            obra_id: obraId
          }))

          const { error: assignError } = await supabase
            .from('trabalhador_obras')
            .insert(assignments)

          if (assignError) throw assignError
        }
      }

      setShowModal(false)
      setEditingWorker(null)
      resetForm()
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar trabalhador: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (worker) => {
    setEditingWorker(worker)
    setForm({
      nome: worker.nome || '',
      telefone: worker.telefone?.replace('+351', '') || '',
      pin: worker.pin || '',
      cargo: worker.cargo || '',
      ativo: worker.ativo !== false,
      obras: worker.trabalhador_obras?.map(to => to.obra_id) || []
    })
    setShowModal(true)
  }

  const handleDelete = async (worker) => {
    if (!confirm(`Tens a certeza que queres eliminar ${worker.nome}?`)) return

    try {
      await supabase
        .from('trabalhador_obras')
        .delete()
        .eq('trabalhador_id', worker.id)

      const { error } = await supabase
        .from('trabalhadores')
        .delete()
        .eq('id', worker.id)

      if (error) throw error

      loadData()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
      alert('Erro ao eliminar trabalhador')
    }
  }

  const resetForm = () => {
    setForm({
      nome: '',
      telefone: '',
      pin: '',
      cargo: '',
      ativo: true,
      obras: []
    })
  }

  const toggleObraSelection = (obraId) => {
    setForm(prev => ({
      ...prev,
      obras: prev.obras.includes(obraId)
        ? prev.obras.filter(id => id !== obraId)
        : [...prev.obras, obraId]
    }))
  }

  const filteredWorkers = trabalhadores.filter(w =>
    w.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.telefone?.includes(searchTerm) ||
    w.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HardHat className="w-7 h-7 text-[#3d4349]" />
            Trabalhadores
          </h1>
          <p className="text-gray-500 mt-1">Gerir trabalhadores e acessos à PWA</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setEditingWorker(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#3d4349] text-white rounded-lg hover:bg-[#4a5158] transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Novo Trabalhador
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Pesquisar por nome, telefone ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d4349]/20 focus:border-[#3d4349]"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredWorkers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum trabalhador encontrado</p>
            <button
              onClick={() => {
                resetForm()
                setEditingWorker(null)
                setShowModal(true)
              }}
              className="mt-4 text-[#3d4349] hover:underline"
            >
              Adicionar primeiro trabalhador
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredWorkers.map(worker => (
              <div key={worker.id} className="hover:bg-gray-50">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedWorker(expandedWorker === worker.id ? null : worker.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${worker.ativo ? 'bg-[#3d4349]' : 'bg-gray-300'}`}>
                      {worker.nome?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{worker.nome}</span>
                        {!worker.ativo && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">Inativo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {worker.telefone}
                        </span>
                        {worker.cargo && (
                          <span className="flex items-center gap-1">
                            <HardHat className="w-3.5 h-3.5" />
                            {worker.cargo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 mr-2">
                      {worker.trabalhador_obras?.length || 0} obra(s)
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(worker) }}
                      className="p-2 text-gray-400 hover:text-[#3d4349] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(worker) }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedWorker === worker.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedWorker === worker.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50">
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Obras atribuídas:</p>
                      {worker.trabalhador_obras?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {worker.trabalhador_obras.map(to => (
                            <span
                              key={to.obra_id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                            >
                              <Building2 className="w-3.5 h-3.5 text-[#3d4349]" />
                              <span className="font-medium">{to.obras?.codigo}</span>
                              <span className="text-gray-500">- {to.obras?.nome}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Nenhuma obra atribuída</p>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-400">
                        PIN: <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">{worker.pin}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-[#3d4349]">{trabalhadores.filter(w => w.ativo).length}</div>
          <div className="text-sm text-gray-500">Trabalhadores ativos</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-[#3d4349]">{trabalhadores.filter(w => !w.ativo).length}</div>
          <div className="text-sm text-gray-500">Inativos</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-[#3d4349]">{obras.filter(o => o.status === 'em_curso').length}</div>
          <div className="text-sm text-gray-500">Obras em curso</div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingWorker ? 'Editar Trabalhador' : 'Novo Trabalhador'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingWorker(null) }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d4349]/20 focus:border-[#3d4349]"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telemóvel *</label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500">+351</span>
                  <input
                    type="tel"
                    required
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value.replace(/\D/g, '') })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d4349]/20 focus:border-[#3d4349]"
                    placeholder="912 345 678"
                    maxLength={9}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN de Acesso *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={form.pin}
                    onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d4349]/20 focus:border-[#3d4349] font-mono text-center tracking-widest"
                    placeholder="1234"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={generatePin}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Gerar
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">PIN de 4-6 dígitos para acesso à app</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input
                  type="text"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d4349]/20 focus:border-[#3d4349]"
                  placeholder="Ex: Pedreiro, Eletricista, Encarregado..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#3d4349] focus:ring-[#3d4349]"
                  />
                  <span className="text-sm text-gray-700">Trabalhador ativo</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Obras Atribuídas</label>
                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {obras.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 text-center">Nenhuma obra disponível</p>
                  ) : (
                    obras.map(obra => (
                      <label
                        key={obra.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${
                          form.obras.includes(obra.id) ? 'bg-[#3d4349]/5' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.obras.includes(obra.id)}
                          onChange={() => toggleObraSelection(obra.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#3d4349] focus:ring-[#3d4349]"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{obra.codigo}</span>
                          <span className="text-gray-500 ml-2">- {obra.nome}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          obra.status === 'em_curso' ? 'bg-green-100 text-green-700' :
                          obra.status === 'em_projeto' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {obra.status?.replace('_', ' ')}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingWorker(null) }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#3d4349] text-white rounded-lg hover:bg-[#4a5158] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingWorker ? 'Guardar Alterações' : 'Criar Trabalhador'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
