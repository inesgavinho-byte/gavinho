import { useState, useEffect } from 'react'
import { colors } from './constants'
import { supabase } from '../../lib/supabase'

export default function DashboardTab({ obra, obraId }) {
  const [stats, setStats] = useState({
    fotos: 0,
    ncsAbertas: 0,
    hsoPendentes: 0,
    totalSubs: 0,
    totalEquipa: 0,
  })
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!obraId) return

    const fetchSummary = async () => {
      setLoading(true)
      try {
        const [
          fotosRes,
          ncsRes,
          hsoRes,
          subsRes,
          equipaRes,
          relatoriosRes,
        ] = await Promise.all([
          supabase.from('obra_fotografias').select('*', { count: 'exact', head: true }).eq('obra_id', obraId),
          supabase.from('nao_conformidades').select('*', { count: 'exact', head: true }).eq('estado', 'aberta').eq('obra_id', obraId),
          supabase.from('obra_hso').select('*', { count: 'exact', head: true }).eq('conforme', false).eq('estado', 'pendente').eq('obra_id', obraId),
          supabase.from('obra_subempreiteiros').select('*', { count: 'exact', head: true }).eq('obra_id', obraId),
          supabase.from('trabalhador_obras').select('*', { count: 'exact', head: true }).eq('obra_id', obraId),
          supabase.from('obra_relatorios').select('*').eq('obra_id', obraId).order('data_fim', { ascending: false }).limit(4),
        ])

        setStats({
          fotos: fotosRes.count || 0,
          ncsAbertas: ncsRes.count || 0,
          hsoPendentes: hsoRes.count || 0,
          totalSubs: subsRes.count || 0,
          totalEquipa: equipaRes.count || 0,
        })
        setRelatorios(relatoriosRes.data || [])
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [obraId])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div className="spinner" />
      </div>
    )
  }

  const { ncsAbertas, hsoPendentes, totalSubs, totalEquipa, fotos } = stats

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Progresso', value: `${obra?.progresso || 0}%`, color: colors.success, bg: '#E8F5E9' },
          { label: 'NCs Abertas', value: ncsAbertas, color: ncsAbertas > 0 ? '#F44336' : '#4CAF50', bg: ncsAbertas > 0 ? '#FFEBEE' : '#E8F5E9' },
          { label: 'HSO Pendentes', value: hsoPendentes, color: hsoPendentes > 0 ? '#FF9800' : '#4CAF50', bg: hsoPendentes > 0 ? '#FFF3E0' : '#E8F5E9' },
          { label: 'SubEmpreiteiros', value: totalSubs, color: '#2196F3', bg: '#E3F2FD' },
          { label: 'Equipa', value: totalEquipa, color: colors.primary, bg: colors.background },
          { label: 'Fotografias', value: fotos, color: '#7B1FA2', bg: '#F3E5F5' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: colors.white, borderRadius: 12, padding: 18, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div style={{ background: colors.white, borderRadius: 12, padding: 20, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Progresso Global</div>
        <div style={{ height: 12, background: colors.progressBg, borderRadius: 6 }}>
          <div style={{ height: '100%', width: `${obra?.progresso || 0}%`, background: colors.success, borderRadius: 6, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
          <span>Inicio: {obra?.data_inicio ? new Date(obra.data_inicio).toLocaleDateString('pt-PT') : '-'}</span>
          <span>{obra?.progresso || 0}%</span>
          <span>Previsao: {obra?.data_prevista_conclusao ? new Date(obra.data_prevista_conclusao).toLocaleDateString('pt-PT') : '-'}</span>
        </div>
      </div>
      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: colors.white, borderRadius: 12, padding: 18, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 10 }}>Informacao Geral</div>
          {[
            { label: 'Codigo', value: obra?.codigo },
            { label: 'Tipo', value: obra?.tipo },
            { label: 'Status', value: obra?.status?.replace('_', ' ') },
            { label: 'Localizacao', value: obra?.localizacao },
            { label: 'Encarregado', value: obra?.encarregado },
            { label: 'Orcamento', value: obra?.orcamento ? parseFloat(obra.orcamento).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '-' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
              <span style={{ color: colors.textMuted }}>{item.label}</span>
              <span style={{ fontWeight: 500, color: colors.text }}>{item.value || '-'}</span>
            </div>
          ))}
        </div>
        <div style={{ background: colors.white, borderRadius: 12, padding: 18, border: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 10 }}>Ultimos Relatorios</div>
          {relatorios.length === 0 ? <p style={{ fontSize: 13, color: colors.textMuted }}>Nenhum relatorio</p>
          : relatorios.slice(0, 4).map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
              <span style={{ color: colors.text }}>{r.codigo} - {r.titulo}</span>
              <span style={{ color: colors.textMuted }}>{new Date(r.data_fim).toLocaleDateString('pt-PT')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
