import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Send, Paperclip, Camera, Mic, X, Image, FileText, Check, CheckCheck,
  Bot, User, Reply, MoreVertical, Smile, AlertCircle, Loader2
} from 'lucide-react'

const colors = {
  primary: '#5C4B3A',
  text: '#3D3326',
  textMuted: '#8B7355',
  background: '#F5F3EF',
  white: '#FFFFFF',
  border: '#E8E4DC',
  success: '#6B8F5E',
  warning: '#F5A623',
  jarvisBg: '#EEF5EC',
  jarvisAccent: '#6B8F5E',
  userBg: '#F5F3EF',
}

export default function ObraChat({ obraId, obraCodigo, currentUser }) {
  const [mensagens, setMensagens] = useState([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [anexos, setAnexos] = useState([])
  const [uploadingAnexo, setUploadingAnexo] = useState(false)
  const [error, setError] = useState(null)

  const chatContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  // Carregar mensagens
  useEffect(() => {
    if (obraId) {
      fetchMensagens()
      subscribeToMensagens()
    }
  }, [obraId])

  // Scroll para o fim quando há novas mensagens
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [mensagens])

  const fetchMensagens = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select(`
          *,
          chat_anexos(*)
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        // Check if table doesn't exist (404) or permission issues
        if (error.code === 'PGRST204' || error.code === '42P01' || error.message?.includes('does not exist')) {
          setError('migration_needed')
        } else {
          setError('load_error')
        }
        throw error
      }
      setMensagens(data || [])
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMensagens = () => {
    const subscription = supabase
      .channel(`chat:${obraId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `obra_id=eq.${obraId}`
      }, async (payload) => {
        // Buscar a mensagem completa com anexos
        const { data } = await supabase
          .from('chat_mensagens')
          .select('*, chat_anexos(*)')
          .eq('id', payload.new.id)
          .single()

        if (data) {
          setMensagens(prev => [...prev, data])
        }
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() && anexos.length === 0) return
    if (error === 'migration_needed') return // Don't send if tables don't exist

    setSending(true)
    try {
      // Criar mensagem
      const { data: mensagem, error: insertError } = await supabase
        .from('chat_mensagens')
        .insert({
          obra_id: obraId,
          autor_tipo: 'pessoa',
          autor_id: currentUser?.id,
          autor_nome: currentUser?.nome || currentUser?.email?.split('@')[0] || 'Utilizador',
          conteudo: novaMensagem.trim(),
          tipo: 'texto',
          metadata: {}
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === 'PGRST204' || insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
          setError('migration_needed')
        }
        throw insertError
      }

      // Upload de anexos se houver
      if (anexos.length > 0) {
        for (const anexo of anexos) {
          const fileName = `${obraCodigo}/chat/${Date.now()}_${anexo.file.name}`
          const { error: uploadError } = await supabase.storage
            .from('obras')
            .upload(fileName, anexo.file)

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('obras').getPublicUrl(fileName)

            await supabase.from('chat_anexos').insert({
              mensagem_id: mensagem.id,
              tipo: anexo.type,
              ficheiro_url: publicUrl,
              nome: anexo.file.name,
              tamanho: anexo.file.size
            })
          }
        }
      }

      setNovaMensagem('')
      setAnexos([])

      // Simular resposta J.A.R.V.I.S. (em produção seria uma Edge Function)
      setTimeout(() => {
        simularRespostaJarvis(mensagem)
      }, 1500)

    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
    } finally {
      setSending(false)
    }
  }

  const simularRespostaJarvis = async (mensagemOriginal) => {
    // Análise simples do conteúdo
    const conteudo = mensagemOriginal.conteudo.toLowerCase()
    let resposta = ''
    let acoes = []

    if (conteudo.includes('chegou') || conteudo.includes('entregaram') || conteudo.includes('recebemos')) {
      resposta = `${mensagemOriginal.autor_nome}, registei a entrega.\n\n✓ Diário de Obra atualizado\n\nHá algo mais sobre esta entrega que deva registar?`
      acoes.push({ tipo: 'diario', subtipo: 'entrega' })
    } else if (conteudo.includes('problema') || conteudo.includes('defeito') || conteudo.includes('fissura')) {
      resposta = `${mensagemOriginal.autor_nome}, isso parece uma não conformidade.\n\n✓ NC criada (pendente de foto)\n✓ Adicionado à Checklist\n\nPodes tirar uma foto para documentar?`
      acoes.push({ tipo: 'nc', estado: 'pendente_foto' })
    } else if (conteudo.includes('começámos') || conteudo.includes('terminámos') || conteudo.includes('fizemos')) {
      resposta = `${mensagemOriginal.autor_nome}, bom trabalho!\n\n✓ Registei no Diário de Obra (execução)\n\nQueres que atualize a % de execução?`
      acoes.push({ tipo: 'diario', subtipo: 'execucao' })
    } else if (conteudo.includes('?')) {
      resposta = `${mensagemOriginal.autor_nome}, deixa-me verificar isso...\n\nAinda estou a aprender sobre esta obra. Em breve poderei responder a perguntas sobre o projeto, prazos, e muito mais.`
    } else {
      resposta = `${mensagemOriginal.autor_nome}, registei esta informação.\n\n✓ Mensagem guardada no histórico\n\nPrecisas que faça algo mais?`
    }

    // Criar resposta J.A.R.V.I.S.
    await supabase
      .from('chat_mensagens')
      .insert({
        obra_id: obraId,
        autor_tipo: 'jarvis',
        autor_nome: 'J.A.R.V.I.S.',
        conteudo: resposta,
        tipo: 'texto',
        metadata: { acoes, mensagem_origem: mensagemOriginal.id }
      })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensagem()
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const novosAnexos = files.map(file => ({
      file,
      type: file.type.startsWith('image/') ? 'foto' : 'documento',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))
    setAnexos(prev => [...prev, ...novosAnexos])
    e.target.value = ''
  }

  const removerAnexo = (index) => {
    setAnexos(prev => prev.filter((_, i) => i !== index))
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return 'Hoje'
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    } else {
      return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
  }

  // Agrupar mensagens por data
  const mensagensAgrupadas = mensagens.reduce((grupos, msg) => {
    const data = formatDate(msg.created_at)
    if (!grupos[data]) grupos[data] = []
    grupos[data].push(msg)
    return grupos
  }, {})

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: colors.textMuted }} />
      </div>
    )
  }

  // Show error state if tables don't exist
  if (error === 'migration_needed') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 300px)',
        minHeight: '400px',
        background: colors.white,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        padding: '48px'
      }}>
        <AlertCircle size={48} style={{ color: colors.warning, marginBottom: '16px' }} />
        <h3 style={{ margin: '0 0 8px', color: colors.text, textAlign: 'center' }}>
          Sistema de Chat não configurado
        </h3>
        <p style={{
          textAlign: 'center',
          color: colors.textMuted,
          maxWidth: '400px',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          As tabelas do J.A.R.V.I.S. ainda não foram criadas no Supabase.
          Execute a migração <code style={{
            background: colors.background,
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>20250127_jarvis_system.sql</code> para ativar o chat.
        </p>
        <div style={{
          background: colors.background,
          padding: '16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: colors.text,
          maxWidth: '100%',
          overflow: 'auto'
        }}>
          supabase db push
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 300px)',
      minHeight: '500px',
      background: colors.white,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
      overflow: 'hidden'
    }}>
      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {mensagens.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: colors.textMuted
          }}>
            <Bot size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Bem-vindo ao Chat da Obra</h3>
            <p style={{ textAlign: 'center', maxWidth: '400px' }}>
              Sou o J.A.R.V.I.S., o teu assistente de obra. Podes enviar mensagens, fotos,
              e eu vou ajudar a registar tudo automaticamente.
            </p>
          </div>
        ) : (
          Object.entries(mensagensAgrupadas).map(([data, msgs]) => (
            <div key={data}>
              {/* Date separator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '16px 0'
              }}>
                <span style={{
                  padding: '4px 12px',
                  background: colors.background,
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: colors.textMuted,
                  fontWeight: 500
                }}>
                  {data}
                </span>
              </div>

              {/* Messages */}
              {msgs.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.autor_tipo === 'jarvis' ? 'flex-start' : 'flex-end',
                    marginBottom: '12px'
                  }}
                >
                  {/* Message bubble */}
                  <div style={{
                    maxWidth: '70%',
                    minWidth: '200px',
                    padding: '12px 16px',
                    borderRadius: msg.autor_tipo === 'jarvis' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                    background: msg.autor_tipo === 'jarvis' ? colors.jarvisBg : colors.userBg,
                    border: msg.autor_tipo === 'jarvis' ? `1px solid ${colors.jarvisAccent}20` : `1px solid ${colors.border}`
                  }}>
                    {/* Author */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      {msg.autor_tipo === 'jarvis' ? (
                        <Bot size={16} style={{ color: colors.jarvisAccent }} />
                      ) : (
                        <User size={16} style={{ color: colors.textMuted }} />
                      )}
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: msg.autor_tipo === 'jarvis' ? colors.jarvisAccent : colors.text
                      }}>
                        {msg.autor_nome || (msg.autor_tipo === 'jarvis' ? 'J.A.R.V.I.S.' : 'Utilizador')}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: colors.textMuted
                      }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: colors.text,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.conteudo}
                    </div>

                    {/* Anexos */}
                    {msg.chat_anexos && msg.chat_anexos.length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px',
                        flexWrap: 'wrap'
                      }}>
                        {msg.chat_anexos.map(anexo => (
                          <div
                            key={anexo.id}
                            style={{
                              width: '80px',
                              height: '80px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              background: colors.background,
                              border: `1px solid ${colors.border}`
                            }}
                          >
                            {anexo.tipo === 'foto' ? (
                              <img
                                src={anexo.ficheiro_url}
                                alt={anexo.nome}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                padding: '8px'
                              }}>
                                <FileText size={24} style={{ color: colors.textMuted }} />
                                <span style={{
                                  fontSize: '10px',
                                  color: colors.textMuted,
                                  marginTop: '4px',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}>
                                  {anexo.nome}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons from J.A.R.V.I.S. */}
                    {msg.autor_tipo === 'jarvis' && msg.metadata?.acoes && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '12px'
                      }}>
                        {msg.metadata.acoes.map((acao, idx) => (
                          <button
                            key={idx}
                            style={{
                              padding: '6px 12px',
                              background: colors.white,
                              border: `1px solid ${colors.jarvisAccent}`,
                              borderRadius: '16px',
                              fontSize: '12px',
                              color: colors.jarvisAccent,
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            Ver {acao.tipo}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Anexos Preview */}
      {anexos.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          background: colors.background
        }}>
          {anexos.map((anexo, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: colors.white,
                border: `1px solid ${colors.border}`
              }}
            >
              {anexo.preview ? (
                <img src={anexo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <FileText size={24} style={{ color: colors.textMuted }} />
                </div>
              )}
              <button
                onClick={() => removerAnexo(index)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: colors.text,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={10} style={{ color: colors.white }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${colors.border}`,
        background: colors.white
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '12px'
        }}>
          {/* Attachment buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.textMuted,
                borderRadius: '8px'
              }}
              title="Anexar ficheiro"
            >
              <Paperclip size={20} />
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.setAttribute('accept', 'image/*')
                fileInputRef.current?.click()
              }}
              style={{
                padding: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.textMuted,
                borderRadius: '8px'
              }}
              title="Tirar foto"
            >
              <Camera size={20} />
            </button>
          </div>

          {/* Text input */}
          <div style={{
            flex: 1,
            position: 'relative'
          }}>
            <textarea
              ref={textareaRef}
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreve uma mensagem..."
              rows={1}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '24px',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: '1.4',
                maxHeight: '120px',
                overflow: 'auto'
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={enviarMensagem}
            disabled={sending || (!novaMensagem.trim() && anexos.length === 0)}
            style={{
              padding: '12px',
              background: novaMensagem.trim() || anexos.length > 0 ? colors.primary : colors.background,
              border: 'none',
              borderRadius: '50%',
              cursor: novaMensagem.trim() || anexos.length > 0 ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            {sending ? (
              <Loader2 size={20} className="animate-spin" style={{ color: colors.white }} />
            ) : (
              <Send size={20} style={{ color: novaMensagem.trim() || anexos.length > 0 ? colors.white : colors.textMuted }} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
