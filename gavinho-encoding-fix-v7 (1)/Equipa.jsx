import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  User,
  Plus, 
  Search,
  Filter,
  Calendar,
  Clock,
  FileText,
  Upload,
  Download,
  Check,
  X,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Euro,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Home,
  Wifi,
  CalendarDays,
  Receipt,
  Timer,
  UserCheck,
  Send,
  Shield,
  Lock
} from 'lucide-react';

export default function Equipa() {
  const { profile, isAdmin } = useAuth();
  const [utilizadores, setUtilizadores] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('perfil');
  const [mainView, setMainView] = useState('equipa'); // 'equipa', 'aprovacoes' ou 'gestao_rh'
  const [showModal, setShowModal] = useState(null);
  
  // Gestão RH (admin)
  const [encerramentos, setEncerramentos] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [pedidosAusenciaPendentes, setPedidosAusenciaPendentes] = useState([]);
  const [recibosPendentes, setRecibosPendentes] = useState([]);
  const [showEncerramentoModal, setShowEncerramentoModal] = useState(false);
  const [anoGestao, setAnoGestao] = useState(new Date().getFullYear());
  const [encerramentoForm, setEncerramentoForm] = useState({
    data: '',
    descricao: '',
    conta_como_ferias: true
  });
  
  // Modal de aprovação
  const [approvalModal, setApprovalModal] = useState(null);
  const [approvalData, setApprovalData] = useState({
    role: 'user',
    cargo: '',
    departamento: 'Equipa'
  });

  const ROLES = [
    { value: 'admin', label: 'Administrador', desc: 'Acesso total a todas as funcionalidades', color: '#dc2626' },
    { value: 'gestor', label: 'Gestor de Projeto', desc: 'Gestão de projetos, orçamentos e equipa', color: '#2563eb' },
    { value: 'tecnico', label: 'Técnico', desc: 'Acesso a projetos e obras atribuídas', color: '#16a34a' },
    { value: 'user', label: 'Colaborador', desc: 'Acesso básico a tarefas e diário', color: '#78716c' }
  ];

  const DEPARTAMENTOS = ['Arquitetura', 'Design Interiores', 'Construção', 'Gestão', 'Comercial', 'Administrativo'];
  const CARGOS = ['Diretor', 'Gestor de Projeto', 'Arquiteto', 'Designer', 'Engenheiro', 'Encarregado', 'Técnico', 'Administrativo', 'Estagiário'];
  
  // Dados do utilizador selecionado
  const [ausencias, setAusencias] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [recibos, setRecibos] = useState([]);
  
  // Edição de utilizador (admin)
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Filtros (só para admin)
  const [filtros, setFiltros] = useState({
    tipo_contrato: '',
    regime: '',
    departamento: '',
    search: ''
  });

  // Forms
  const [ausenciaForm, setAusenciaForm] = useState({
    tipo: 'ferias',
    data_inicio: '',
    data_fim: '',
    notas: ''
  });

  const [timesheetForm, setTimesheetForm] = useState({
    data: new Date().toISOString().split('T')[0],
    horas: 8,
    projeto_id: '',
    descricao: ''
  });

  const [reciboForm, setReciboForm] = useState({
    valor_bruto: '',
    notas: ''
  });

  useEffect(() => {
    if (profile) {
      if (isAdmin()) {
        fetchAllUsers();
      } else {
        // Colaborador: carregar apenas o próprio perfil
        setSelectedUser(profile);
        loadUserDetails(profile);
        setLoading(false);
      }
    }
  }, [profile, filtros]);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      // Buscar utilizadores ativos
      let query = supabase
        .from('utilizadores')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (filtros.tipo_contrato) query = query.eq('tipo_contrato', filtros.tipo_contrato);
      if (filtros.regime) query = query.eq('regime', filtros.regime);
      if (filtros.departamento) query = query.eq('departamento', filtros.departamento);
      if (filtros.search) {
        query = query.or(`nome.ilike.%${filtros.search}%,email.ilike.%${filtros.search}%,cargo.ilike.%${filtros.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUtilizadores(data || []);

      // Buscar utilizadores pendentes de aprovação
      const { data: pendingData } = await supabase
        .from('utilizadores')
        .select('*')
        .eq('ativo', false)
        .order('created_at', { ascending: false });
      setPendingUsers(pendingData || []);

      const { data: projetosData } = await supabase
        .from('projetos')
        .select('id, codigo, nome')
        .eq('arquivado', false)
        .order('codigo');
      setProjetos(projetosData || []);

      // Carregar dados de gestão RH (admin)
      await loadRHData();

    } catch (error) {
      console.error('Erro ao carregar equipa:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados de RH
  const loadRHData = async () => {
    try {
      // Encerramentos do ano
      const { data: encData } = await supabase
        .from('encerramentos_empresa')
        .select('*')
        .eq('ano', anoGestao)
        .order('data');
      setEncerramentos(encData || []);

      // Feriados do ano
      const { data: ferData } = await supabase
        .from('feriados_portugal')
        .select('*')
        .eq('ano', anoGestao)
        .order('data');
      setFeriados(ferData || []);

      // Pedidos de ausência pendentes (todos os colaboradores)
      const { data: pedidosData } = await supabase
        .from('pedidos_ausencia')
        .select('*, utilizador:utilizadores(nome, email)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      setPedidosAusenciaPendentes(pedidosData || []);

      // Recibos pendentes
      const { data: recibosData } = await supabase
        .from('recibos_mensais')
        .select('*, utilizador:utilizadores(nome, email)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      setRecibosPendentes(recibosData || []);
    } catch (err) {
      console.error('Erro ao carregar dados RH:', err);
    }
  };

  // Adicionar encerramento
  const handleAddEncerramento = async () => {
    if (!encerramentoForm.data) {
      alert('Selecione uma data');
      return;
    }
    try {
      const { error } = await supabase
        .from('encerramentos_empresa')
        .insert({
          ano: new Date(encerramentoForm.data).getFullYear(),
          data: encerramentoForm.data,
          descricao: encerramentoForm.descricao || 'Encerramento',
          conta_como_ferias: encerramentoForm.conta_como_ferias,
          created_by: profile.id
        });
      if (error) throw error;
      setShowEncerramentoModal(false);
      setEncerramentoForm({ data: '', descricao: '', conta_como_ferias: true });
      loadRHData();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Remover encerramento
  const handleDeleteEncerramento = async (id) => {
    if (!confirm('Remover este dia de encerramento?')) return;
    try {
      await supabase.from('encerramentos_empresa').delete().eq('id', id);
      loadRHData();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Aprovar/Rejeitar pedido de ausência
  const handleAprovarAusencia = async (pedido, aprovar, notas = '') => {
    try {
      const { error } = await supabase
        .from('pedidos_ausencia')
        .update({
          status: aprovar ? 'aprovado' : 'rejeitado',
          aprovado_por: profile.id,
          data_aprovacao: new Date().toISOString(),
          notas_aprovacao: notas || null
        })
        .eq('id', pedido.id);
      if (error) throw error;
      loadRHData();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Aprovar/Rejeitar/Pagar recibo
  const handleAprovarRecibo = async (recibo, status) => {
    try {
      const updates = {
        status,
        aprovado_por: profile.id,
        data_aprovacao: new Date().toISOString()
      };
      if (status === 'pago') {
        updates.data_pagamento = new Date().toISOString().split('T')[0];
      }
      const { error } = await supabase
        .from('recibos_mensais')
        .update(updates)
        .eq('id', recibo.id);
      if (error) throw error;
      loadRHData();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Aprovar utilizador
  const openApprovalModal = (user) => {
    setApprovalData({
      role: 'user',
      cargo: user.funcao || '',
      departamento: 'Equipa'
    });
    setApprovalModal(user);
  };

  const handleApproveUser = async () => {
    if (!approvalModal) return;
    
    try {
      const { error } = await supabase
        .from('utilizadores')
        .update({ 
          ativo: true, 
          role: approvalData.role,
          cargo: approvalData.cargo,
          departamento: approvalData.departamento
        })
        .eq('id', approvalModal.id);

      if (error) throw error;
      setPendingUsers(prev => prev.filter(u => u.id !== approvalModal.id));
      setApprovalModal(null);
      fetchAllUsers(); // Refresh lista
      alert(`${approvalModal.nome} foi aprovado como ${ROLES.find(r => r.value === approvalData.role)?.label}!`);
    } catch (err) {
      console.error('Erro ao aprovar:', err);
      alert('Erro ao aprovar utilizador');
    }
  };

  const handleRejectUser = async (user) => {
    if (!confirm(`Rejeitar o pedido de ${user.nome}? Esta ação não pode ser revertida.`)) return;

    try {
      const { error } = await supabase.from('utilizadores').delete().eq('id', user.id);
      if (error) throw error;
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));
      alert(`Pedido de ${user.nome} foi rejeitado.`);
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
      alert('Erro ao rejeitar utilizador');
    }
  };

  // Editar utilizador
  const startEditing = () => {
    setEditForm({
      nome: selectedUser.nome || '',
      email: selectedUser.email || '',
      telefone: selectedUser.telefone || '',
      cargo: selectedUser.cargo || '',
      departamento: selectedUser.departamento || '',
      role: selectedUser.role || 'user',
      tipo_contrato: selectedUser.tipo_contrato || 'interno',
      regime: selectedUser.regime || 'presencial',
      nif: selectedUser.nif || '',
      iban: selectedUser.iban || '',
      morada: selectedUser.morada || '',
      horario_inicio: selectedUser.horario_inicio || '09:00',
      horario_fim: selectedUser.horario_fim || '18:00',
      dias_ferias_disponiveis: selectedUser.dias_ferias_disponiveis || 22,
      data_entrada: selectedUser.data_entrada || '',
      data_nascimento: selectedUser.data_nascimento || ''
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveUserEdit = async () => {
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('utilizadores')
        .update({
          nome: editForm.nome,
          telefone: editForm.telefone || null,
          cargo: editForm.cargo || null,
          departamento: editForm.departamento || null,
          role: editForm.role,
          tipo_contrato: editForm.tipo_contrato,
          regime: editForm.regime,
          nif: editForm.nif || null,
          iban: editForm.iban || null,
          morada: editForm.morada || null,
          horario_inicio: editForm.horario_inicio || null,
          horario_fim: editForm.horario_fim || null,
          dias_ferias_disponiveis: parseInt(editForm.dias_ferias_disponiveis) || 22,
          data_entrada: editForm.data_entrada || null,
          data_nascimento: editForm.data_nascimento || null
        })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Atualizar o utilizador selecionado e a lista
      const updatedUser = { ...selectedUser, ...editForm };
      setSelectedUser(updatedUser);
      setUtilizadores(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      setIsEditing(false);
      alert('Utilizador atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao guardar:', err);
      alert(`Erro ao guardar: ${err.message || 'Verifique permissões RLS no Supabase'}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteUser = async () => {
    if (!confirm(`Tem a certeza que deseja remover ${selectedUser.nome}? Esta ação não pode ser revertida.`)) return;

    try {
      const { error } = await supabase.from('utilizadores').delete().eq('id', selectedUser.id);
      if (error) throw error;
      setUtilizadores(prev => prev.filter(u => u.id !== selectedUser.id));
      setSelectedUser(null);
      alert('Utilizador removido com sucesso.');
    } catch (err) {
      console.error('Erro ao remover:', err);
      alert('Erro ao remover utilizador');
    }
  };

  const loadUserDetails = async (user) => {
    setSelectedUser(user);
    setActiveTab('perfil');

    // Carregar ausências
    const { data: ausenciasData } = await supabase
      .from('ausencias')
      .select('*')
      .eq('utilizador_id', user.id)
      .order('data_inicio', { ascending: false });
    setAusencias(ausenciasData || []);

    // Carregar timesheets (último mês)
    const umMesAtras = new Date();
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);
    const { data: timesheetsData } = await supabase
      .from('timesheets')
      .select('*, projetos:projeto_id(codigo, nome)')
      .eq('utilizador_id', user.id)
      .gte('data', umMesAtras.toISOString().split('T')[0])
      .order('data', { ascending: false });
    setTimesheets(timesheetsData || []);

    // Carregar recibos (se prestador)
    if (user.tipo_contrato === 'prestador') {
      const { data: recibosData } = await supabase
        .from('recibos_prestadores')
        .select('*')
        .eq('utilizador_id', user.id)
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });
      setRecibos(recibosData || []);
    }

    // Carregar projetos para dropdown
    if (projetos.length === 0) {
      const { data: projetosData } = await supabase
        .from('projetos')
        .select('id, codigo, nome')
        .eq('arquivado', false)
        .order('codigo');
      setProjetos(projetosData || []);
    }
  };

  // Verificar se pode editar o utilizador
  const canEdit = (user) => {
    if (isAdmin()) return true;
    return profile?.id === user?.id;
  };

  // Criar ausência
  const handleCreateAusencia = async () => {
    if (!ausenciaForm.data_inicio || !ausenciaForm.data_fim) {
      alert('Preencha as datas');
      return;
    }

    try {
      const { error } = await supabase
        .from('ausencias')
        .insert({
          utilizador_id: selectedUser.id,
          tipo: ausenciaForm.tipo,
          data_inicio: ausenciaForm.data_inicio,
          data_fim: ausenciaForm.data_fim,
          notas: ausenciaForm.notas || null,
          status: ausenciaForm.tipo === 'ferias' ? 'pendente' : 'aprovada'
        });

      if (error) throw error;

      setShowModal(null);
      setAusenciaForm({ tipo: 'ferias', data_inicio: '', data_fim: '', notas: '' });
      loadUserDetails(selectedUser);
    } catch (error) {
      console.error('Erro ao criar ausência:', error);
      alert('Erro ao criar ausência');
    }
  };

  // Aprovar/Rejeitar ausência (só admin)
  const handleAusenciaAction = async (ausencia, action) => {
    if (!isAdmin()) {
      alert('Sem permissão');
      return;
    }

    try {
      const updateData = {
        status: action,
        aprovado_por: profile?.id,
        data_aprovacao: new Date().toISOString()
      };

      if (action === 'rejeitada') {
        const motivo = prompt('Motivo da rejeição:');
        if (!motivo) return;
        updateData.motivo_rejeicao = motivo;
      }

      const { error } = await supabase
        .from('ausencias')
        .update(updateData)
        .eq('id', ausencia.id);

      if (error) throw error;
      loadUserDetails(selectedUser);
    } catch (error) {
      console.error('Erro ao atualizar ausência:', error);
    }
  };

  // Registar timesheet
  const handleCreateTimesheet = async () => {
    if (!timesheetForm.horas) {
      alert('Preencha as horas');
      return;
    }

    try {
      const { error } = await supabase
        .from('timesheets')
        .insert({
          utilizador_id: selectedUser.id,
          data: timesheetForm.data,
          horas: parseFloat(timesheetForm.horas),
          projeto_id: timesheetForm.projeto_id || null,
          descricao: timesheetForm.descricao || null
        });

      if (error) throw error;

      setShowModal(null);
      setTimesheetForm({ data: new Date().toISOString().split('T')[0], horas: 8, projeto_id: '', descricao: '' });
      loadUserDetails(selectedUser);
    } catch (error) {
      console.error('Erro ao registar timesheet:', error);
      alert('Erro ao registar horas');
    }
  };

  // Submeter recibo
  const handleSubmitRecibo = async () => {
    if (!reciboForm.valor_bruto) {
      alert('Preencha o valor');
      return;
    }

    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();

    try {
      const { data: existing } = await supabase
        .from('recibos_prestadores')
        .select('id')
        .eq('utilizador_id', selectedUser.id)
        .eq('mes', mesAtual)
        .eq('ano', anoAtual)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('recibos_prestadores')
          .update({
            valor_bruto: parseFloat(reciboForm.valor_bruto),
            valor_liquido: parseFloat(reciboForm.valor_bruto),
            status: 'submetido',
            recibo_data_submissao: new Date().toISOString(),
            notas: reciboForm.notas || null
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recibos_prestadores')
          .insert({
            utilizador_id: selectedUser.id,
            mes: mesAtual,
            ano: anoAtual,
            valor_bruto: parseFloat(reciboForm.valor_bruto),
            valor_liquido: parseFloat(reciboForm.valor_bruto),
            status: 'submetido',
            recibo_data_submissao: new Date().toISOString(),
            notas: reciboForm.notas || null
          });

        if (error) throw error;
      }

      setShowModal(null);
      setReciboForm({ valor_bruto: '', notas: '' });
      loadUserDetails(selectedUser);
    } catch (error) {
      console.error('Erro ao submeter recibo:', error);
      alert('Erro ao submeter recibo');
    }
  };

  // Marcar recibo como pago (só admin)
  const handleMarcarPago = async (recibo) => {
    if (!isAdmin()) {
      alert('Sem permissão');
      return;
    }

    try {
      const { error } = await supabase
        .from('recibos_prestadores')
        .update({
          status: 'pago',
          processado_por: profile?.id,
          data_pagamento: new Date().toISOString().split('T')[0],
          comprovativo_data: new Date().toISOString()
        })
        .eq('id', recibo.id);

      if (error) throw error;
      loadUserDetails(selectedUser);
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
    }
  };

  // Helpers
  const getRegimeIcon = (regime) => {
    if (regime === 'presencial') return <Building2 size={14} />;
    if (regime === 'remoto') return <Wifi size={14} />;
    return <Home size={14} />;
  };

  const getStatusConfig = (status) => {
    const configs = {
      pendente: { label: 'Pendente', bg: '#fef3c7', color: '#b45309' },
      aprovada: { label: 'Aprovada', bg: '#d1fae5', color: '#047857' },
      rejeitada: { label: 'Rejeitada', bg: '#fee2e2', color: '#b91c1c' },
      cancelada: { label: 'Cancelada', bg: '#f5f5f4', color: '#78716c' },
      submetido: { label: 'Submetido', bg: '#dbeafe', color: '#1d4ed8' },
      pago: { label: 'Pago', bg: '#d1fae5', color: '#047857' }
    };
    return configs[status] || { label: status, bg: '#f5f5f4', color: '#78716c' };
  };

  const getTipoAusenciaLabel = (tipo) => {
    const labels = {
      ferias: 'Férias',
      doenca_atestado: 'Doença (c/ atestado)',
      doenca_falta: 'Doença (falta)',
      falta: 'Falta',
      licenca_parental: 'Licença Parental',
      licenca_casamento: 'Licença Casamento',
      licenca_luto: 'Licença Luto',
      licenca_outras: 'Outras Licenças',
      compensacao: 'Compensação',
      formacao: 'Formação'
    };
    return labels[tipo] || tipo;
  };

  // KPIs (só para admin)
  const kpis = {
    total: utilizadores.length,
    internos: utilizadores.filter(u => u.tipo_contrato === 'interno').length,
    prestadores: utilizadores.filter(u => u.tipo_contrato === 'prestador').length,
    presenciais: utilizadores.filter(u => u.regime === 'presencial').length,
    remotos: utilizadores.filter(u => u.regime === 'remoto').length
  };

  // Estilos
  const styles = {
    container: { minHeight: '100vh', background: '#F8F7F4' },
    header: { background: 'white', borderBottom: '1px solid #e7e5e4', padding: '24px 32px' },
    headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: '28px', fontWeight: '300', color: '#44403c', margin: 0 },
    subtitle: { color: '#78716c', marginTop: '4px', fontSize: '14px' },
    roleBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '20px' },
    kpiCard: { background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e7e5e4' },
    kpiValue: { fontSize: '24px', fontWeight: '600', color: '#44403c' },
    kpiLabel: { fontSize: '12px', color: '#78716c', marginTop: '4px' },
    mainLayout: { display: 'flex' },
    sidebar: { width: '280px', background: 'white', borderRight: '1px solid #e7e5e4', minHeight: 'calc(100vh - 160px)' },
    sidebarHeader: { padding: '16px', borderBottom: '1px solid #f5f5f4' },
    searchInput: { width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    filterRow: { display: 'flex', gap: '8px', marginTop: '12px' },
    filterSelect: { flex: 1, padding: '6px 10px', border: '1px solid #e7e5e4', borderRadius: '6px', fontSize: '12px', outline: 'none', background: 'white' },
    userList: { overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' },
    userCard: { padding: '12px 16px', borderBottom: '1px solid #f5f5f4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '500', color: '#5F5C59' },
    userName: { fontWeight: '500', color: '#44403c', fontSize: '14px' },
    userMeta: { fontSize: '12px', color: '#78716c', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' },
    mainContent: { flex: 1, padding: '24px' },
    profileHeader: { background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '20px', border: '1px solid #e7e5e4' },
    profileTop: { display: 'flex', alignItems: 'flex-start', gap: '20px' },
    profileAvatar: { width: '80px', height: '80px', borderRadius: '50%', background: '#e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '500', color: '#5F5C59' },
    profileInfo: { flex: 1 },
    profileName: { fontSize: '24px', fontWeight: '500', color: '#44403c', margin: 0 },
    profileCargo: { fontSize: '14px', color: '#78716c', marginTop: '4px' },
    profileMeta: { display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' },
    metaItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#78716c' },
    profileStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f5f5f4' },
    statBox: { textAlign: 'center' },
    statValue: { fontSize: '20px', fontWeight: '600', color: '#44403c' },
    statLabel: { fontSize: '11px', color: '#a8a29e', marginTop: '2px' },
    tabs: { display: 'flex', gap: '4px', marginBottom: '20px' },
    tab: { padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', background: 'transparent', color: '#78716c' },
    tabActive: { background: '#5F5C59', color: 'white' },
    section: { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e7e5e4' },
    sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
    sectionTitle: { fontSize: '16px', fontWeight: '500', color: '#44403c' },
    btnPrimary: { display: 'flex', alignItems: 'center', gap: '8px', background: '#5F5C59', color: 'white', padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#a8a29e', textTransform: 'uppercase', borderBottom: '1px solid #e7e5e4' },
    td: { padding: '12px', fontSize: '13px', color: '#44403c', borderBottom: '1px solid #f5f5f4' },
    actionBtn: { padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    modalContent: { background: 'white', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    modalBody: { padding: '24px' },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #e7e5e4', display: 'flex', justifyContent: 'flex-end', gap: '12px' },
    formGroup: { marginBottom: '16px' },
    formLabel: { display: 'block', fontSize: '13px', fontWeight: '500', color: '#44403c', marginBottom: '6px' },
    formInput: { width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    empty: { textAlign: 'center', padding: '40px', color: '#a8a29e' }
  };

  // Render para colaborador (sem sidebar de lista)
  const renderColaboradorView = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>O Meu Perfil</h1>
            <p style={styles.subtitle}>Gerir informações pessoais, ausências e timesheets</p>
          </div>
          <div style={{ ...styles.roleBadge, background: '#dbeafe', color: '#1d4ed8' }}>
            <User size={14} />
            Colaborador
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        {renderProfileContent()}
      </div>
    </div>
  );

  // Render para admin (com sidebar de lista)
  const renderAdminView = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>Recursos Humanos</h1>
            <p style={styles.subtitle}>Gestão de colaboradores, ausências e timesheets</p>
          </div>
          <div style={{ ...styles.roleBadge, background: '#fef3c7', color: '#b45309' }}>
            <Shield size={14} />
            Administração
          </div>
        </div>

        {/* Alerta de Aprovações Pendentes */}
        {pendingUsers.length > 0 && (
          <div style={{ 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
            border: '2px solid #f59e0b',
            borderRadius: '12px', 
            padding: '16px 20px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#92400e' }}>
                  {pendingUsers.length} pedido{pendingUsers.length > 1 ? 's' : ''} de registo pendente{pendingUsers.length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '12px', color: '#b45309' }}>
                  Clica para rever e aprovar os novos utilizadores
                </div>
              </div>
            </div>
            <button 
              onClick={() => setMainView(mainView === 'aprovacoes' ? 'equipa' : 'aprovacoes')}
              style={{ 
                padding: '10px 20px', 
                background: '#f59e0b', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {mainView === 'aprovacoes' ? 'Ver Equipa' : 'Ver Pedidos'}
            </button>
          </div>
        )}

        {/* Tabs de navegação */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '20px',
          background: '#f5f5f4',
          padding: '4px',
          borderRadius: '10px',
          width: 'fit-content'
        }}>
          <button
            onClick={() => setMainView('equipa')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: mainView === 'equipa' ? 'white' : 'transparent',
              boxShadow: mainView === 'equipa' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: mainView === 'equipa' ? '#44403c' : '#78716c',
              fontWeight: mainView === 'equipa' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Users size={16} />
            Equipa ({utilizadores.length})
          </button>
          <button
            onClick={() => setMainView('aprovacoes')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: mainView === 'aprovacoes' ? 'white' : 'transparent',
              boxShadow: mainView === 'aprovacoes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: mainView === 'aprovacoes' ? '#44403c' : '#78716c',
              fontWeight: mainView === 'aprovacoes' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <UserCheck size={16} />
            Aprovações
            {pendingUsers.length > 0 && (
              <span style={{ 
                background: '#f59e0b', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '10px', 
                fontSize: '11px', 
                fontWeight: 600 
              }}>
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMainView('gestao_rh')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: mainView === 'gestao_rh' ? 'white' : 'transparent',
              boxShadow: mainView === 'gestao_rh' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              color: mainView === 'gestao_rh' ? '#44403c' : '#78716c',
              fontWeight: mainView === 'gestao_rh' ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <CalendarDays size={16} />
            Gestão RH
            {(pedidosAusenciaPendentes.length + recibosPendentes.length) > 0 && (
              <span style={{ 
                background: '#dc2626', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '10px', 
                fontSize: '11px', 
                fontWeight: 600 
              }}>
                {pedidosAusenciaPendentes.length + recibosPendentes.length}
              </span>
            )}
          </button>
        </div>

        {/* Vista de Aprovações */}
        {mainView === 'aprovacoes' && (
          <div style={{ marginBottom: '24px' }}>
            {pendingUsers.length === 0 ? (
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '40px', 
                textAlign: 'center',
                border: '1px solid #e7e5e4'
              }}>
                <CheckCircle size={48} style={{ color: '#16a34a', marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>Tudo em dia!</h3>
                <p style={{ margin: 0, color: '#78716c', fontSize: '14px' }}>
                  Não há pedidos de registo pendentes de aprovação.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingUsers.map(user => (
                  <div key={user.id} style={{ 
                    background: 'white', 
                    borderRadius: '12px', 
                    padding: '20px',
                    border: '1px solid #e7e5e4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ 
                      width: '50px', 
                      height: '50px', 
                      borderRadius: '50%', 
                      background: '#e7e5e4', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#78716c'
                    }}>
                      {user.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{user.nome}</div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#78716c' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={14} /> {user.email}
                        </span>
                        {user.telefone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={14} /> {user.telefone}
                          </span>
                        )}
                      </div>
                      {user.funcao && (
                        <div style={{ fontSize: '12px', color: '#a8a29e', marginTop: '4px' }}>
                          Função indicada: {user.funcao}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => openApprovalModal(user)}
                        style={{ 
                          padding: '10px 20px', 
                          background: '#16a34a', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Check size={16} /> Aprovar
                      </button>
                      <button 
                        onClick={() => handleRejectUser(user)}
                        style={{ 
                          padding: '10px 20px', 
                          background: '#fef2f2', 
                          color: '#dc2626', 
                          border: '1px solid #fecaca', 
                          borderRadius: '8px', 
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <X size={16} /> Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vista de Gestão RH */}
        {mainView === 'gestao_rh' && (
          <div style={{ marginBottom: '24px' }}>
            {/* Sub-tabs de RH */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setAnoGestao(anoGestao - 1)}
                style={{ padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
              >
                â† {anoGestao - 1}
              </button>
              <span style={{ padding: '8px 16px', fontWeight: 600, fontSize: '16px' }}>{anoGestao}</span>
              <button
                onClick={() => setAnoGestao(anoGestao + 1)}
                style={{ padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
              >
                {anoGestao + 1} â†’
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Encerramentos da Empresa */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e7e5e4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>ðŸ¢ Encerramentos {anoGestao}</h3>
                  <button
                    onClick={() => setShowEncerramentoModal(true)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 12px', background: '#44403c', color: 'white', 
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                    }}
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                
                {encerramentos.length === 0 ? (
                  <p style={{ color: '#78716c', textAlign: 'center', padding: '20px' }}>
                    Sem encerramentos definidos para {anoGestao}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {encerramentos.map(enc => (
                      <div key={enc.id} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', background: enc.conta_como_ferias ? '#fef3c7' : '#f5f5f4',
                        borderRadius: '6px', fontSize: '13px'
                      }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>{enc.descricao}</span>
                          {enc.conta_como_ferias && (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#fcd34d', color: '#92400e', borderRadius: '4px', fontSize: '10px' }}>
                              conta como férias
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#78716c' }}>
                            {new Date(enc.data).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <button
                            onClick={() => handleDeleteEncerramento(enc.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p style={{ fontSize: '11px', color: '#78716c', marginTop: '12px' }}>
                  ðŸ’¡ Dias que não são feriados nacionais contam como férias do colaborador.
                </p>
              </div>

              {/* Feriados Portugal */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e7e5e4' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>ðŸ‡µðŸ‡¹ Feriados Portugal {anoGestao}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                  {feriados.length > 0 ? feriados.map(fer => (
                    <div key={fer.id} style={{ 
                      display: 'flex', justifyContent: 'space-between',
                      padding: '8px 12px', background: '#f5f5f4', borderRadius: '6px', fontSize: '13px'
                    }}>
                      <span>{fer.nome}</span>
                      <span style={{ color: '#78716c' }}>
                        {new Date(fer.data).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )) : (
                    <p style={{ color: '#78716c', textAlign: 'center', padding: '20px' }}>
                      Feriados não carregados. Execute o SQL para adicionar.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pedidos de Ausência Pendentes */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e7e5e4', marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
                ðŸ“‹ Pedidos de Ausência Pendentes
                {pedidosAusenciaPendentes.length > 0 && (
                  <span style={{ marginLeft: '8px', padding: '4px 10px', background: '#fef3c7', color: '#d97706', borderRadius: '10px', fontSize: '12px' }}>
                    {pedidosAusenciaPendentes.length}
                  </span>
                )}
              </h3>
              
              {pedidosAusenciaPendentes.length === 0 ? (
                <p style={{ color: '#78716c', textAlign: 'center', padding: '20px' }}>
                  âœ“ Sem pedidos pendentes
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pedidosAusenciaPendentes.map(pedido => (
                    <div key={pedido.id} style={{ 
                      padding: '16px', background: '#fafaf9', borderRadius: '8px',
                      borderLeft: '4px solid #d97706'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{pedido.utilizador?.nome || 'Colaborador'}</span>
                          <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#e7e5e4', borderRadius: '4px', fontSize: '11px' }}>
                            {pedido.tipo}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#78716c' }}>
                          {new Date(pedido.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#57534e', marginBottom: '12px' }}>
                        {new Date(pedido.data_inicio).toLocaleDateString('pt-PT')} â†’ {new Date(pedido.data_fim).toLocaleDateString('pt-PT')}
                        <span style={{ marginLeft: '8px', fontWeight: 500 }}>({pedido.dias_uteis} dias úteis)</span>
                      </div>
                      {pedido.motivo && (
                        <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '12px' }}>
                          {pedido.motivo}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAprovarAusencia(pedido, true)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '6px 12px', background: '#16a34a', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          <Check size={14} /> Aprovar
                        </button>
                        <button
                          onClick={() => {
                            const notas = prompt('Motivo da rejeição:');
                            if (notas !== null) handleAprovarAusencia(pedido, false, notas);
                          }}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '6px 12px', background: '#dc2626', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          <X size={14} /> Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recibos Pendentes */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e7e5e4', marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
                ðŸ’° Recibos Pendentes (Prestadores)
                {recibosPendentes.length > 0 && (
                  <span style={{ marginLeft: '8px', padding: '4px 10px', background: '#dbeafe', color: '#2563eb', borderRadius: '10px', fontSize: '12px' }}>
                    {recibosPendentes.length}
                  </span>
                )}
              </h3>
              
              {recibosPendentes.length === 0 ? (
                <p style={{ color: '#78716c', textAlign: 'center', padding: '20px' }}>
                  âœ“ Sem recibos pendentes
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e7e5e4' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Colaborador</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Período</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Valor Bruto</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Valor Líquido</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibosPendentes.map(recibo => (
                      <tr key={recibo.id} style={{ borderBottom: '1px solid #e7e5e4' }}>
                        <td style={{ padding: '10px' }}>{recibo.utilizador?.nome || '-'}</td>
                        <td style={{ padding: '10px' }}>
                          {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][recibo.mes - 1]} {recibo.ano}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>{recibo.valor_bruto?.toLocaleString('pt-PT')} â‚¬</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>{recibo.valor_liquido?.toLocaleString('pt-PT')} â‚¬</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleAprovarRecibo(recibo, 'aprovado')}
                              style={{ padding: '4px 8px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleAprovarRecibo(recibo, 'pago')}
                              style={{ padding: '4px 8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Pagar
                            </button>
                            <button
                              onClick={() => handleAprovarRecibo(recibo, 'rejeitado')}
                              style={{ padding: '4px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {mainView === 'equipa' && (
          <>
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>{kpis.total}</div>
            <div style={styles.kpiLabel}>Total Equipa</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>{kpis.internos}</div>
            <div style={styles.kpiLabel}>Internos</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>{kpis.prestadores}</div>
            <div style={styles.kpiLabel}>Prestadores</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>{kpis.presenciais}</div>
            <div style={styles.kpiLabel}>Presenciais</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiValue}>{kpis.remotos}</div>
            <div style={styles.kpiLabel}>Remotos</div>
          </div>
        </div>
          </>
        )}
      </div>

      {mainView === 'equipa' && (
      <div style={styles.mainLayout}>
        {/* Sidebar - Lista de utilizadores */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a8a29e' }} />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={filtros.search}
                onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.filterRow}>
              <select
                value={filtros.tipo_contrato}
                onChange={(e) => setFiltros({ ...filtros, tipo_contrato: e.target.value })}
                style={styles.filterSelect}
              >
                <option value="">Todos</option>
                <option value="interno">Internos</option>
                <option value="prestador">Prestadores</option>
              </select>
              <select
                value={filtros.regime}
                onChange={(e) => setFiltros({ ...filtros, regime: e.target.value })}
                style={styles.filterSelect}
              >
                <option value="">Regime</option>
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>
          </div>

          <div style={styles.userList}>
            {utilizadores.map(user => (
              <div
                key={user.id}
                onClick={() => loadUserDetails(user)}
                style={{
                  ...styles.userCard,
                  background: selectedUser?.id === user.id ? '#fafaf9' : 'transparent'
                }}
              >
                <div style={styles.avatar}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    user.nome?.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.userName}>{user.nome}</div>
                  <div style={styles.userMeta}>
                    <span>{user.cargo || 'Sem cargo'}</span>
                    {user.tipo_contrato === 'prestador' && (
                      <span style={{ ...styles.badge, background: '#dbeafe', color: '#1d4ed8' }}>Prestador</span>
                    )}
                    {user.role === 'admin' && (
                      <span style={{ ...styles.badge, background: '#fef3c7', color: '#b45309' }}>Admin</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a8a29e' }}>
                  {getRegimeIcon(user.regime)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {!selectedUser ? (
            <div style={{ ...styles.empty, marginTop: '100px' }}>
              <Users size={48} style={{ color: '#d6d3d1', marginBottom: '16px' }} />
              <p>Selecione um colaborador para ver detalhes</p>
            </div>
          ) : (
            renderProfileContent()
          )}
        </div>
      </div>
      )}
    </div>
  );

  // Render do conteúdo do perfil (comum a ambas views)
  const renderProfileContent = () => {
    if (!selectedUser) return null;

    // Se está em modo edição, mostrar formulário
    if (isEditing && isAdmin()) {
      return (
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Editar Utilizador</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={cancelEditing} style={{ padding: '8px 16px', background: '#f5f5f4', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                Cancelar
              </button>
              <button onClick={saveUserEdit} disabled={savingEdit} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {savingEdit ? 'A guardar...' : <><Check size={14} /> Guardar</>}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {/* Nome */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Nome</label>
              <input type="text" value={editForm.nome} onChange={e => setEditForm({...editForm, nome: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* Email (só leitura) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Email</label>
              <input type="email" value={editForm.email} disabled style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#f5f5f4', color: '#78716c' }} />
            </div>

            {/* Telefone */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Telefone</label>
              <input type="tel" value={editForm.telefone} onChange={e => setEditForm({...editForm, telefone: e.target.value})} placeholder="+351 900 000 000" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* Cargo */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Cargo</label>
              <select value={editForm.cargo} onChange={e => setEditForm({...editForm, cargo: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="">Selecionar...</option>
                {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Departamento */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Departamento</label>
              <select value={editForm.departamento} onChange={e => setEditForm({...editForm, departamento: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="">Selecionar...</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Nível de Acesso */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Nível de Acesso</label>
              <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Tipo de Contrato */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Tipo de Contrato</label>
              <select value={editForm.tipo_contrato} onChange={e => setEditForm({...editForm, tipo_contrato: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="interno">Interno</option>
                <option value="prestador">Prestador de Serviços</option>
              </select>
            </div>

            {/* Regime */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Regime de Trabalho</label>
              <select value={editForm.regime} onChange={e => setEditForm({...editForm, regime: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}>
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>

            {/* NIF */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>NIF</label>
              <input type="text" value={editForm.nif} onChange={e => setEditForm({...editForm, nif: e.target.value})} placeholder="123456789" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* IBAN */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>IBAN</label>
              <input type="text" value={editForm.iban} onChange={e => setEditForm({...editForm, iban: e.target.value})} placeholder="PT50..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* Morada */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Morada</label>
              <input type="text" value={editForm.morada} onChange={e => setEditForm({...editForm, morada: e.target.value})} placeholder="Rua, Código Postal, Cidade" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* Horário */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Horário Início</label>
              <input type="time" value={editForm.horario_inicio} onChange={e => setEditForm({...editForm, horario_inicio: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Horário Fim</label>
              <input type="time" value={editForm.horario_fim} onChange={e => setEditForm({...editForm, horario_fim: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* Dias de Férias */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Dias Férias Disponíveis</label>
              <input type="number" value={editForm.dias_ferias_disponiveis} onChange={e => setEditForm({...editForm, dias_ferias_disponiveis: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* Data Entrada */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Data de Entrada</label>
              <input type="date" value={editForm.data_entrada} onChange={e => setEditForm({...editForm, data_entrada: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            {/* Data Nascimento */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: '#78716c' }}>Data de Nascimento</label>
              <input type="date" value={editForm.data_nascimento} onChange={e => setEditForm({...editForm, data_nascimento: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Zona de perigo */}
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #fecaca' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#dc2626', marginBottom: '12px' }}>Zona de Perigo</h3>
            <button onClick={deleteUser} style={{ padding: '10px 20px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              Remover Utilizador
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Profile Header */}
        <div style={styles.profileHeader}>
          <div style={styles.profileTop}>
            <div style={styles.profileAvatar}>
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                selectedUser.nome?.substring(0, 2).toUpperCase()
              )}
            </div>
            <div style={styles.profileInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={styles.profileName}>{selectedUser.nome}</h2>
                {isAdmin() && (
                  <button onClick={startEditing} style={{ padding: '6px 12px', background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Edit size={12} /> Editar
                  </button>
                )}
              </div>
              <p style={styles.profileCargo}>{selectedUser.cargo || 'Sem cargo'}  –  {selectedUser.departamento || 'Sem departamento'}</p>
              <div style={styles.profileMeta}>
                {selectedUser.email && (
                  <div style={styles.metaItem}>
                    <Mail size={14} />
                    {selectedUser.email}
                  </div>
                )}
                {selectedUser.telefone && (
                  <div style={styles.metaItem}>
                    <Phone size={14} />
                    {selectedUser.telefone}
                  </div>
                )}
                <div style={styles.metaItem}>
                  {getRegimeIcon(selectedUser.regime)}
                  {selectedUser.regime === 'presencial' ? 'Presencial' : selectedUser.regime === 'remoto' ? 'Remoto' : 'Híbrido'}
                </div>
                {selectedUser.tipo_contrato === 'prestador' && (
                  <span style={{ ...styles.badge, background: '#dbeafe', color: '#1d4ed8' }}>
                    <Receipt size={12} />
                    Prestador de Serviços
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.profileStats}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{selectedUser.dias_ferias_disponiveis || 0}</div>
              <div style={styles.statLabel}>Dias Férias Disponíveis</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>
                {timesheets.reduce((sum, t) => sum + parseFloat(t.horas || 0), 0).toFixed(0)}h
              </div>
              <div style={styles.statLabel}>Horas Este Mês</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{ausencias.filter(a => a.status === 'pendente').length}</div>
              <div style={styles.statLabel}>Pedidos Pendentes</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>
                {selectedUser.data_entrada ? new Date(selectedUser.data_entrada).getFullYear() : '""'}
              </div>
              <div style={styles.statLabel}>Na Empresa Desde</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['perfil', 'ausencias', 'timesheets', ...(selectedUser.tipo_contrato === 'prestador' ? ['recibos'] : [])].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {})
              }}
            >
              {tab === 'perfil' && 'Perfil'}
              {tab === 'ausencias' && 'Ausências'}
              {tab === 'timesheets' && 'Timesheets'}
              {tab === 'recibos' && 'Recibos'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'perfil' && (
          <div style={styles.section}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: '20px' }}>Informações Pessoais</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '14px', color: '#44403c' }}>{selectedUser.email || '""'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '4px' }}>Telefone</div>
                <div style={{ fontSize: '14px', color: '#44403c' }}>{selectedUser.telefone || '""'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '4px' }}>NIF</div>
                <div style={{ fontSize: '14px', color: '#44403c' }}>{selectedUser.nif || '""'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '4px' }}>IBAN</div>
                <div style={{ fontSize: '14px', color: '#44403c' }}>{selectedUser.iban || '""'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '4px' }}>Morada</div>
                <div style={{ fontSize: '14px', color: '#44403c' }}>{selectedUser.morada || '""'}</div>
              </div>
              {selectedUser.horario_trabalho && (
                <div>
                  <div style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '4px' }}>Horário</div>
                  <div style={{ fontSize: '14px', color: '#44403c' }}>
                    {selectedUser.horario_trabalho.inicio} - {selectedUser.horario_trabalho.fim}
                  </div>
                </div>
              )}
              {selectedUser.tipo_contrato === 'prestador' && selectedUser.valor_mensal && (
                <div>
                  <div style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '4px' }}>Valor Mensal</div>
                  <div style={{ fontSize: '14px', color: '#44403c' }}>
                    {parseFloat(selectedUser.valor_mensal).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ausencias' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Ausências</h3>
              {canEdit(selectedUser) && (
                <button onClick={() => setShowModal('ausencia')} style={styles.btnPrimary}>
                  <Plus size={16} />
                  Novo Pedido
                </button>
              )}
            </div>

            {ausencias.length === 0 ? (
              <div style={styles.empty}>Sem ausências registadas</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Período</th>
                    <th style={styles.th}>Dias</th>
                    <th style={styles.th}>Status</th>
                    {isAdmin() && <th style={styles.th}>Acções</th>}
                  </tr>
                </thead>
                <tbody>
                  {ausencias.map(a => {
                    const status = getStatusConfig(a.status);
                    return (
                      <tr key={a.id}>
                        <td style={styles.td}>{getTipoAusenciaLabel(a.tipo)}</td>
                        <td style={styles.td}>
                          {new Date(a.data_inicio).toLocaleDateString('pt-PT')} - {new Date(a.data_fim).toLocaleDateString('pt-PT')}
                        </td>
                        <td style={styles.td}>{a.dias_uteis}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </td>
                        {isAdmin() && (
                          <td style={styles.td}>
                            {a.status === 'pendente' && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => handleAusenciaAction(a, 'aprovada')}
                                  style={{ ...styles.actionBtn, background: '#d1fae5', color: '#047857' }}
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => handleAusenciaAction(a, 'rejeitada')}
                                  style={{ ...styles.actionBtn, background: '#fee2e2', color: '#b91c1c' }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'timesheets' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Registo de Horas</h3>
              {canEdit(selectedUser) && (
                <button onClick={() => setShowModal('timesheet')} style={styles.btnPrimary}>
                  <Plus size={16} />
                  Registar Horas
                </button>
              )}
            </div>

            {timesheets.length === 0 ? (
              <div style={styles.empty}>Sem registos de horas</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Horas</th>
                    <th style={styles.th}>Projeto</th>
                    <th style={styles.th}>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map(t => (
                    <tr key={t.id}>
                      <td style={styles.td}>
                        {new Date(t.data).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </td>
                      <td style={styles.td}>{t.horas}h</td>
                      <td style={styles.td}>{t.projetos?.codigo || '""'}</td>
                      <td style={styles.td}>{t.descricao || '""'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'recibos' && selectedUser.tipo_contrato === 'prestador' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Recibos Mensais</h3>
              {canEdit(selectedUser) && (
                <button
                  onClick={() => {
                    setReciboForm({ valor_bruto: selectedUser.valor_mensal || '', notas: '' });
                    setShowModal('recibo');
                  }}
                  style={styles.btnPrimary}
                >
                  <Upload size={16} />
                  Submeter Recibo
                </button>
              )}
            </div>

            {recibos.length === 0 ? (
              <div style={styles.empty}>Sem recibos submetidos</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Mês/Ano</th>
                    <th style={styles.th}>Valor</th>
                    <th style={styles.th}>Submetido</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Pago</th>
                    {isAdmin() && <th style={styles.th}>Acções</th>}
                  </tr>
                </thead>
                <tbody>
                  {recibos.map(r => {
                    const status = getStatusConfig(r.status);
                    return (
                      <tr key={r.id}>
                        <td style={styles.td}>{r.mes}/{r.ano}</td>
                        <td style={styles.td}>
                          {parseFloat(r.valor_bruto).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td style={styles.td}>
                          {r.recibo_data_submissao ? new Date(r.recibo_data_submissao).toLocaleDateString('pt-PT') : '""'}
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {r.data_pagamento ? new Date(r.data_pagamento).toLocaleDateString('pt-PT') : '""'}
                        </td>
                        {isAdmin() && (
                          <td style={styles.td}>
                            {r.status === 'submetido' && (
                              <button
                                onClick={() => handleMarcarPago(r)}
                                style={{ ...styles.actionBtn, background: '#d1fae5', color: '#047857' }}
                              >
                                <Check size={12} />
                                Marcar Pago
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </>
    );
  };

  // Loading
  if (loading || !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: '#78716c' }}>A carregar...</div>
      </div>
    );
  }

  return (
    <>
      {isAdmin() ? renderAdminView() : renderColaboradorView()}

      {/* Modals */}
      {showModal === 'ausencia' && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>Novo Pedido de Ausência</h3>
              <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tipo</label>
                <select
                  value={ausenciaForm.tipo}
                  onChange={(e) => setAusenciaForm({ ...ausenciaForm, tipo: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="ferias">Férias</option>
                  <option value="doenca_atestado">Doença (com atestado)</option>
                  <option value="doenca_falta">Doença (sem atestado = falta)</option>
                  <option value="falta">Falta</option>
                  <option value="licenca_parental">Licença Parental</option>
                  <option value="licenca_casamento">Licença Casamento</option>
                  <option value="licenca_luto">Licença Luto</option>
                  <option value="compensacao">Compensação de Horas</option>
                  <option value="formacao">Formação</option>
                </select>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Data Início</label>
                  <input
                    type="date"
                    value={ausenciaForm.data_inicio}
                    onChange={(e) => setAusenciaForm({ ...ausenciaForm, data_inicio: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Data Fim</label>
                  <input
                    type="date"
                    value={ausenciaForm.data_fim}
                    onChange={(e) => setAusenciaForm({ ...ausenciaForm, data_fim: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Notas</label>
                <textarea
                  value={ausenciaForm.notas}
                  onChange={(e) => setAusenciaForm({ ...ausenciaForm, notas: e.target.value })}
                  rows={3}
                  style={{ ...styles.formInput, resize: 'vertical' }}
                  placeholder="Notas adicionais..."
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(null)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#78716c', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleCreateAusencia} style={styles.btnPrimary}>
                Submeter Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'timesheet' && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>Registar Horas</h3>
              <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Data</label>
                  <input
                    type="date"
                    value={timesheetForm.data}
                    onChange={(e) => setTimesheetForm({ ...timesheetForm, data: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Horas</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={timesheetForm.horas}
                    onChange={(e) => setTimesheetForm({ ...timesheetForm, horas: e.target.value })}
                    style={styles.formInput}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Projeto (opcional)</label>
                <select
                  value={timesheetForm.projeto_id}
                  onChange={(e) => setTimesheetForm({ ...timesheetForm, projeto_id: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="">Sem projeto específico</option>
                  {projetos.map(p => (
                    <option key={p.id} value={p.id}>{p.codigo}  –  {p.nome}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Descrição</label>
                <input
                  type="text"
                  value={timesheetForm.descricao}
                  onChange={(e) => setTimesheetForm({ ...timesheetForm, descricao: e.target.value })}
                  style={styles.formInput}
                  placeholder="O que foi feito..."
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(null)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#78716c', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleCreateTimesheet} style={styles.btnPrimary}>
                Registar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'recibo' && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>Submeter Recibo Mensal</h3>
              <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ background: '#fafaf9', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: '#78716c', margin: 0 }}>
                  A submeter recibo de <strong>{new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</strong>
                </p>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Valor Bruto (â‚¬)</label>
                <input
                  type="number"
                  step="0.01"
                  value={reciboForm.valor_bruto}
                  onChange={(e) => setReciboForm({ ...reciboForm, valor_bruto: e.target.value })}
                  style={styles.formInput}
                  placeholder="0.00"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Notas</label>
                <textarea
                  value={reciboForm.notas}
                  onChange={(e) => setReciboForm({ ...reciboForm, notas: e.target.value })}
                  rows={3}
                  style={{ ...styles.formInput, resize: 'vertical' }}
                  placeholder="Notas ou observações..."
                />
              </div>
              <div style={{ background: '#fef3c7', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#b45309' }}>
                <strong>Nota:</strong> Por favor anexe o PDF do recibo/fatura via email para financeiro@gavinho.pt
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowModal(null)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#78716c', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSubmitRecibo} style={styles.btnPrimary}>
                <Send size={16} />
                Submeter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aprovação de Utilizador */}
      {approvalModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: '480px' }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>Aprovar Utilizador</h3>
              <button onClick={() => setApprovalModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {/* Info do utilizador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f5f5f4', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, color: '#78716c' }}>
                  {approvalModal.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{approvalModal.nome}</div>
                  <div style={{ fontSize: '12px', color: '#78716c' }}>{approvalModal.email}</div>
                  {approvalModal.funcao && <div style={{ fontSize: '12px', color: '#78716c', marginTop: '2px' }}>Função indicada: {approvalModal.funcao}</div>}
                </div>
              </div>

              {/* Seleção de Role */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                  Nível de Acesso *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ROLES.map(role => (
                    <label 
                      key={role.value}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '12px 16px', 
                        border: approvalData.role === role.value ? `2px solid ${role.color}` : '1px solid #e7e5e4',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: approvalData.role === role.value ? `${role.color}10` : 'white'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="role" 
                        value={role.value}
                        checked={approvalData.role === role.value}
                        onChange={e => setApprovalData({ ...approvalData, role: e.target.value })}
                        style={{ accentColor: role.color }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: role.color }}>{role.label}</div>
                        <div style={{ fontSize: '11px', color: '#78716c' }}>{role.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cargo */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Cargo</label>
                <select
                  value={approvalData.cargo}
                  onChange={e => setApprovalData({ ...approvalData, cargo: e.target.value })}
                  style={styles.formInput}
                >
                  <option value="">Selecionar cargo...</option>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Departamento */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Departamento</label>
                <select
                  value={approvalData.departamento}
                  onChange={e => setApprovalData({ ...approvalData, departamento: e.target.value })}
                  style={styles.formInput}
                >
                  {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setApprovalModal(null)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#78716c', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleApproveUser} style={{ ...styles.btnPrimary, background: '#16a34a' }}>
                <Check size={16} />
                Aprovar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Encerramento */}
      {showEncerramentoModal && (
        <div style={styles.modal} onClick={() => setShowEncerramentoModal(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px', margin: '20px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e7e5e4' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Adicionar Dia de Encerramento</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Data</label>
                <input
                  type="date"
                  value={encerramentoForm.data}
                  onChange={e => setEncerramentoForm({ ...encerramentoForm, data: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e7e5e4', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Descrição</label>
                <input
                  type="text"
                  value={encerramentoForm.descricao}
                  onChange={e => setEncerramentoForm({ ...encerramentoForm, descricao: e.target.value })}
                  placeholder="Ex: Véspera de Natal, Ponte..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e7e5e4', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={encerramentoForm.conta_como_ferias}
                    onChange={e => setEncerramentoForm({ ...encerramentoForm, conta_como_ferias: e.target.checked })}
                  />
                  <span style={{ fontSize: '13px' }}>Conta como dia de férias do colaborador</span>
                </label>
                <p style={{ fontSize: '11px', color: '#78716c', marginTop: '4px', marginLeft: '24px' }}>
                  Se ativado, este dia será descontado dos dias de férias disponíveis.
                </p>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e7e5e4', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowEncerramentoModal(false)} 
                style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #e7e5e4', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddEncerramento} 
                style={{ padding: '10px 16px', background: '#44403c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
