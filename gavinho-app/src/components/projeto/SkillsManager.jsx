// src/components/projeto/SkillsManager.jsx

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Sparkles, Check, Plus } from 'lucide-react'

export default function SkillsManager({ projetoId, onClose }) {
  const [allSkills, setAllSkills] = useState([])
  const [activeSkills, setActiveSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSkills()
  }, [projetoId])

  const fetchSkills = async () => {
    setLoading(true)

    // Buscar todas as skills
    const { data: skills } = await supabase
      .from('skills')
      .select('*')
      .eq('activo', true)
      .order('categoria')
      .order('ordem')

    // Buscar skills activas do projecto
    const { data: active } = await supabase
      .from('projeto_skills')
      .select('skill_id')
      .eq('projeto_id', projetoId)
      .eq('activo', true)

    setAllSkills(skills || [])
    setActiveSkills((active || []).map(a => a.skill_id))
    setLoading(false)
  }

  const toggleSkill = async (skillId) => {
    setSaving(true)
    const isActive = activeSkills.includes(skillId)

    if (isActive) {
      // Desactivar
      const { error } = await supabase
        .from('projeto_skills')
        .delete()
        .eq('projeto_id', projetoId)
        .eq('skill_id', skillId)

      if (!error) {
        setActiveSkills(prev => prev.filter(id => id !== skillId))
      }
    } else {
      // Activar
      const { error } = await supabase
        .from('projeto_skills')
        .insert({
          projeto_id: projetoId,
          skill_id: skillId
        })

      if (!error) {
        setActiveSkills(prev => [...prev, skillId])
      }
    }
    setSaving(false)
  }

  // Agrupar skills por categoria
  const groupedSkills = allSkills.reduce((acc, skill) => {
    const cat = skill.categoria || 'Outras'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Sparkles size={20} />
            Skills do Projecto
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <p style={styles.description}>
          Activa as skills que queres disponibilizar nos chats deste projecto.
          A IA tera acesso ao conhecimento especializado de cada skill activa.
        </p>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>A carregar skills...</div>
          ) : (
            Object.entries(groupedSkills).map(([categoria, skills]) => (
              <div key={categoria} style={styles.category}>
                <h3 style={styles.categoryTitle}>{categoria}</h3>
                <div style={styles.skillsList}>
                  {skills.map(skill => {
                    const isActive = activeSkills.includes(skill.id)
                    return (
                      <button
                        key={skill.id}
                        onClick={() => toggleSkill(skill.id)}
                        disabled={saving}
                        style={{
                          ...styles.skillCard,
                          ...(isActive ? styles.skillCardActive : {}),
                          ...(saving ? styles.skillCardDisabled : {})
                        }}
                      >
                        <div style={styles.skillInfo}>
                          <span style={styles.skillName}>{skill.nome}</span>
                          <span style={styles.skillDesc}>{skill.descricao}</span>
                        </div>
                        <div style={{
                          ...styles.skillToggle,
                          ...(isActive ? styles.skillToggleActive : {})
                        }}>
                          {isActive ? <Check size={14} /> : <Plus size={14} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.footer}>
          <span style={styles.activeCount}>
            {activeSkills.length} skills activas
          </span>
          <button onClick={onClose} style={styles.doneButton}>
            Concluido
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #E5E5E5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#78716C',
  },
  description: {
    padding: '16px 24px',
    margin: 0,
    fontSize: '13px',
    color: '#78716C',
    backgroundColor: '#FAF9F7',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#78716C',
  },
  category: {
    marginBottom: '24px',
  },
  categoryTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  skillsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  skillCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#FAF9F7',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    width: '100%',
  },
  skillCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  skillCardDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  skillInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  skillName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1C1917',
  },
  skillDesc: {
    fontSize: '12px',
    color: '#78716C',
  },
  skillToggle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#E5E5E5',
    color: '#78716C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: '12px',
  },
  skillToggleActive: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #E5E5E5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeCount: {
    fontSize: '13px',
    color: '#78716C',
  },
  doneButton: {
    padding: '10px 20px',
    backgroundColor: '#8B8670',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
}
