import { useState, useRef } from 'react'
import {
  Calendar, Edit, Trash2, Plus, FileText,
  Bold, Italic, Underline, List,
  Sparkles, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export default function ProjetoFasesPrazo({
  project, setProject,
  fasesContratuais, refreshFases,
  onEditFase, onRemoveFase, onOpenFaseModal
}) {
  // Escopo editing state (owned by this component)
  const [editingEscopo, setEditingEscopo] = useState(false)
  const [savingEscopo, setSavingEscopo] = useState(false)
  const [escopoTrabalho, setEscopoTrabalho] = useState(project?.escopo_trabalho || '')
  const [analisandoEscopo, setAnalisandoEscopo] = useState(false)
  const [sugestoesEscopo, setSugestoesEscopo] = useState(null)
  const [showSugestoesPanel, setShowSugestoesPanel] = useState(false)
  const escopoEditorRef = useRef(null)

  const handleSaveEscopo = async () => {
    if (!project?.id) return
    setSavingEscopo(true)
    try {
      const content = escopoEditorRef.current?.innerHTML || escopoTrabalho
      const { error } = await supabase
        .from('projetos')
        .update({ escopo_trabalho: content })
        .eq('id', project.id)
      if (error) throw error
      setEscopoTrabalho(content)
      setProject(prev => ({ ...prev, escopo_trabalho: content }))
      setEditingEscopo(false)
    } catch (err) {
      console.error('Erro ao guardar escopo:', err)
      alert('Erro ao guardar escopo: ' + err.message)
    } finally {
      setSavingEscopo(false)
    }
  }

  const formatEscopo = (command, value = null) => {
    document.execCommand(command, false, value)
    escopoEditorRef.current?.focus()
  }

  const handleAnalisarEscopo = async () => {
    if (!escopoTrabalho || analisandoEscopo) return
    setAnalisandoEscopo(true)
    setSugestoesEscopo(null)
    try {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = escopoTrabalho
      const textoPlano = tempDiv.textContent || tempDiv.innerText || ''
      const { data, error } = await supabase.functions.invoke('analisar-escopo', {
        body: { escopo_texto: textoPlano, projeto_nome: project?.nome || project?.codigo }
      })
      if (error) throw error
      if (data?.success && data?.sugestoes) {
        setSugestoesEscopo(data.sugestoes)
        setShowSugestoesPanel(true)
      } else {
        throw new Error(data?.error || 'Erro ao analisar escopo')
      }
    } catch (err) {
      console.error('Erro ao analisar escopo:', err)
      alert('Erro ao analisar escopo: ' + err.message)
    } finally {
      setAnalisandoEscopo(false)
    }
  }

  const handleAddSuggestedFase = async (fase) => {
    try {
      const { error } = await supabase
        .from('projeto_fases_contratuais')
        .insert({
          projeto_id: project.id,
          numero: fase.numero?.toString() || (fasesContratuais.length + 1).toString(),
          nome: fase.nome,
          estado: fase.estado_sugerido || 'nao_iniciado'
        })
      if (error) throw error
      refreshFases(project.id)
      setSugestoesEscopo(prev => ({
        ...prev,
        fases: prev.fases.filter(f => f.nome !== fase.nome)
      }))
    } catch (err) {
      console.error('Erro ao adicionar fase:', err)
      alert('Erro ao adicionar fase: ' + err.message)
    }
  }

  const handleUpdateFaseEstado = async (faseId, estado) => {
    try {
      const { error } = await supabase
        .from('projeto_fases_contratuais')
        .update({ estado })
        .eq('id', faseId)
      if (error) throw error
      refreshFases(project.id)
    } catch (err) {
      console.error('Erro ao atualizar estado:', err)
    }
  }

  const handleUpdateFaseAvaliacao = async (faseId, avaliacao) => {
    try {
      const { error } = await supabase
        .from('projeto_fases_contratuais')
        .update({ avaliacao })
        .eq('id', faseId)
      if (error) throw error
      refreshFases(project.id)
    } catch (err) {
      console.error('Erro ao atualizar avaliação:', err)
    }
  }

  const selectStyle = (value, positiveVal, warningVal) => ({
    padding: '4px 8px', borderRadius: '12px', border: 'none', fontSize: '11px',
    fontWeight: 500, cursor: 'pointer',
    background: value === positiveVal ? '#dcfce7' : value === warningVal ? '#fef9c3' : '#f3f4f6',
    color: value === positiveVal ? '#166534' : value === warningVal ? '#854d0e' : '#6b7280'
  })

  const toolbarBtnStyle = {
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--stone)', borderRadius: '6px', background: 'var(--white)', cursor: 'pointer', color: 'var(--brown)'
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-3" style={{ gap: '16px', marginBottom: '24px' }}>
        {[
          ['Data Início Projeto', project.data_inicio ? new Date(project.data_inicio).toLocaleDateString('pt-PT') : 'A definir'],
          ['Data Fim Prevista', project.data_fim_prevista ? new Date(project.data_fim_prevista).toLocaleDateString('pt-PT') : 'A definir'],
          ['Duração Total', project.prazo_execucao ? `${project.prazo_execucao} dias` : '—']
        ].map(([label, value]) => (
          <div key={label} style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Fases table */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Fases e Prazos Contratuais</h4>
        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={onOpenFaseModal}>
          <Plus size={14} /> Adicionar Fase
        </button>
      </div>

      {fasesContratuais.length === 0 ? (
        <div style={{ padding: '32px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center', color: 'var(--brown-light)' }}>
          <Calendar size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>Nenhuma fase contratual definida.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--stone)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--cream)' }}>
                {['FASE', 'INÍCIO', 'Nº DIAS FASE', 'CONCLUSÃO PREVISTA', 'DATA ENTREGA', 'ESTADO', 'AVALIAÇÃO PERFORMANCE', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i === 0 ? 'left' : 'center', padding: '12px 10px',
                    color: 'var(--brown)', fontWeight: 600, borderBottom: '2px solid var(--stone)',
                    ...(i > 0 && i < 7 ? { width: i === 3 || i === 6 ? '120px' : '100px' } : {}),
                    ...(i === 7 ? { width: '50px' } : {})
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fasesContratuais.map(fase => (
                <tr key={fase.id} style={{ borderBottom: '1px solid var(--cream)' }}>
                  <td style={{ padding: '12px 10px', color: 'var(--brown)' }}>
                    <span style={{ fontWeight: 500 }}>{fase.numero}ª Fase – </span>{fase.nome}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>
                    {fase.data_inicio ? new Date(fase.data_inicio).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>{fase.num_dias || '—'}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>{fase.conclusao_prevista || '—'}</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--brown-light)' }}>
                    {fase.data_entrega ? new Date(fase.data_entrega).toLocaleDateString('pt-PT') : '—'}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <select value={fase.estado} onChange={e => handleUpdateFaseEstado(fase.id, e.target.value)} style={selectStyle(fase.estado, 'concluido', 'em_curso')}>
                      <option value="nao_iniciado">Não iniciado</option>
                      <option value="em_curso">Em curso</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                    <select value={fase.avaliacao || ''} onChange={e => handleUpdateFaseAvaliacao(fase.id, e.target.value)} style={selectStyle(fase.avaliacao, 'on_time', 'delayed')}>
                      <option value="">—</option>
                      <option value="on_time">On Time</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => onEditFase(fase)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--brown-light)' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => onRemoveFase(fase.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Escopo de Trabalho */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Escopo de Trabalho</h4>
          {!editingEscopo ? (
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setEditingEscopo(true)}>
              <Edit size={14} style={{ marginRight: '4px' }} /> Editar
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setEditingEscopo(false); setEscopoTrabalho(project?.escopo_trabalho || '') }} disabled={savingEscopo}>Cancelar</button>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleSaveEscopo} disabled={savingEscopo}>
                {savingEscopo ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>

        {editingEscopo ? (
          <div style={{ border: '1px solid var(--stone)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', background: 'var(--cream)', borderBottom: '1px solid var(--stone)' }}>
              <button type="button" onClick={() => formatEscopo('bold')} title="Negrito" style={toolbarBtnStyle}><Bold size={16} /></button>
              <button type="button" onClick={() => formatEscopo('italic')} title="Itálico" style={toolbarBtnStyle}><Italic size={16} /></button>
              <button type="button" onClick={() => formatEscopo('underline')} title="Sublinhado" style={toolbarBtnStyle}><Underline size={16} /></button>
              <div style={{ width: '1px', background: 'var(--stone)', margin: '0 4px' }} />
              <button type="button" onClick={() => formatEscopo('insertUnorderedList')} title="Lista" style={toolbarBtnStyle}><List size={16} /></button>
              <button type="button" onClick={() => formatEscopo('insertOrderedList')} title="Lista numerada" style={{ ...toolbarBtnStyle, fontSize: '12px', fontWeight: 600 }}>1.</button>
            </div>
            <div
              ref={escopoEditorRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: escopoTrabalho }}
              style={{ minHeight: '400px', padding: '16px', fontSize: '13px', lineHeight: '1.8', outline: 'none', color: 'var(--brown)', background: 'var(--white)' }}
            />
          </div>
        ) : escopoTrabalho ? (
          <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', fontSize: '13px', lineHeight: '1.8', color: 'var(--brown)' }}
            dangerouslySetInnerHTML={{ __html: escopoTrabalho }}
          />
        ) : (
          <div style={{ padding: '32px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center', color: 'var(--brown-light)' }}>
            <FileText size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Nenhum escopo de trabalho definido.</p>
            <button className="btn btn-primary" style={{ marginTop: '12px', padding: '8px 16px', fontSize: '12px' }} onClick={() => setEditingEscopo(true)}>
              Adicionar Escopo
            </button>
          </div>
        )}

        {/* AI analysis button */}
        {escopoTrabalho && !editingEscopo && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={handleAnalisarEscopo} disabled={analisandoEscopo}>
              {analisandoEscopo ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> A analisar...</>)
                : (<><Sparkles size={16} /> Analisar com IA</>)}
            </button>
            {sugestoesEscopo && (
              <button style={{ background: 'none', border: 'none', color: 'var(--brown)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowSugestoesPanel(!showSugestoesPanel)}>
                {showSugestoesPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showSugestoesPanel ? 'Ocultar sugestões' : 'Ver sugestões'}
              </button>
            )}
          </div>
        )}

        {/* AI suggestions panel */}
        {showSugestoesPanel && sugestoesEscopo && (
          <div style={{ marginTop: '20px', padding: '20px', background: 'linear-gradient(135deg, #f8f6f3 0%, #f0ede8 100%)', borderRadius: '12px', border: '1px solid var(--stone)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={18} style={{ color: 'var(--gold)' }} />
              <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Sugestões da IA</h5>
            </div>

            {sugestoesEscopo.fases?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h6 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Fases Contratuais ({sugestoesEscopo.fases.length})
                </h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sugestoesEscopo.fases.map((fase, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--stone)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--brown)' }}>{fase.numero}ª Fase – {fase.nome}</div>
                        {fase.descricao && <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>{fase.descricao}</div>}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                          {fase.duracao_estimada && <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>⏱ {fase.duracao_estimada}</span>}
                          {fase.estado_sugerido && (
                            <span style={selectStyle(fase.estado_sugerido, 'concluido', 'em_curso')}>
                              {fase.estado_sugerido === 'concluido' ? 'Concluído' : fase.estado_sugerido === 'em_curso' ? 'Em curso' : 'Não iniciado'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => handleAddSuggestedFase(fase)}>
                        <Plus size={14} style={{ marginRight: '4px' }} /> Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sugestoesEscopo.entregaveis?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h6 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Entregáveis ({sugestoesEscopo.entregaveis.length})
                </h6>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {sugestoesEscopo.entregaveis.map((e, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'var(--white)', borderRadius: '8px', border: '1px solid var(--stone)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--brown)' }}>{e.descricao}</div>
                      {e.fase && <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginTop: '2px' }}>Fase: {e.fase}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sugestoesEscopo.notas?.length > 0 && (
              <div>
                <h6 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '10px', textTransform: 'uppercase' }}>Notas</h6>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--brown-light)' }}>
                  {sugestoesEscopo.notas.map((nota, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{nota}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
