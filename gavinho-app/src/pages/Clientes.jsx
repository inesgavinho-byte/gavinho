import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  MoreVertical,
  X,
  Edit,
  Trash2,
  User
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

export default function Clientes() {
  const navigate = useNavigate()
  const toast = useToast()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [activeMenu, setActiveMenu] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    empresa: '',
    tipo: 'Particular',
    email: '',
    telefone: '',
    cidade: '',
    morada: '',
    codigo_postal: '',
    nif: '',
    notas: ''
  })

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true })
      
      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const filteredClients = clients.filter(client => 
    client.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleNewClient = () => {
    setEditingClient(null)
    setFormData({ nome: '', empresa: '', tipo: 'Particular', email: '', telefone: '', cidade: '', morada: '', codigo_postal: '', nif: '', notas: '' })
    setShowModal(true)
  }

  const handleEditClient = (client) => {
    setEditingClient(client)
    setFormData({
      nome: client.nome || '',
      empresa: client.empresa || '',
      tipo: client.tipo || 'Particular',
      email: client.email || '',
      telefone: client.telefone || '',
      cidade: client.cidade || '',
      morada: client.morada || '',
      codigo_postal: client.codigo_postal || '',
      nif: client.nif || '',
      notas: client.notas || ''
    })
    setShowModal(true)
    setActiveMenu(null)
  }

  const handleSaveClient = async () => {
    if (!formData.nome.trim()) return

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clientes')
          .update({
            nome: formData.nome,
            empresa: formData.empresa || null,
            tipo: formData.tipo,
            email: formData.email || null,
            telefone: formData.telefone || null,
            cidade: formData.cidade || null,
            morada: formData.morada || null,
            codigo_postal: formData.codigo_postal || null,
            nif: formData.nif || null,
            notas: formData.notas || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingClient.id)

        if (error) throw error
      } else {
        const { data: maxCode } = await supabase
          .from('clientes')
          .select('codigo')
          .order('codigo', { ascending: false })
          .limit(1)

        let nextNum = 1
        if (maxCode && maxCode.length > 0 && maxCode[0].codigo) {
          const match = maxCode[0].codigo.match(/CLI_(\d+)/)
          if (match) nextNum = parseInt(match[1]) + 1
        }
        const codigo = `CLI_${String(nextNum).padStart(5, '0')}`

        const { error } = await supabase
          .from('clientes')
          .insert([{
            codigo,
            nome: formData.nome,
            empresa: formData.empresa || null,
            tipo: formData.tipo,
            email: formData.email || null,
            telefone: formData.telefone || null,
            cidade: formData.cidade || null,
            morada: formData.morada || null,
            codigo_postal: formData.codigo_postal || null,
            nif: formData.nif || null,
            notas: formData.notas || null
          }])

        if (error) throw error
      }

      setShowModal(false)
      loadClients()
    } catch (err) {
      console.error('Erro ao guardar cliente:', err)
      toast.error('Erro', 'Erro ao guardar cliente')
    }
  }

  const handleDeleteClient = async (client) => {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', client.id)
      if (error) throw error
      setShowDeleteConfirm(null)
      loadClients()
    } catch (err) {
      console.error('Erro ao eliminar cliente:', err)
      toast.error('Erro', 'Erro ao eliminar cliente. Verifique se não tem projetos associados.')
    }
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--stone)', borderTopColor: 'var(--brown)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{filteredClients.length} clientes registados</p>
        </div>
        <button className="btn btn-primary" onClick={handleNewClient}>
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '450px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)' }} />
          <input
            type="text"
            placeholder="Procurar por nome, empresa ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              border: '1px solid var(--stone)',
              borderRadius: '24px',
              fontSize: '14px',
              background: 'var(--white)',
              color: 'var(--brown)'
            }}
          />
        </div>
      </div>

      <div className="card">
        {filteredClients.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--brown-light)' }}>
            <User size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>Nenhum cliente encontrado</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleNewClient}>Criar Primeiro Cliente</button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Contacto</th>
                  <th>Localização</th>
                  <th>NIF</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--blush), var(--blush-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brown-dark)', fontWeight: 600, fontSize: '14px' }}>
                          {client.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{client.nome}</div>
                          {client.empresa && <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{client.empresa}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: client.tipo === 'Empresa' ? 'rgba(201, 168, 130, 0.2)' : 'var(--stone)', color: client.tipo === 'Empresa' ? 'var(--warning)' : 'var(--brown)' }}>
                        {client.tipo || 'Particular'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown-light)' }}><Mail size={12} />{client.email}</div>}
                        {client.telefone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown-light)' }}><Phone size={12} />{client.telefone}</div>}
                      </div>
                    </td>
                    <td>
                      {client.cidade && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brown-light)' }}><MapPin size={14} />{client.cidade}</div>}
                    </td>
                    <td style={{ color: 'var(--brown-light)', fontSize: '13px' }}>{client.nif || '-'}</td>
                    <td>
                      <div style={{ position: 'relative' }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}>
                          <MoreVertical size={16} />
                        </button>
                        {activeMenu === client.id && (
                          <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--white)', borderRadius: '10px', boxShadow: 'var(--shadow-lg)', minWidth: '150px', zIndex: 100, overflow: 'hidden' }}>
                            <button onClick={() => handleEditClient(client)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--brown)' }}>
                              <Edit size={14} />Editar
                            </button>
                            <button onClick={() => { setShowDeleteConfirm(client); setActiveMenu(null) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--error)' }}>
                              <Trash2 size={14} />Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--stone)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Nome *</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} placeholder="Nome completo" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Tipo</label>
                <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'var(--white)' }}>
                  <option value="Particular">Particular</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Investidor">Investidor</option>
                </select>
              </div>
              {formData.tipo !== 'Particular' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Empresa</label>
                  <input type="text" value={formData.empresa} onChange={(e) => setFormData({...formData, empresa: e.target.value})} placeholder="Nome da empresa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@exemplo.com" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Telefone</label>
                  <input type="tel" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} placeholder="+351 912 345 678" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>NIF</label>
                <input type="text" value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} placeholder="123456789" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Morada</label>
                <input type="text" value={formData.morada} onChange={(e) => setFormData({...formData, morada: e.target.value})} placeholder="Rua, número, andar" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Código Postal</label>
                  <input type="text" value={formData.codigo_postal} onChange={(e) => setFormData({...formData, codigo_postal: e.target.value})} placeholder="1000-001" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Cidade</label>
                  <input type="text" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} placeholder="Lisboa" style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--brown)' }}>Notas</label>
                <textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} placeholder="Observações sobre o cliente..." rows={3} style={{ width: '100%', padding: '12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--stone)', background: 'var(--cream)' }}>
              <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleSaveClient} className="btn btn-primary" disabled={!formData.nome.trim()}>{editingClient ? 'Guardar Alterações' : 'Criar Cliente'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteConfirm(null)}>
          <div style={{ background: 'var(--white)', borderRadius: '16px', padding: '24px', maxWidth: '400px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Eliminar Cliente</h3>
            <p style={{ color: 'var(--brown-light)', marginBottom: '24px', lineHeight: 1.5 }}>Tem a certeza que deseja eliminar <strong>{showDeleteConfirm.nome}</strong>? Esta ação não pode ser revertida.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-outline">Cancelar</button>
              <button onClick={() => handleDeleteClient(showDeleteConfirm)} style={{ padding: '10px 20px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '980px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {activeMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setActiveMenu(null)} />}
    </div>
  )
}
