import { useEffect, useState } from 'react'

export default function OAuthCallback() {
  const [status, setStatus] = useState('A processar autenticação...')

  useEffect(() => {
    const hash = window.location.hash

    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const token = params.get('access_token')

      if (token) {
        // Use localStorage to trigger storage event in parent window
        // This works even with COOP restrictions
        localStorage.setItem('teams_oauth_token', token)
        localStorage.setItem('teams_oauth_timestamp', Date.now().toString())
        setStatus('Autenticação concluída! A fechar...')

        // Close popup after a short delay
        setTimeout(() => {
          window.close()
          // If window.close() doesn't work, show message
          setStatus('Autenticação concluída! Pode fechar esta janela.')
        }, 1500)
        return
      }
    }

    if (hash && hash.includes('error')) {
      const params = new URLSearchParams(hash.substring(1))
      const error = params.get('error_description') || params.get('error')
      localStorage.setItem('teams_oauth_error', error || 'Erro desconhecido')
      localStorage.setItem('teams_oauth_timestamp', Date.now().toString())
      setStatus('Erro na autenticação: ' + (error || 'Erro desconhecido'))

      setTimeout(() => {
        window.close()
      }, 2000)
      return
    }

    // No token or error found
    setStatus('Nenhum token encontrado. Por favor tente novamente.')
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>
          {status.includes('concluída') ? '✅' : status.includes('Erro') ? '❌' : '🔄'}
        </div>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>Microsoft Teams</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>{status}</p>
      </div>
    </div>
  )
}
