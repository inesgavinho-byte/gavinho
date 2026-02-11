import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import {
  ArrowLeft, User, Mail, Phone, Building2, Shield,
  Calendar, Clock, FileText, Euro, Loader2,
  Edit, Save, X, CalendarDays, Briefcase, Home, Wifi
} from 'lucide-react'

const DEPARTAMENTOS = [
  'Arquitetura', 'Design Interiores', 'Construção',
  'Gestão', 'Comercial', 'Administrativo'
]

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor de Projeto' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'user', label: 'Colaborador' }
]

export default function ColaboradorDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [colaborador, setColaborador] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [ausencias, setAusencias] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [projetos, setProjetos] = useState([])
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    fetchColaborador()
  }, [id])

  const fetchColaborador = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('utilizadores')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setColaborador(data)
      setEditForm(data)

      // Fetch related data in parallel
      const [ausenciasRes, timesheetsRes, projetosRes] = await Promise.all([
        supabase
          .from('ausencias')
          .select('*')
          .eq('utilizador_id', id)
          .order('data_inicio', { ascending: false })
          .limit(20),
        supabase
          .from('timesheets')
          .select('*, projetos:projeto_id(codigo, nome)')
          .eq('utilizador_id', id)
          .order('data', { ascending: false })
          .limit(30),
        supabase
          .from('projeto_equipa')
          .select('*, projetos:projeto_id(id, codigo, nome, status)')
          .eq('utilizador_id', id)
      ])

      setAusencias(ausenciasRes.data || [])
      setTimesheets(timesheetsRes.data || [])
      setProjetos(projetosRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar colaborador:', err)
      toast.error('Erro', 'Não foi possível carregar o perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('utilizadores')
        .update({
          nome: editForm.nome,
          telefone: editForm.telefone,
          cargo: editForm.cargo,
          departamento: editForm.departamento,
          role: editForm.role,
          tipo_contrato: editForm.tipo_contrato,
          regime: editForm.regime,
          nif: editForm.nif,
          iban: editForm.iban,
          morada: editForm.morada,
          horario_inicio: editForm.horario_inicio,
          horario_fim: editForm.horario_fim,
          dias_ferias_disponiveis: editForm.dias_ferias_disponiveis,
          data_nascimento: editForm.data_nascimento
        })
        .eq('id', id)

      if (error) throw error

      setColaborador(editForm)
      setEditing(false)
      toast.success('Perfil atualizado')
    } catch (err) {
      console.error('Erro ao guardar:', err)
      toast.error('Erro', 'Não foi possível guardar as alterações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  if (!colaborador) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <button onClick={() => navigate('/workspace/equipa')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown)' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="page-title">Colaborador não encontrado</h1>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'info', label: 'Informações', icon: User },
    { id: 'projetos', label: 'Projetos', icon: Building2 },
    { id: 'ausencias', label: 'Ausências', icon: CalendarDays },
    { id: 'timesheets', label: 'Timesheets', icon: Clock }
  ]

  const totalHorasMes = timesheets
    .filter(t => {
      const d = new Date(t.data)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, t) => sum + (t.horas || 0), 0)

  const ausenciasPendentes = ausencias.filter(a => a.estado === 'pendente').length

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/workspace/equipa')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ margin: 0 }}>{colaborador.nome}</h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            {colaborador.cargo || 'Sem cargo definido'} • {colaborador.departamento || 'Sem departamento'}
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--brown)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
          >
            <Edit size={14} /> Editar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setEditing(false); setEditForm(colaborador) }}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--stone)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 16px', background: 'var(--green)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Guardar
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4" style={{ gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{projetos.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Projetos Ativos</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{totalHorasMes}h</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Horas Este Mês</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brown)' }}>{colaborador.dias_ferias_disponiveis || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Dias Férias Disponíveis</div>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: ausenciasPendentes > 0 ? 'var(--amber)' : 'var(--brown)' }}>{ausenciasPendentes}</div>
          <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Ausências Pendentes</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--stone)', paddingBottom: '12px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? 'var(--brown)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--brown-light)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--stone)',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Informações */}
      {activeTab === 'info' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>Dados Pessoais</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoField icon={Mail} label="Email" value={colaborador.email} />
                <InfoField icon={Phone} label="Telefone" value={editing ? undefined : colaborador.telefone}>
                  {editing && <input type="text" value={editForm.telefone || ''} onChange={e => setEditForm(p => ({ ...p, telefone: e.target.value }))} style={inputStyle} />}
                </InfoField>
                <InfoField icon={Calendar} label="Data Nascimento" value={editing ? undefined : colaborador.data_nascimento}>
                  {editing && <input type="date" value={editForm.data_nascimento || ''} onChange={e => setEditForm(p => ({ ...p, data_nascimento: e.target.value }))} style={inputStyle} />}
                </InfoField>
                <InfoField icon={Home} label="Morada" value={editing ? undefined : colaborador.morada}>
                  {editing && <input type="text" value={editForm.morada || ''} onChange={e => setEditForm(p => ({ ...p, morada: e.target.value }))} style={inputStyle} />}
                </InfoField>
                <InfoField icon={FileText} label="NIF" value={editing ? undefined : colaborador.nif}>
                  {editing && <input type="text" value={editForm.nif || ''} onChange={e => setEditForm(p => ({ ...p, nif: e.target.value }))} style={inputStyle} />}
                </InfoField>
                <InfoField icon={Euro} label="IBAN" value={editing ? undefined : colaborador.iban}>
                  {editing && <input type="text" value={editForm.iban || ''} onChange={e => setEditForm(p => ({ ...p, iban: e.target.value }))} style={inputStyle} />}
                </InfoField>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>Dados Profissionais</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoField icon={Briefcase} label="Cargo" value={editing ? undefined : colaborador.cargo}>
                  {editing && <input type="text" value={editForm.cargo || ''} onChange={e => setEditForm(p => ({ ...p, cargo: e.target.value }))} style={inputStyle} />}
                </InfoField>
                <InfoField icon={Building2} label="Departamento" value={editing ? undefined : colaborador.departamento}>
                  {editing && (
                    <select value={editForm.departamento || ''} onChange={e => setEditForm(p => ({ ...p, departamento: e.target.value }))} style={inputStyle}>
                      <option value="">Selecionar...</option>
                      {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </InfoField>
                <InfoField icon={Shield} label="Permissão" value={editing ? undefined : ROLES.find(r => r.value === colaborador.role)?.label || colaborador.role}>
                  {editing && (
                    <select value={editForm.role || ''} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  )}
                </InfoField>
                <InfoField icon={FileText} label="Tipo Contrato" value={editing ? undefined : colaborador.tipo_contrato}>
                  {editing && (
                    <select value={editForm.tipo_contrato || ''} onChange={e => setEditForm(p => ({ ...p, tipo_contrato: e.target.value }))} style={inputStyle}>
                      <option value="">Selecionar...</option>
                      <option value="interno">Interno</option>
                      <option value="prestador">Prestador</option>
                      <option value="estagiario">Estagiário</option>
                    </select>
                  )}
                </InfoField>
                <InfoField icon={Wifi} label="Regime" value={editing ? undefined : colaborador.regime}>
                  {editing && (
                    <select value={editForm.regime || ''} onChange={e => setEditForm(p => ({ ...p, regime: e.target.value }))} style={inputStyle}>
                      <option value="">Selecionar...</option>
                      <option value="presencial">Presencial</option>
                      <option value="remoto">Remoto</option>
                      <option value="hibrido">Híbrido</option>
                    </select>
                  )}
                </InfoField>
                <InfoField icon={Clock} label="Horário" value={editing ? undefined : `${colaborador.horario_inicio || '09:00'} - ${colaborador.horario_fim || '18:00'}`}>
                  {editing && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="time" value={editForm.horario_inicio || '09:00'} onChange={e => setEditForm(p => ({ ...p, horario_inicio: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                      <span style={{ color: 'var(--brown-light)' }}>-</span>
                      <input type="time" value={editForm.horario_fim || '18:00'} onChange={e => setEditForm(p => ({ ...p, horario_fim: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  )}
                </InfoField>
                <InfoField icon={Calendar} label="Data Entrada" value={colaborador.data_entrada} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Projetos */}
      {activeTab === 'projetos' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>Projetos Alocados</h3>
          {projetos.length === 0 ? (
            <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>Sem projetos alocados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projetos.map(pe => (
                <div
                  key={pe.id}
                  onClick={() => navigate(`/projetos/${pe.projetos?.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--cream)', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>{pe.projetos?.codigo} - {pe.projetos?.nome}</div>
                    <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>{pe.funcao || 'Membro'}</div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: pe.projetos?.status === 'em_curso' ? 'rgba(34,197,94,0.1)' : 'rgba(200,180,160,0.2)',
                    color: pe.projetos?.status === 'em_curso' ? '#16a34a' : 'var(--brown-light)'
                  }}>
                    {pe.projetos?.status || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Ausências */}
      {activeTab === 'ausencias' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>Historial de Ausências</h3>
          {ausencias.length === 0 ? (
            <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>Sem ausências registadas</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--stone)' }}>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Início</th>
                  <th style={thStyle}>Fim</th>
                  <th style={thStyle}>Dias</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ausencias.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--stone-light, #f0ebe5)' }}>
                    <td style={tdStyle}>{a.tipo || 'Férias'}</td>
                    <td style={tdStyle}>{a.data_inicio}</td>
                    <td style={tdStyle}>{a.data_fim}</td>
                    <td style={tdStyle}>{a.dias_uteis || '-'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        background: a.estado === 'aprovada' ? 'rgba(34,197,94,0.1)' : a.estado === 'pendente' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: a.estado === 'aprovada' ? '#16a34a' : a.estado === 'pendente' ? '#d97706' : '#dc2626'
                      }}>
                        {a.estado || 'pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Timesheets */}
      {activeTab === 'timesheets' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>Registo de Horas</h3>
          {timesheets.length === 0 ? (
            <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>Sem timesheets registados</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--stone)' }}>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Projeto</th>
                  <th style={thStyle}>Horas</th>
                  <th style={thStyle}>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--stone-light, #f0ebe5)' }}>
                    <td style={tdStyle}>{t.data}</td>
                    <td style={tdStyle}>{t.projetos?.codigo || '-'}</td>
                    <td style={tdStyle}>{t.horas}h</td>
                    <td style={{ ...tdStyle, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descricao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// Helper component
function InfoField({ icon: Icon, label, value, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <Icon size={16} style={{ color: 'var(--brown-light)', marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '2px' }}>{label}</div>
        {children || (
          <div style={{ fontSize: '13px', color: 'var(--brown)', fontWeight: 500 }}>{value || '-'}</div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid var(--stone)',
  borderRadius: '6px',
  fontSize: '13px',
  background: 'var(--cream)',
  color: 'var(--brown)'
}

const thStyle = {
  textAlign: 'left',
  padding: '8px 12px',
  color: 'var(--brown-light)',
  fontWeight: 500,
  fontSize: '11px',
  textTransform: 'uppercase'
}

const tdStyle = {
  padding: '10px 12px',
  color: 'var(--brown)'
}
