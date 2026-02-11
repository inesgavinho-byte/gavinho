// =====================================================
// PROJETO NOTEBOOK - Estilo Google Docs
// Documento do projeto com secções hierárquicas
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import {
  Plus, FileText, Trash2, Save, X, Loader2, ChevronDown, ChevronRight,
  MoreVertical, Edit2, FolderOpen, File, GripVertical,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft,
  AlignCenter, AlignRight, Link2, Table, Undo2, Redo2, Type,
  Heading1, Heading2
} from 'lucide-react'

// Ícones das secções
const SECTION_ICONS = {
  'file-text': FileText,
  'folder': FolderOpen,
  'file': File
}

export default function ProjetoNotebook({ projeto, userId, userName }) {
  const toast = useToast()
  const editorRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  const [sections, setSections] = useState([])
  const [activeSection, setActiveSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [editingTitle, setEditingTitle] = useState(null)
  const [newTitleValue, setNewTitleValue] = useState('')
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSectionParent, setNewSectionParent] = useState(null)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const [tableError, setTableError] = useState(null)
  const [creatingTable, setCreatingTable] = useState(false)

  useEffect(() => {
    if (projeto?.id) fetchSections()
  }, [projeto?.id])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // SQL for creating the table
  const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS projeto_notebook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES projeto_notebook_sections(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  tipo TEXT DEFAULT 'secao' CHECK (tipo IN ('secao', 'pagina', 'tabela')),
  icone TEXT DEFAULT 'file-text',
  ordem INTEGER DEFAULT 0,
  expandido BOOLEAN DEFAULT true,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebook_sections_projeto ON projeto_notebook_sections(projeto_id);
CREATE INDEX IF NOT EXISTS idx_notebook_sections_parent ON projeto_notebook_sections(parent_id);
CREATE INDEX IF NOT EXISTS idx_notebook_sections_ordem ON projeto_notebook_sections(projeto_id, parent_id, ordem);

ALTER TABLE projeto_notebook_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebook_sections_all" ON projeto_notebook_sections FOR ALL USING (true) WITH CHECK (true);`

  const handleCreateTable = async () => {
    try {
      setCreatingTable(true)
      // Try using Supabase's rpc to execute SQL
      const { error } = await supabase.rpc('exec_sql', { sql: CREATE_TABLE_SQL })
      if (error) {
        // If rpc doesn't exist, copy SQL to clipboard instead
        await navigator.clipboard.writeText(CREATE_TABLE_SQL)
        toast.info('SQL copiado', 'Cole e execute no SQL Editor do Supabase Dashboard')
        window.open('https://supabase.com/dashboard/project/vctcppuvqjstscbzdykn/sql/new', '_blank')
        return
      }
      toast.success('Tabela criada com sucesso!')
      setTableError(null)
      fetchSections()
    } catch (err) {
      // Fallback: copy SQL to clipboard
      try {
        await navigator.clipboard.writeText(CREATE_TABLE_SQL)
        toast.info('SQL copiado', 'Cole e execute no SQL Editor do Supabase Dashboard')
        window.open('https://supabase.com/dashboard/project/vctcppuvqjstscbzdykn/sql/new', '_blank')
      } catch {
        toast.error('Erro', 'Copie o SQL manualmente e execute no Supabase Dashboard')
      }
    } finally {
      setCreatingTable(false)
    }
  }

  const fetchSections = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projeto_notebook_sections')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('ordem', { ascending: true })

      if (error) {
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setTableError('table_not_found')
          return
        }
        throw error
      }

      setTableError(null)
      const secs = data || []
      setSections(secs)

      // Expand all by default
      const expanded = {}
      secs.forEach(s => { expanded[s.id] = s.expandido !== false })
      setExpandedSections(expanded)

      // Select first root section
      if (secs.length > 0 && !activeSection) {
        const root = secs.find(s => !s.parent_id)
        if (root) setActiveSection(root)
      }
    } catch (err) {
      console.error('Erro ao carregar notebook:', err)
      setTableError(err.message || 'unknown')
    } finally {
      setLoading(false)
    }
  }

  // Build tree structure from flat sections
  const buildTree = (items, parentId = null) => {
    return items
      .filter(s => s.parent_id === parentId)
      .sort((a, b) => a.ordem - b.ordem)
      .map(s => ({
        ...s,
        children: buildTree(items, s.id)
      }))
  }

  const tree = buildTree(sections)

  // Auto-save content
  const autoSave = useCallback(async (sectionId, html) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaving(true)
        const { error } = await supabase
          .from('projeto_notebook_sections')
          .update({ conteudo: html })
          .eq('id', sectionId)

        if (error) throw error
        setLastSaved(new Date())
        // Update local state
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, conteudo: html } : s))
      } catch (err) {
        console.error('Erro ao guardar:', err)
      } finally {
        setSaving(false)
      }
    }, 1000)
  }, [])

  const handleContentChange = () => {
    if (!editorRef.current || !activeSection) return
    const html = editorRef.current.innerHTML
    autoSave(activeSection.id, html)
  }

  // Create new section
  const handleCreateSection = async (parentId = null) => {
    if (!newSectionTitle.trim()) return
    try {
      const siblings = sections.filter(s => s.parent_id === parentId)
      const maxOrdem = siblings.length > 0 ? Math.max(...siblings.map(s => s.ordem)) : -1

      const { data, error } = await supabase
        .from('projeto_notebook_sections')
        .insert({
          projeto_id: projeto.id,
          parent_id: parentId,
          titulo: newSectionTitle.trim(),
          conteudo: '',
          tipo: parentId ? 'pagina' : 'secao',
          icone: parentId ? 'file' : 'file-text',
          ordem: maxOrdem + 1,
          created_by: userId,
          created_by_name: userName
        })
        .select()
        .single()

      if (error) throw error
      setSections(prev => [...prev, data])
      setActiveSection(data)
      if (parentId) {
        setExpandedSections(prev => ({ ...prev, [parentId]: true }))
      }
      setShowNewSection(false)
      setNewSectionParent(null)
      setNewSectionTitle('')
      toast.success('Secção criada')
    } catch (err) {
      console.error('Erro ao criar secção:', err)
      if (err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        setTableError('table_not_found')
        toast.error('Tabela não encontrada', 'A tabela do Notebook precisa de ser criada no Supabase')
      } else {
        toast.error('Erro ao criar secção', err.message || 'Não foi possível criar a secção')
      }
    }
  }

  // Rename section
  const handleRenameSection = async (sectionId) => {
    if (!newTitleValue.trim()) return
    try {
      const { error } = await supabase
        .from('projeto_notebook_sections')
        .update({ titulo: newTitleValue.trim() })
        .eq('id', sectionId)

      if (error) throw error
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, titulo: newTitleValue.trim() } : s))
      if (activeSection?.id === sectionId) {
        setActiveSection(prev => ({ ...prev, titulo: newTitleValue.trim() }))
      }
      setEditingTitle(null)
    } catch (err) {
      toast.error('Erro', 'Não foi possível renomear')
    }
  }

  // Delete section
  const handleDeleteSection = (section) => {
    const hasChildren = sections.some(s => s.parent_id === section.id)
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Secção',
      message: `Tem a certeza que quer eliminar "${section.titulo}"${hasChildren ? ' e todas as sub-secções' : ''}?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('projeto_notebook_sections')
            .delete()
            .eq('id', section.id)

          if (error) throw error
          setSections(prev => prev.filter(s => s.id !== section.id && s.parent_id !== section.id))
          if (activeSection?.id === section.id) {
            const remaining = sections.filter(s => s.id !== section.id && !s.parent_id)
            setActiveSection(remaining[0] || null)
          }
          toast.success('Secção eliminada')
        } catch (err) {
          toast.error('Erro', 'Não foi possível eliminar')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // Exec command for rich text
  const execCmd = (cmd, val = null) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
  }

  const insertTable = () => {
    const rows = 5
    const cols = 4
    let html = '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px">'
    html += '<thead><tr>'
    for (let c = 0; c < cols; c++) {
      html += '<th style="background:var(--brown);color:white;padding:8px 12px;text-align:left;border:1px solid var(--stone);font-weight:600">Coluna ' + (c + 1) + '</th>'
    }
    html += '</tr></thead><tbody>'
    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) {
        html += '<td style="padding:8px 12px;border:1px solid var(--stone)">&nbsp;</td>'
      }
      html += '</tr>'
    }
    html += '</tbody></table><p><br></p>'
    document.execCommand('insertHTML', false, html)
  }

  // Render tree sidebar item
  const renderSidebarItem = (node, depth = 0) => {
    const isActive = activeSection?.id === node.id
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedSections[node.id] !== false
    const Icon = SECTION_ICONS[node.icone] || FileText

    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: `6px 8px 6px ${12 + depth * 16}px`,
            cursor: 'pointer',
            background: isActive ? 'var(--brown)' : 'transparent',
            color: isActive ? 'white' : 'var(--brown)',
            borderRadius: '6px',
            margin: '1px 6px',
            fontSize: '13px',
            fontWeight: isActive ? 600 : (depth === 0 ? 600 : 400),
            transition: 'background 0.15s',
            position: 'relative'
          }}
          onClick={() => {
            setActiveSection(node)
            setContextMenu(null)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY, section: node })
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpandedSections(prev => ({ ...prev, [node.id]: !prev[node.id] }))
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span style={{ width: '14px' }} />
          )}

          <Icon size={14} style={{ opacity: 0.7, flexShrink: 0 }} />

          {editingTitle === node.id ? (
            <input
              autoFocus
              value={newTitleValue}
              onChange={e => setNewTitleValue(e.target.value)}
              onBlur={() => handleRenameSection(node.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSection(node.id)
                if (e.key === 'Escape') setEditingTitle(null)
              }}
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1,
                background: 'white',
                border: '1px solid var(--gold)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '12px',
                color: 'var(--brown)',
                outline: 'none',
                minWidth: 0
              }}
            />
          ) : (
            <span style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: depth === 0 ? '12px' : '12px',
              textTransform: depth === 0 ? 'uppercase' : 'none',
              letterSpacing: depth === 0 ? '0.3px' : '0'
            }}>
              {node.titulo}
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              setContextMenu({ x: e.currentTarget.getBoundingClientRect().right, y: e.currentTarget.getBoundingClientRect().top, section: node })
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--brown-light)',
              opacity: 0,
              transition: 'opacity 0.15s',
              flexShrink: 0
            }}
            className="section-menu-btn"
          >
            <MoreVertical size={14} />
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderSidebarItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Loader2 size={28} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  // Setup UI when table doesn't exist
  if (tableError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '20px',
        minHeight: '400px'
      }}>
        <div style={{
          width: '56px', height: '56px',
          background: 'var(--warning-bg)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FileText size={28} style={{ color: 'var(--warning)' }} />
        </div>

        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px' }}>
            {tableError === 'table_not_found' ? 'Configuração Necessária' : 'Erro no Notebook'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', lineHeight: 1.6 }}>
            {tableError === 'table_not_found'
              ? 'A tabela do Notebook ainda não existe na base de dados. Clique no botão abaixo para configurar automaticamente.'
              : `Erro: ${tableError}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={handleCreateTable}
            disabled={creatingTable}
            style={{
              padding: '10px 24px',
              background: 'var(--accent-olive)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: creatingTable ? 'wait' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: creatingTable ? 0.7 : 1
            }}
          >
            {creatingTable ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            {creatingTable ? 'A configurar...' : 'Configurar Notebook'}
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(CREATE_TABLE_SQL)
              toast.success('SQL copiado para a área de transferência')
            }}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              color: 'var(--brown)',
              border: '1px solid var(--stone)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileText size={14} />
            Copiar SQL
          </button>
        </div>

        <details style={{ maxWidth: '600px', width: '100%', marginTop: '12px' }}>
          <summary style={{ fontSize: '12px', color: 'var(--brown-light)', cursor: 'pointer', fontWeight: 500 }}>
            Ver SQL de criação da tabela
          </summary>
          <pre style={{
            marginTop: '8px',
            padding: '12px',
            background: 'var(--cream)',
            border: '1px solid var(--stone)',
            borderRadius: '8px',
            fontSize: '11px',
            color: 'var(--brown)',
            overflow: 'auto',
            maxHeight: '200px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}>
            {CREATE_TABLE_SQL}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 'calc(100vh - 320px)', minHeight: '500px', background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--stone)' }}>
      {/* Sidebar - Separadores do documento */}
      <div style={{
        background: 'var(--cream)',
        borderRight: '1px solid var(--stone)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>Separadores do</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>documento</div>
          </div>
          <button
            onClick={() => {
              setShowNewSection(true)
              setNewSectionParent(null)
              setNewSectionTitle('')
            }}
            style={{
              width: '28px', height: '28px',
              background: 'var(--brown)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* New section input */}
        {showNewSection && !newSectionParent && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--stone)' }}>
            <input
              autoFocus
              placeholder="Nome da secção..."
              value={newSectionTitle}
              onChange={e => setNewSectionTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateSection(null)
                if (e.key === 'Escape') { setShowNewSection(false); setNewSectionTitle('') }
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--gold)',
                borderRadius: '6px',
                fontSize: '12px',
                background: 'white',
                color: 'var(--brown)',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                onClick={() => handleCreateSection(null)}
                style={{ flex: 1, padding: '4px 8px', background: 'var(--brown)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >Criar</button>
              <button
                onClick={() => { setShowNewSection(false); setNewSectionTitle('') }}
                style={{ padding: '4px 8px', background: 'transparent', color: 'var(--brown-light)', border: '1px solid var(--stone)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >Cancelar</button>
            </div>
          </div>
        )}

        {/* Sections tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {tree.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--brown-light)', fontSize: '12px' }}>
              <FileText size={24} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
              Sem secções criadas.<br />
              Clique em "+" para adicionar.
            </div>
          ) : (
            tree.map(node => renderSidebarItem(node))
          )}
        </div>

        {/* New child section input */}
        {showNewSection && newSectionParent && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--stone)', background: 'white' }}>
            <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
              Sub-secção de "{sections.find(s => s.id === newSectionParent)?.titulo}"
            </div>
            <input
              autoFocus
              placeholder="Nome da sub-secção..."
              value={newSectionTitle}
              onChange={e => setNewSectionTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateSection(newSectionParent)
                if (e.key === 'Escape') { setShowNewSection(false); setNewSectionTitle(''); setNewSectionParent(null) }
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--gold)',
                borderRadius: '6px',
                fontSize: '12px',
                background: 'white',
                color: 'var(--brown)',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                onClick={() => handleCreateSection(newSectionParent)}
                style={{ flex: 1, padding: '4px 8px', background: 'var(--brown)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >Criar</button>
              <button
                onClick={() => { setShowNewSection(false); setNewSectionTitle(''); setNewSectionParent(null) }}
                style={{ padding: '4px 8px', background: 'transparent', color: 'var(--brown-light)', border: '1px solid var(--stone)', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Main content area - Document editor */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f6f3' }}>
        {activeSection ? (
          <>
            {/* Toolbar */}
            <div style={{
              padding: '8px 16px',
              borderBottom: '1px solid var(--stone)',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              flexWrap: 'wrap'
            }}>
              <ToolbarButton icon={Undo2} onClick={() => execCmd('undo')} title="Desfazer" />
              <ToolbarButton icon={Redo2} onClick={() => execCmd('redo')} title="Refazer" />
              <ToolbarDivider />
              <ToolbarSelect
                onChange={e => execCmd('formatBlock', e.target.value)}
                options={[
                  { value: 'p', label: 'Texto normal' },
                  { value: 'h1', label: 'Título 1' },
                  { value: 'h2', label: 'Título 2' },
                  { value: 'h3', label: 'Título 3' }
                ]}
              />
              <ToolbarDivider />
              <ToolbarButton icon={Bold} onClick={() => execCmd('bold')} title="Negrito" />
              <ToolbarButton icon={Italic} onClick={() => execCmd('italic')} title="Itálico" />
              <ToolbarButton icon={Underline} onClick={() => execCmd('underline')} title="Sublinhado" />
              <ToolbarDivider />
              <ToolbarButton icon={AlignLeft} onClick={() => execCmd('justifyLeft')} title="Alinhar à esquerda" />
              <ToolbarButton icon={AlignCenter} onClick={() => execCmd('justifyCenter')} title="Centrar" />
              <ToolbarButton icon={AlignRight} onClick={() => execCmd('justifyRight')} title="Alinhar à direita" />
              <ToolbarDivider />
              <ToolbarButton icon={List} onClick={() => execCmd('insertUnorderedList')} title="Lista" />
              <ToolbarButton icon={ListOrdered} onClick={() => execCmd('insertOrderedList')} title="Lista numerada" />
              <ToolbarDivider />
              <ToolbarButton icon={Link2} onClick={() => {
                const url = prompt('URL:')
                if (url) execCmd('createLink', url)
              }} title="Inserir link" />
              <ToolbarButton icon={Table} onClick={insertTable} title="Inserir tabela" />

              {/* Save status */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--brown-light)' }}>
                {saving ? (
                  <><Loader2 size={12} className="spin" /> A guardar...</>
                ) : lastSaved ? (
                  <><Save size={12} /> Guardado {lastSaved.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</>
                ) : null}
              </div>
            </div>

            {/* Document page */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              <div style={{
                maxWidth: '816px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '2px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
                padding: '60px 72px',
                minHeight: '800px'
              }}>
                {/* Section title */}
                <h1
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={async (e) => {
                    const newTitle = e.target.textContent.trim()
                    if (newTitle && newTitle !== activeSection.titulo) {
                      await supabase
                        .from('projeto_notebook_sections')
                        .update({ titulo: newTitle })
                        .eq('id', activeSection.id)
                      setSections(prev => prev.map(s => s.id === activeSection.id ? { ...s, titulo: newTitle } : s))
                      setActiveSection(prev => ({ ...prev, titulo: newTitle }))
                    }
                  }}
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--brown)',
                    marginBottom: '24px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid var(--stone)',
                    outline: 'none',
                    cursor: 'text'
                  }}
                >
                  {activeSection.titulo}
                </h1>

                {/* Rich text editor */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleContentChange}
                  onPaste={(e) => {
                    // Allow rich paste from external sources
                    const html = e.clipboardData.getData('text/html')
                    if (html) {
                      e.preventDefault()
                      document.execCommand('insertHTML', false, html)
                    }
                  }}
                  dangerouslySetInnerHTML={{ __html: activeSection.conteudo || '<p>Comece a escrever aqui...</p>' }}
                  style={{
                    minHeight: '600px',
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: 'var(--brown)',
                    cursor: 'text'
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brown-light)',
            gap: '16px'
          }}>
            <FileText size={48} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Notebook do Projeto</div>
            <p style={{ fontSize: '13px', maxWidth: '360px', textAlign: 'center', lineHeight: 1.5 }}>
              Crie secções para organizar o diário de bordo, procurement, compras, e acompanhamento do projeto.
            </p>
            <button
              onClick={() => {
                setShowNewSection(true)
                setNewSectionParent(null)
                setNewSectionTitle('')
              }}
              style={{
                padding: '10px 20px',
                background: 'var(--brown)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} /> Criar Primeira Secção
            </button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'white',
            border: '1px solid var(--stone)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '4px',
            zIndex: 1000,
            minWidth: '180px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <ContextMenuItem
            icon={Plus}
            label="Adicionar sub-secção"
            onClick={() => {
              setShowNewSection(true)
              setNewSectionParent(contextMenu.section.id)
              setNewSectionTitle('')
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            icon={Edit2}
            label="Renomear"
            onClick={() => {
              setEditingTitle(contextMenu.section.id)
              setNewTitleValue(contextMenu.section.titulo)
              setContextMenu(null)
            }}
          />
          <div style={{ height: '1px', background: 'var(--stone)', margin: '4px 0' }} />
          <ContextMenuItem
            icon={Trash2}
            label="Eliminar"
            danger
            onClick={() => {
              handleDeleteSection(contextMenu.section)
              setContextMenu(null)
            }}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />

      {/* CSS for hover effects */}
      <style>{`
        .section-menu-btn { opacity: 0 !important; }
        div:hover > .section-menu-btn { opacity: 1 !important; }
        [contenteditable] h1 { font-size: 22px; font-weight: 700; color: var(--brown); margin: 24px 0 8px; }
        [contenteditable] h2 { font-size: 18px; font-weight: 600; color: var(--brown); margin: 20px 0 8px; }
        [contenteditable] h3 { font-size: 15px; font-weight: 600; color: var(--brown); margin: 16px 0 6px; }
        [contenteditable] p { margin: 0 0 8px; }
        [contenteditable] ul, [contenteditable] ol { margin: 8px 0; padding-left: 24px; }
        [contenteditable] li { margin: 4px 0; }
        [contenteditable] table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        [contenteditable] th { background: var(--brown); color: white; padding: 8px 12px; text-align: left; border: 1px solid var(--stone); font-weight: 600; font-size: 12px; }
        [contenteditable] td { padding: 8px 12px; border: 1px solid var(--stone); font-size: 13px; }
        [contenteditable] td:focus { outline: 2px solid var(--gold); }
        [contenteditable] a { color: var(--gold); text-decoration: underline; }
        [contenteditable] blockquote { border-left: 3px solid var(--gold); padding-left: 16px; color: var(--brown-light); margin: 12px 0; }
      `}</style>
    </div>
  )
}

// Toolbar components
function ToolbarButton({ icon: Icon, onClick, title, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--cream)' : 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        color: 'var(--brown)',
        transition: 'background 0.15s'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
      onMouseLeave={e => e.currentTarget.style.background = active ? 'var(--cream)' : 'transparent'}
    >
      <Icon size={15} />
    </button>
  )
}

function ToolbarDivider() {
  return <div style={{ width: '1px', height: '20px', background: 'var(--stone)', margin: '0 4px' }} />
}

function ToolbarSelect({ onChange, options }) {
  return (
    <select
      onChange={onChange}
      style={{
        padding: '4px 8px',
        border: '1px solid var(--stone)',
        borderRadius: '4px',
        fontSize: '12px',
        color: 'var(--brown)',
        background: 'white',
        cursor: 'pointer',
        outline: 'none'
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

function ContextMenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        color: danger ? '#ef4444' : 'var(--brown)',
        textAlign: 'left'
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'var(--cream)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
