import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TIPO_CONFIG = {
  design: { label: 'Design', bg: '#E0E7FF', color: '#4338CA', icon: '🎨' },
  material: { label: 'Material', bg: '#FEF3C7', color: '#D97706', icon: '🪨' },
  tecnico: { label: 'Técnico', bg: '#DCFCE7', color: '#16A34A', icon: '⚙️' },
  financeiro: { label: 'Financeiro', bg: '#FCE7F3', color: '#DB2777', icon: '💰' },
  prazo: { label: 'Prazo', bg: '#E0E7FF', color: '#4338CA', icon: '📅' },
  fornecedor: { label: 'Fornecedor', bg: '#F3E8FF', color: '#9333EA', icon: '🏭' },
  alteracao: { label: 'Alteração', bg: '#FEE2E2', color: '#DC2626', icon: '🔄' }
}

const IMPACTO_CONFIG = {
  critico: { label: 'Crítico', bg: '#EF4444', color: '#FFF' },
  alto: { label: 'Alto', bg: '#F59E0B', color: '#FFF' },
  medio: { label: 'Médio', bg: '#8B8670', color: '#FFF' },
  baixo: { label: 'Baixo', bg: '#9CA3AF', color: '#FFF' }
}

export default function DecisaoDetalhe({ decisaoId, onBack, onEdit }) {
  const [decisao, setDecisao] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (decisaoId) {
      fetchDecisao()
      fetchHistorico()
    }
  }, [decisaoId])

  const fetchDecisao = async () => {
    const { data } = await supabase
      .from('decisoes')
      .select('*, projeto:projetos(codigo, nome)')
      .eq('id', decisaoId)
      .single()
    setDecisao(data)
    setLoading(false)
  }

  const fetchHistorico = async () => {
    const { data } = await supabase
      .from('decisoes_historico')
      .select('*')
      .eq('decisao_id', decisaoId)
      .order('alterado_em', { ascending: false })
    setHistorico(data || [])
  }

  const formatCurrency = (value) => {
    if (!value) return null
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(Math.abs(value))
  }

  const formatDate = (date) => new Date(date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>A carregar...</div>
  if (!decisao) return <div style={{ textAlign: 'center', padding: '60px', color: '#EF4444' }}>Decisão não encontrada</div>

  const tipo = TIPO_CONFIG[decisao.tipo] || TIPO_CONFIG.design
  const impacto = IMPACTO_CONFIG[decisao.impacto] || IMPACTO_CONFIG.medio

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back */}
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#8B8670', cursor: 'pointer', marginBottom: '20px', fontSize: '13px', padding: 0 }}>
        ← Voltar às decisões
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #E5E5E5' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B8670', letterSpacing: '1px' }}>{decisao.codigo}</span>
          <h1 style={{ fontSize: '28px', fontWeight: 600, fontFamily: 'Cormorant Garamond, serif', margin: '8px 0 16px', color: '#000' }}>{decisao.titulo}</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: tipo.bg, color: tipo.color }}>{tipo.icon} {tipo.label}</span>
            <span style={{ padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: impacto.bg, color: impacto.color }}>{impacto.label}</span>
          </div>
        </div>
        <button onClick={() => onEdit?.(decisao)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: '#FFF', color: '#5F5C59', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          ✏️ Editar
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Detalhes */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '18px', border: '1px solid #E5E5E5' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '14px', textTransform: 'uppercase' }}>Detalhes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Data da decisão</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatDate(decisao.data_decisao)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Decidido por</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{decisao.decidido_por} ({decisao.decidido_por_tipo})</span>
              </div>
              {decisao.divisao && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Divisão/Zona</span>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{decisao.divisao}</span>
              </div>}
            </div>
          </div>

          {/* Descrição */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '18px', border: '1px solid #E5E5E5' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '14px', textTransform: 'uppercase' }}>Descrição</h2>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#5F5C59', margin: 0 }}>{decisao.descricao}</p>
          </div>

          {/* Justificação */}
          {decisao.justificacao && (
            <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '18px', border: '1px solid #E5E5E5' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '14px', textTransform: 'uppercase' }}>Justificação</h2>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#5F5C59', margin: 0 }}>{decisao.justificacao}</p>
            </div>
          )}

          {/* Alternativas */}
          {decisao.alternativas_consideradas?.length > 0 && (
            <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '18px', border: '1px solid #E5E5E5' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '14px', textTransform: 'uppercase' }}>Alternativas Consideradas</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {decisao.alternativas_consideradas.map((alt, i) => (
                  <li key={i} style={{ padding: '10px 12px', backgroundColor: '#F9F9F7', borderRadius: '6px' }}>
                    <strong>{alt.opcao}</strong>
                    <span style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>Rejeitado: {alt.motivo_rejeicao}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Impacto */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '18px', border: '1px solid #E5E5E5' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '14px', textTransform: 'uppercase' }}>Impacto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Orçamento</span>
                {decisao.impacto_orcamento ? (
                  <span style={{ fontSize: '14px', fontWeight: 600, color: decisao.impacto_orcamento > 0 ? '#DC2626' : '#16A34A' }}>
                    {decisao.impacto_orcamento > 0 ? '📈 +' : '📉 -'}{formatCurrency(decisao.impacto_orcamento)}
                  </span>
                ) : <span style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>Sem impacto</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Prazo</span>
                {decisao.impacto_prazo_dias ? (
                  <span style={{ fontSize: '14px', fontWeight: 600, color: decisao.impacto_prazo_dias > 0 ? '#DC2626' : '#16A34A' }}>
                    📅 {decisao.impacto_prazo_dias > 0 ? '+' : ''}{decisao.impacto_prazo_dias} dias
                  </span>
                ) : <span style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>Sem impacto</span>}
              </div>
            </div>
          </div>

          {/* Fonte */}
          <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '18px', border: '1px solid #E5E5E5' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '14px', textTransform: 'uppercase' }}>Fonte</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span>{decisao.fonte === 'email' ? '📧' : decisao.fonte === 'reuniao' ? '🎤' : '✏️'}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#5F5C59' }}>
                {decisao.fonte === 'email' ? 'Email' : decisao.fonte === 'reuniao' ? 'Reunião' : 'Registo Manual'}
              </span>
            </div>
            {decisao.fonte_excerto && (
              <blockquote style={{ margin: '0 0 12px', padding: '12px 14px', backgroundColor: '#F9F9F7', borderLeft: '3px solid #8B8670', fontStyle: 'italic', fontSize: '13px', color: '#5F5C59' }}>
                "{decisao.fonte_excerto}"
              </blockquote>
            )}
          </div>

          {/* Histórico */}
          {historico.length > 0 && (
            <div style={{ backgroundColor: '#FFF', borderRadius: '10px', padding: '18px', border: '1px solid #E5E5E5' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#8B8670', marginBottom: '14px', textTransform: 'uppercase' }}>Histórico</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historico.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8B8670', marginTop: '4px', flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(h.alterado_em).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{ display: 'block', fontSize: '13px', color: '#1a1a1a' }}>
                        {h.campo_alterado === 'estado' && h.valor_novo === 'validada' ? 'Decisão validada' :
                         h.campo_alterado === 'estado' && !h.valor_anterior ? 'Decisão detectada' :
                         `${h.campo_alterado} alterado`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
